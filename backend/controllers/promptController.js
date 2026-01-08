const promptService = require('../services/promptService');
const { validateCreatePrompt } = require('../utils/validation');

class PromptController {
  // Get random prompt
  async getRandomPrompt(req, res) {
    try {
      const { difficulty } = req.query;
      
      // Validate difficulty if provided
      if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) {
        return res.status(400).json({ 
          error: 'INVALID_DIFFICULTY',
          message: 'Difficulty must be easy, medium, or hard.'
        });
      }

      const prompt = await promptService.getRandomPrompt(difficulty);

      if (!prompt) {
        return res.status(404).json({ 
          error: 'NO_PROMPTS_AVAILABLE',
          message: 'No prompts available for the specified criteria.'
        });
      }

      res.json({
        success: true,
        data: {
          id: prompt._id,
          text: prompt.text,
          category: prompt.category,
          difficulty: prompt.difficulty
        }
      });
    } catch (error) {
      console.error('Get random prompt error:', error);
      
      let statusCode = 500;
      let errorCode = 'PROMPT_FETCH_FAILED';
      let message = 'Failed to get random prompt. Please try again.';

      if (error.message === 'PROMPT_FETCH_FAILED') {
        statusCode = 500;
        errorCode = 'PROMPT_FETCH_FAILED';
        message = 'Failed to fetch prompt from database.';
      }

      res.status(statusCode).json({ error: errorCode, message });
    }
  }

  // Get all prompts (paginated)
  async getAllPrompts(req, res) {
    try {
      const { page = 1, limit = 20, category, difficulty, search } = req.query;
      
      const filters = {};
      if (category) filters.category = category;
      if (difficulty) filters.difficulty = difficulty;
      if (search) {
        filters.text = { $regex: search, $options: 'i' };
      }

      const result = await promptService.getPrompts(filters, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.prompts,
        pagination: {
          currentPage: result.currentPage,
          totalPages: result.totalPages,
          totalPrompts: result.totalPrompts,
          hasNext: result.hasNext,
          hasPrev: result.hasPrev
        }
      });
    } catch (error) {
      console.error('Get all prompts error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Create new prompt (admin)
  async createPrompt(req, res) {
    try {
      const { error } = validateCreatePrompt(req.body);
      if (error) {
        return res.status(400).json({ 
          error: 'VALIDATION_ERROR',
          message: error.details[0].message 
        });
      }

      const prompt = await promptService.createPrompt(req.body);

      res.status(201).json({
        success: true,
        data: prompt,
        message: 'Prompt created successfully'
      });
    } catch (error) {
      console.error('Create prompt error:', error);
      
      let statusCode = 500;
      let errorCode = 'PROMPT_CREATE_FAILED';
      let message = 'Failed to create prompt. Please try again.';

      switch (error.message) {
        case 'MISSING_REQUIRED_FIELDS':
          statusCode = 400;
          errorCode = 'MISSING_REQUIRED_FIELDS';
          message = 'Please provide text, category, and difficulty for the prompt.';
          break;
        case 'INVALID_PROMPT_LENGTH':
          statusCode = 400;
          errorCode = 'INVALID_PROMPT_LENGTH';
          message = 'Prompt text must be between 3 and 200 characters long.';
          break;
        case 'PROMPT_ALREADY_EXISTS':
          statusCode = 409;
          errorCode = 'PROMPT_ALREADY_EXISTS';
          message = 'A prompt with this text already exists.';
          break;
        default:
          // Keep default values
          break;
      }

      res.status(statusCode).json({ error: errorCode, message });
    }
  }

  // Update prompt (admin)
  async updatePrompt(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const prompt = await promptService.updatePrompt(id, updates);

      if (!prompt) {
        return res.status(404).json({ error: 'Prompt not found' });
      }

      res.json({
        success: true,
        data: prompt
      });
    } catch (error) {
      console.error('Update prompt error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Delete prompt (admin)
  async deletePrompt(req, res) {
    try {
      const { id } = req.params;
      const deleted = await promptService.deletePrompt(id);

      if (!deleted) {
        return res.status(404).json({ error: 'Prompt not found' });
      }

      res.json({
        success: true,
        message: 'Prompt deleted successfully'
      });
    } catch (error) {
      console.error('Delete prompt error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get prompt statistics
  async getPromptStats(req, res) {
    try {
      const stats = await promptService.getPromptStatistics();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get prompt stats error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Seed initial prompts (development)
  async seedPrompts(req, res) {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Not allowed in production' });
      }

      const count = await promptService.seedInitialPrompts();

      res.json({
        success: true,
        message: `Seeded ${count} prompts successfully`
      });
    } catch (error) {
      console.error('Seed prompts error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new PromptController();