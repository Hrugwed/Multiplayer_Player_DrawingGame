const Prompt = require('../models/Prompt');

class PromptService {
  // Get random prompt
  async getRandomPrompt(difficulty = null) {
    try {
      return await Prompt.getRandomPrompt(difficulty);
    } catch (error) {
      console.error('Error getting random prompt:', error);
      throw new Error('PROMPT_FETCH_FAILED');
    }
  }

  // Get prompts with pagination and filters
  async getPrompts(filters = {}, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      
      // Validate pagination parameters
      if (page < 1 || limit < 1 || limit > 100) {
        throw new Error('INVALID_PAGINATION_PARAMS');
      }
      
      const skip = (page - 1) * limit;

      const query = { isActive: true, ...filters };

      const [prompts, totalPrompts] = await Promise.all([
        Prompt.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Prompt.countDocuments(query)
      ]);

      const totalPages = Math.ceil(totalPrompts / limit);

      return {
        prompts,
        currentPage: page,
        totalPages,
        totalPrompts,
        hasNext: page < totalPages,
        hasPrev: page > 1
      };
    } catch (error) {
      console.error('Error getting prompts:', error);
      if (error.message === 'INVALID_PAGINATION_PARAMS') {
        throw error;
      }
      throw new Error('PROMPTS_FETCH_FAILED');
    }
  }

  // Create new prompt
  async createPrompt(promptData) {
    try {
      // Validate required fields
      if (!promptData.text || !promptData.category || !promptData.difficulty) {
        throw new Error('MISSING_REQUIRED_FIELDS');
      }

      // Validate text length
      if (promptData.text.length < 3 || promptData.text.length > 200) {
        throw new Error('INVALID_PROMPT_LENGTH');
      }

      // Check for duplicate prompts
      const existingPrompt = await Prompt.findOne({ 
        text: promptData.text.trim(),
        isActive: true 
      });
      
      if (existingPrompt) {
        throw new Error('PROMPT_ALREADY_EXISTS');
      }

      const prompt = new Prompt(promptData);
      return await prompt.save();
    } catch (error) {
      console.error('Error creating prompt:', error);
      if (['MISSING_REQUIRED_FIELDS', 'INVALID_PROMPT_LENGTH', 'PROMPT_ALREADY_EXISTS'].includes(error.message)) {
        throw error;
      }
      throw new Error('PROMPT_CREATE_FAILED');
    }
  }

  // Update prompt
  async updatePrompt(id, updates) {
    try {
      if (!id) {
        throw new Error('PROMPT_ID_REQUIRED');
      }

      // Validate updates
      if (updates.text && (updates.text.length < 3 || updates.text.length > 200)) {
        throw new Error('INVALID_PROMPT_LENGTH');
      }

      const prompt = await Prompt.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
      );

      if (!prompt) {
        throw new Error('PROMPT_NOT_FOUND');
      }

      return prompt;
    } catch (error) {
      console.error('Error updating prompt:', error);
      if (['PROMPT_ID_REQUIRED', 'INVALID_PROMPT_LENGTH', 'PROMPT_NOT_FOUND'].includes(error.message)) {
        throw error;
      }
      throw new Error('PROMPT_UPDATE_FAILED');
    }
  }

  // Delete prompt (soft delete by setting isActive to false)
  async deletePrompt(id) {
    try {
      if (!id) {
        throw new Error('PROMPT_ID_REQUIRED');
      }

      const prompt = await Prompt.findByIdAndUpdate(
        id,
        { isActive: false },
        { new: true }
      );

      if (!prompt) {
        throw new Error('PROMPT_NOT_FOUND');
      }

      return prompt;
    } catch (error) {
      console.error('Error deleting prompt:', error);
      if (['PROMPT_ID_REQUIRED', 'PROMPT_NOT_FOUND'].includes(error.message)) {
        throw error;
      }
      throw new Error('PROMPT_DELETE_FAILED');
    }
  }

  // Get prompt statistics
  async getPromptStatistics() {
    try {
      const [
        totalPrompts,
        activePrompts,
        categoryStats,
        difficultyStats,
        topUsedPrompts
      ] = await Promise.all([
        Prompt.countDocuments(),
        Prompt.countDocuments({ isActive: true }),
        this.getCategoryStatistics(),
        this.getDifficultyStatistics(),
        this.getTopUsedPrompts(10)
      ]);

      return {
        totalPrompts,
        activePrompts,
        inactivePrompts: totalPrompts - activePrompts,
        categoryStats,
        difficultyStats,
        topUsedPrompts
      };
    } catch (error) {
      console.error('Error getting prompt statistics:', error);
      throw new Error('STATISTICS_FETCH_FAILED');
    }
  }

  // Get category statistics
  async getCategoryStatistics() {
    try {
      return await Prompt.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            avgUsage: { $avg: '$usageCount' }
          }
        },
        { $sort: { count: -1 } }
      ]);
    } catch (error) {
      console.error('Error getting category statistics:', error);
      throw new Error('CATEGORY_STATS_FAILED');
    }
  }

  // Get difficulty statistics
  async getDifficultyStatistics() {
    try {
      return await Prompt.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$difficulty',
            count: { $sum: 1 },
            avgUsage: { $avg: '$usageCount' }
          }
        },
        { $sort: { count: -1 } }
      ]);
    } catch (error) {
      console.error('Error getting difficulty statistics:', error);
      throw new Error('DIFFICULTY_STATS_FAILED');
    }
  }

  // Get most used prompts
  async getTopUsedPrompts(limit = 10) {
    try {
      if (limit < 1 || limit > 100) {
        throw new Error('INVALID_LIMIT');
      }

      return await Prompt.find({ isActive: true })
        .sort({ usageCount: -1 })
        .limit(limit)
        .select('text category difficulty usageCount')
        .lean();
    } catch (error) {
      console.error('Error getting top used prompts:', error);
      if (error.message === 'INVALID_LIMIT') {
        throw error;
      }
      throw new Error('TOP_PROMPTS_FETCH_FAILED');
    }
  }

  // Seed initial prompts for development
  async seedInitialPrompts() {
    const existingCount = await Prompt.countDocuments();
    if (existingCount > 0) {
      return 0; // Already seeded
    }

    const initialPrompts = [
      // Easy prompts
      { text: 'A happy cat', category: 'animals', difficulty: 'easy' },
      { text: 'A red apple', category: 'objects', difficulty: 'easy' },
      { text: 'A simple house', category: 'objects', difficulty: 'easy' },
      { text: 'A smiling sun', category: 'objects', difficulty: 'easy' },
      { text: 'A cute dog', category: 'animals', difficulty: 'easy' },
      { text: 'A flower in a pot', category: 'objects', difficulty: 'easy' },
      { text: 'A birthday cake', category: 'objects', difficulty: 'easy' },
      { text: 'A flying bird', category: 'animals', difficulty: 'easy' },
      { text: 'A rainbow', category: 'scenes', difficulty: 'easy' },
      { text: 'A tree with leaves', category: 'objects', difficulty: 'easy' },

      // Medium prompts
      { text: 'A robot playing guitar', category: 'characters', difficulty: 'medium' },
      { text: 'A dragon breathing fire', category: 'characters', difficulty: 'medium' },
      { text: 'A pirate ship on the ocean', category: 'scenes', difficulty: 'medium' },
      { text: 'A wizard casting a spell', category: 'characters', difficulty: 'medium' },
      { text: 'A haunted mansion at night', category: 'scenes', difficulty: 'medium' },
      { text: 'A superhero flying through clouds', category: 'characters', difficulty: 'medium' },
      { text: 'A jungle with exotic animals', category: 'scenes', difficulty: 'medium' },
      { text: 'A space station orbiting Earth', category: 'scenes', difficulty: 'medium' },
      { text: 'A medieval knight on horseback', category: 'characters', difficulty: 'medium' },
      { text: 'A underwater city with mermaids', category: 'scenes', difficulty: 'medium' },

      // Hard prompts
      { text: 'The concept of time travel', category: 'abstract', difficulty: 'hard' },
      { text: 'A steampunk inventor\'s workshop', category: 'scenes', difficulty: 'hard' },
      { text: 'The feeling of nostalgia', category: 'abstract', difficulty: 'hard' },
      { text: 'A cyberpunk cityscape at dawn', category: 'scenes', difficulty: 'hard' },
      { text: 'The sound of music visualized', category: 'abstract', difficulty: 'hard' },
      { text: 'A interdimensional portal opening', category: 'abstract', difficulty: 'hard' },
      { text: 'The ecosystem of a alien planet', category: 'scenes', difficulty: 'hard' },
      { text: 'A dream within a dream', category: 'abstract', difficulty: 'hard' },
      { text: 'The birth of a new galaxy', category: 'abstract', difficulty: 'hard' },
      { text: 'A conversation between past and future', category: 'abstract', difficulty: 'hard' }
    ];

    const createdPrompts = await Prompt.insertMany(initialPrompts);
    return createdPrompts.length;
  }

  // Get prompts by category
  async getPromptsByCategory(category, limit = 20) {
    return await Prompt.find({ 
      category, 
      isActive: true 
    })
    .sort({ usageCount: 1 }) // Prefer less used prompts
    .limit(limit)
    .lean();
  }

  // Get prompts by difficulty
  async getPromptsByDifficulty(difficulty, limit = 20) {
    return await Prompt.find({ 
      difficulty, 
      isActive: true 
    })
    .sort({ usageCount: 1 })
    .limit(limit)
    .lean();
  }

  // Search prompts
  async searchPrompts(searchTerm, options = {}) {
    const { limit = 20, category, difficulty } = options;
    
    const query = {
      isActive: true,
      text: { $regex: searchTerm, $options: 'i' }
    };

    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;

    return await Prompt.find(query)
      .sort({ usageCount: 1 })
      .limit(limit)
      .lean();
  }

  // Bulk update prompts
  async bulkUpdatePrompts(updates) {
    const operations = updates.map(update => ({
      updateOne: {
        filter: { _id: update.id },
        update: { $set: update.data },
        upsert: false
      }
    }));

    return await Prompt.bulkWrite(operations);
  }

  // Get unused prompts (for cleanup)
  async getUnusedPrompts(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return await Prompt.find({
      isActive: true,
      usageCount: 0,
      createdAt: { $lt: cutoffDate }
    }).lean();
  }
}

module.exports = new PromptService();