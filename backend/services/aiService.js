const axios = require('axios');
const AIResult = require('../models/AIResult');

class AIService {
  constructor() {
    this.apiKey = process.env.AI_API_KEY;
    this.apiUrl = process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
    this.model = 'gpt-4-vision-preview';
  }

  // Analyze drawing with AI
  async analyzeDrawing(canvasDataUrl, prompt, gameId) {
    const startTime = Date.now();
    
    try {
      // Validate inputs
      if (!canvasDataUrl) {
        throw new Error('CANVAS_DATA_REQUIRED');
      }
      
      if (!prompt || prompt.trim().length === 0) {
        throw new Error('PROMPT_REQUIRED');
      }
      
      if (!gameId) {
        throw new Error('GAME_ID_REQUIRED');
      }

      // Validate canvas data URL format
      if (!canvasDataUrl.startsWith('data:image/')) {
        throw new Error('INVALID_CANVAS_FORMAT');
      }

      if (!this.apiKey) {
        console.warn('AI API key not configured, using fallback result');
        return await this.createFallbackResult(gameId, prompt, 'AI API key not configured');
      }

      // Prepare the AI prompt
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(prompt);

      // Make API call to OpenAI
      const response = await this.callOpenAI(systemPrompt, userPrompt, canvasDataUrl);
      
      // Parse AI response
      const analysis = this.parseAIResponse(response);
      
      // Create and save AI result
      const aiResult = new AIResult({
        gameId,
        prompt,
        scores: analysis.scores,
        feedback: analysis.feedback,
        analysis: analysis.analysis,
        aiModel: this.model,
        processingTime: Date.now() - startTime,
        rawResponse: JSON.stringify(response)
      });

      // Calculate overall score
      aiResult.calculateOverallScore();
      
      await aiResult.save();
      return aiResult;

    } catch (error) {
      console.error('AI analysis error:', error);
      
      // Handle specific validation errors
      if (['CANVAS_DATA_REQUIRED', 'PROMPT_REQUIRED', 'GAME_ID_REQUIRED', 'INVALID_CANVAS_FORMAT'].includes(error.message)) {
        throw error;
      }
      
      // Create fallback result for other errors
      const fallbackResult = await this.createFallbackResult(gameId, prompt, error.message);
      return fallbackResult;
    }
  }

  // Build system prompt for AI
  buildSystemPrompt() {
    return `You are an AI art critic for a collaborative drawing game. Your job is to analyze drawings and provide entertaining, constructive feedback.

SCORING CRITERIA:
- Creativity (0-10): How original and imaginative is the drawing?
- Prompt Similarity (0-10): How well does the drawing match the given prompt?

FEEDBACK STYLE:
- Be humorous but not mean-spirited
- Provide constructive criticism with a playful tone
- Acknowledge collaborative effort (multiple people drew this)
- Keep feedback concise and entertaining
- Include both positive highlights and areas for improvement

RESPONSE FORMAT:
Return a JSON object with this exact structure:
{
  "scores": {
    "creativity": number (0-10),
    "promptSimilarity": number (0-10)
  },
  "feedback": {
    "roast": "string (main humorous feedback, max 500 chars)",
    "highlights": ["string", "string"] (2-3 positive aspects),
    "improvements": ["string", "string"] (2-3 suggestions)
  },
  "analysis": {
    "dominantColors": ["#color1", "#color2"],
    "estimatedObjects": ["object1", "object2"],
    "complexity": "simple|moderate|complex",
    "style": "abstract|realistic|cartoon|sketch"
  }
}`;
  }

  // Build user prompt
  buildUserPrompt(prompt) {
    return `Please analyze this collaborative drawing. The prompt was: "${prompt}"

This drawing was created by multiple players working together in real-time. Each player had a different assigned color and they all drew simultaneously on the same canvas.

Provide your analysis as a JSON object following the specified format.`;
  }

  // Call OpenAI API
  async callOpenAI(systemPrompt, userPrompt, imageDataUrl) {
    try {
      const headers = {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      };

      const payload = {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageDataUrl,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.8
      };

      const response = await axios.post(this.apiUrl, payload, { 
        headers,
        timeout: 30000 // 30 second timeout
      });

      if (!response.data || !response.data.choices || response.data.choices.length === 0) {
        throw new Error('AI_EMPTY_RESPONSE');
      }

      return response.data;
    } catch (error) {
      console.error('OpenAI API call failed:', error);
      
      if (error.code === 'ECONNABORTED') {
        throw new Error('AI_TIMEOUT');
      }
      
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.error?.message || 'Unknown API error';
        
        switch (status) {
          case 401:
            throw new Error('AI_UNAUTHORIZED');
          case 429:
            throw new Error('AI_RATE_LIMITED');
          case 500:
          case 502:
          case 503:
            throw new Error('AI_SERVER_ERROR');
          default:
            throw new Error(`AI_API_ERROR: ${message}`);
        }
      }
      
      throw new Error('AI_NETWORK_ERROR');
    }
  }

  // Parse AI response
  parseAIResponse(response) {
    try {
      if (!response.choices || !response.choices[0] || !response.choices[0].message) {
        throw new Error('AI_INVALID_RESPONSE_STRUCTURE');
      }

      const content = response.choices[0].message.content;
      
      if (!content || content.trim().length === 0) {
        throw new Error('AI_EMPTY_CONTENT');
      }
      
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI_NO_JSON_FOUND');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      this.validateAIResponse(parsed);
      
      return parsed;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      
      if (error instanceof SyntaxError) {
        throw new Error('AI_INVALID_JSON');
      }
      
      if (['AI_INVALID_RESPONSE_STRUCTURE', 'AI_EMPTY_CONTENT', 'AI_NO_JSON_FOUND', 'AI_INVALID_JSON'].includes(error.message)) {
        throw error;
      }
      
      throw new Error('AI_PARSE_ERROR');
    }
  }

  // Validate AI response structure
  validateAIResponse(parsed) {
    try {
      const required = {
        scores: ['creativity', 'promptSimilarity'],
        feedback: ['roast', 'highlights', 'improvements'],
        analysis: ['dominantColors', 'estimatedObjects', 'complexity', 'style']
      };

      for (const [section, fields] of Object.entries(required)) {
        if (!parsed[section]) {
          throw new Error(`AI_MISSING_SECTION: ${section}`);
        }
        
        for (const field of fields) {
          if (parsed[section][field] === undefined) {
            throw new Error(`AI_MISSING_FIELD: ${field} in ${section}`);
          }
        }
      }

      // Validate score ranges
      if (typeof parsed.scores.creativity !== 'number' || parsed.scores.creativity < 0 || parsed.scores.creativity > 10) {
        throw new Error('AI_INVALID_CREATIVITY_SCORE');
      }
      if (typeof parsed.scores.promptSimilarity !== 'number' || parsed.scores.promptSimilarity < 0 || parsed.scores.promptSimilarity > 10) {
        throw new Error('AI_INVALID_SIMILARITY_SCORE');
      }

      // Validate arrays
      if (!Array.isArray(parsed.feedback.highlights) || parsed.feedback.highlights.length === 0) {
        throw new Error('AI_INVALID_HIGHLIGHTS');
      }
      if (!Array.isArray(parsed.feedback.improvements) || parsed.feedback.improvements.length === 0) {
        throw new Error('AI_INVALID_IMPROVEMENTS');
      }
      if (!Array.isArray(parsed.analysis.dominantColors) || parsed.analysis.dominantColors.length === 0) {
        throw new Error('AI_INVALID_COLORS');
      }
      if (!Array.isArray(parsed.analysis.estimatedObjects) || parsed.analysis.estimatedObjects.length === 0) {
        throw new Error('AI_INVALID_OBJECTS');
      }

      // Validate string lengths
      if (typeof parsed.feedback.roast !== 'string' || parsed.feedback.roast.length > 500) {
        throw new Error('AI_INVALID_ROAST');
      }

    } catch (error) {
      console.error('AI response validation failed:', error);
      throw error;
    }
  }

  // Create fallback result when AI fails
  async createFallbackResult(gameId, prompt, errorMessage) {
    const fallbackResult = new AIResult({
      gameId,
      prompt,
      scores: {
        creativity: 7.0,
        promptSimilarity: 6.5
      },
      feedback: {
        roast: "Well, the AI took one look at this masterpiece and decided to take a coffee break! But hey, art is subjective, right? 🎨",
        highlights: [
          "Collaborative effort shows great teamwork",
          "Creative use of multiple colors",
          "Unique interpretation of the prompt"
        ],
        improvements: [
          "Maybe the AI needs glasses?",
          "Try adding more details next time",
          "Keep practicing those drawing skills!"
        ]
      },
      analysis: {
        dominantColors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
        estimatedObjects: ['collaborative artwork', 'creative expression'],
        complexity: 'moderate',
        style: 'collaborative'
      },
      aiModel: 'fallback',
      processingTime: 0,
      rawResponse: `Error: ${errorMessage}`
    });

    fallbackResult.calculateOverallScore();
    await fallbackResult.save();
    
    return fallbackResult;
  }

  // Get AI analysis statistics
  async getAnalysisStatistics() {
    const [
      totalAnalyses,
      averageScores,
      modelUsage,
      recentAnalyses
    ] = await Promise.all([
      AIResult.countDocuments(),
      AIResult.getAverageScores(),
      this.getModelUsageStats(),
      this.getRecentAnalyses(10)
    ]);

    return {
      totalAnalyses,
      averageScores,
      modelUsage,
      recentAnalyses
    };
  }

  // Get model usage statistics
  async getModelUsageStats() {
    return await AIResult.aggregate([
      {
        $group: {
          _id: '$aiModel',
          count: { $sum: 1 },
          avgProcessingTime: { $avg: '$processingTime' },
          avgCreativity: { $avg: '$scores.creativity' },
          avgPromptSimilarity: { $avg: '$scores.promptSimilarity' }
        }
      },
      { $sort: { count: -1 } }
    ]);
  }

  // Get recent analyses
  async getRecentAnalyses(limit = 10) {
    return await AIResult.find()
      .populate('gameId', 'lobbyCode promptText')
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('prompt scores.overall feedback.roast createdAt')
      .lean();
  }

  // Test AI connection
  async testConnection() {
    try {
      if (!this.apiKey) {
        return { status: 'error', message: 'API key not configured' };
      }

      // Simple test call
      const response = await axios.post(
        this.apiUrl,
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hello, this is a test.' }],
          max_tokens: 10
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      return { 
        status: 'success', 
        message: 'AI service is working',
        model: response.data.model 
      };
    } catch (error) {
      return { 
        status: 'error', 
        message: error.message,
        code: error.response?.status 
      };
    }
  }
}

module.exports = new AIService();