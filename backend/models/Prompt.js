const mongoose = require('mongoose');

const promptSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  category: {
    type: String,
    enum: ['animals', 'objects', 'scenes', 'abstract', 'characters'],
    default: 'objects'
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient random selection
promptSchema.index({ isActive: 1, difficulty: 1 });

// Method to increment usage count
promptSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  return this.save();
};

// Static method to get random prompt
promptSchema.statics.getRandomPrompt = async function(difficulty = null) {
  const query = { isActive: true };
  if (difficulty) {
    query.difficulty = difficulty;
  }

  const count = await this.countDocuments(query);
  if (count === 0) {
    throw new Error('No prompts available');
  }

  const random = Math.floor(Math.random() * count);
  const prompt = await this.findOne(query).skip(random);
  
  if (prompt) {
    await prompt.incrementUsage();
  }
  
  return prompt;
};

module.exports = mongoose.model('Prompt', promptSchema);