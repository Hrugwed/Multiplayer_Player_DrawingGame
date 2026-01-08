const Joi = require('joi');

// Game validation schemas
const createGameSchema = Joi.object({
  playerName: Joi.string()
    .trim()
    .min(1)
    .max(20)
    .pattern(/^[a-zA-Z0-9\s_-]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Player name can only contain letters, numbers, spaces, underscores, and hyphens'
    }),
  gameSettings: Joi.object({
    duration: Joi.number().integer().min(60).max(1800).default(300), // 1 minute to 30 minutes
    canvasWidth: Joi.number().integer().min(400).max(1920).default(800),
    canvasHeight: Joi.number().integer().min(300).max(1080).default(600)
  }).default({})
});

const joinGameSchema = Joi.object({
  lobbyCode: Joi.string()
    .length(6)
    .pattern(/^[A-Z0-9]+$/)
    .required()
    .messages({
      'string.length': 'Lobby code must be exactly 6 characters',
      'string.pattern.base': 'Lobby code can only contain uppercase letters and numbers'
    }),
  playerName: Joi.string()
    .trim()
    .min(1)
    .max(20)
    .pattern(/^[a-zA-Z0-9\s_-]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Player name can only contain letters, numbers, spaces, underscores, and hyphens'
    })
});

// Prompt validation schemas
const createPromptSchema = Joi.object({
  text: Joi.string()
    .trim()
    .min(3)
    .max(200)
    .required(),
  category: Joi.string()
    .valid('animals', 'objects', 'scenes', 'abstract', 'characters')
    .default('objects'),
  difficulty: Joi.string()
    .valid('easy', 'medium', 'hard')
    .default('medium'),
  isActive: Joi.boolean().default(true)
});

const updatePromptSchema = Joi.object({
  text: Joi.string()
    .trim()
    .min(3)
    .max(200),
  category: Joi.string()
    .valid('animals', 'objects', 'scenes', 'abstract', 'characters'),
  difficulty: Joi.string()
    .valid('easy', 'medium', 'hard'),
  isActive: Joi.boolean()
}).min(1); // At least one field must be provided

// Drawing validation schemas
const drawingStrokeSchema = Joi.object({
  points: Joi.array()
    .items(
      Joi.object({
        x: Joi.number().required(),
        y: Joi.number().required(),
        pressure: Joi.number().min(0).max(1).default(1)
      })
    )
    .min(1)
    .max(1000) // Limit points per stroke
    .required(),
  strokeWidth: Joi.number().min(1).max(50).default(2),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/) // Hex color
});

const canvasDataSchema = Joi.object({
  canvasDataUrl: Joi.string()
    .pattern(/^data:image\/(png|jpeg|jpg);base64,/)
    .required()
    .messages({
      'string.pattern.base': 'Canvas data must be a valid base64 encoded image'
    })
});

// Socket event validation schemas
const socketEventSchema = Joi.object({
  lobbyCode: Joi.string()
    .length(6)
    .pattern(/^[A-Z0-9]+$/)
    .required(),
  playerId: Joi.string().required()
});

const cursorMoveSchema = socketEventSchema.keys({
  x: Joi.number().min(0).required(),
  y: Joi.number().min(0).required()
});

const voiceSignalingSchema = socketEventSchema.keys({
  targetPlayerId: Joi.string().required(),
  offer: Joi.object().when('type', { is: 'offer', then: Joi.required() }),
  answer: Joi.object().when('type', { is: 'answer', then: Joi.required() }),
  candidate: Joi.object().when('type', { is: 'ice-candidate', then: Joi.required() })
});

// Validation functions
const validateCreateGame = (data) => {
  return createGameSchema.validate(data, { abortEarly: false });
};

const validateJoinGame = (data) => {
  return joinGameSchema.validate(data, { abortEarly: false });
};

const validateCreatePrompt = (data) => {
  return createPromptSchema.validate(data, { abortEarly: false });
};

const validateUpdatePrompt = (data) => {
  return updatePromptSchema.validate(data, { abortEarly: false });
};

const validateDrawingStroke = (data) => {
  return drawingStrokeSchema.validate(data, { abortEarly: false });
};

const validateCanvasData = (data) => {
  return canvasDataSchema.validate(data, { abortEarly: false });
};

const validateSocketEvent = (data) => {
  return socketEventSchema.validate(data, { abortEarly: false });
};

const validateCursorMove = (data) => {
  return cursorMoveSchema.validate(data, { abortEarly: false });
};

const validateVoiceSignaling = (data) => {
  return voiceSignalingSchema.validate(data, { abortEarly: false });
};

// Sanitization helpers
const sanitizePlayerName = (name) => {
  return name.trim().replace(/[^\w\s-]/g, '').substring(0, 20);
};

const sanitizeLobbyCode = (code) => {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
};

const sanitizePromptText = (text) => {
  return text.trim().replace(/[<>]/g, ''); // Remove potential HTML tags
};

// Custom validation middleware
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }
    
    req.body = value; // Use validated and sanitized data
    next();
  };
};

// Rate limiting validation
const validateRateLimit = (maxRequests = 10, windowMs = 60000) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const clientId = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!requests.has(clientId)) {
      requests.set(clientId, []);
    }
    
    const clientRequests = requests.get(clientId);
    
    // Remove old requests outside the window
    const validRequests = clientRequests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        message: `Maximum ${maxRequests} requests per ${windowMs / 1000} seconds`
      });
    }
    
    validRequests.push(now);
    requests.set(clientId, validRequests);
    
    next();
  };
};

module.exports = {
  // Validation functions
  validateCreateGame,
  validateJoinGame,
  validateCreatePrompt,
  validateUpdatePrompt,
  validateDrawingStroke,
  validateCanvasData,
  validateSocketEvent,
  validateCursorMove,
  validateVoiceSignaling,
  
  // Sanitization functions
  sanitizePlayerName,
  sanitizeLobbyCode,
  sanitizePromptText,
  
  // Middleware
  validateRequest,
  validateRateLimit,
  
  // Schemas (for direct use)
  createGameSchema,
  joinGameSchema,
  createPromptSchema,
  updatePromptSchema,
  drawingStrokeSchema,
  canvasDataSchema,
  socketEventSchema,
  cursorMoveSchema,
  voiceSignalingSchema
};