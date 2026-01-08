const mongoose = require('mongoose');

const aiResultSchema = new mongoose.Schema({
  gameId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true
  },
  prompt: {
    type: String,
    required: true
  },
  scores: {
    creativity: {
      type: Number,
      min: 0,
      max: 10,
      required: true
    },
    promptSimilarity: {
      type: Number,
      min: 0,
      max: 10,
      required: true
    },
    overall: {
      type: Number,
      min: 0,
      max: 10
    }
  },
  feedback: {
    roast: {
      type: String,
      required: true,
      maxlength: 500
    },
    highlights: [{
      type: String,
      maxlength: 100
    }],
    improvements: [{
      type: String,
      maxlength: 100
    }]
  },
  analysis: {
    dominantColors: [String],
    estimatedObjects: [String],
    complexity: {
      type: String,
      enum: ['simple', 'moderate', 'complex'],
      default: 'moderate'
    },
    style: {
      type: String,
      enum: ['abstract', 'realistic', 'cartoon', 'sketch'],
      default: 'sketch'
    }
  },
  aiModel: {
    type: String,
    default: 'gpt-4-vision-preview'
  },
  processingTime: {
    type: Number // milliseconds
  },
  rawResponse: {
    type: String // Store raw AI response for debugging
  }
}, {
  timestamps: true
});

// Index for efficient queries
aiResultSchema.index({ gameId: 1 });
aiResultSchema.index({ 'scores.overall': -1 });
aiResultSchema.index({ createdAt: -1 });

// Virtual for formatted scores
aiResultSchema.virtual('formattedScores').get(function() {
  return {
    creativity: `${this.scores.creativity}/10`,
    promptSimilarity: `${this.scores.promptSimilarity}/10`,
    overall: `${this.scores.overall}/10`
  };
});

// Method to calculate overall score
aiResultSchema.methods.calculateOverallScore = function() {
  this.scores.overall = Math.round((this.scores.creativity + this.scores.promptSimilarity) / 2 * 10) / 10;
  return this.scores.overall;
};

// Static method to get average scores for analytics
aiResultSchema.statics.getAverageScores = async function() {
  const result = await this.aggregate([
    {
      $group: {
        _id: null,
        avgCreativity: { $avg: '$scores.creativity' },
        avgPromptSimilarity: { $avg: '$scores.promptSimilarity' },
        avgOverall: { $avg: '$scores.overall' },
        totalGames: { $sum: 1 }
      }
    }
  ]);
  
  return result[0] || {
    avgCreativity: 0,
    avgPromptSimilarity: 0,
    avgOverall: 0,
    totalGames: 0
  };
};

module.exports = mongoose.model('AIResult', aiResultSchema);