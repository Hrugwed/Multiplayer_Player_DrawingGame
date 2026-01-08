const crypto = require('crypto');

// Generate a random lobby code
function generateLobbyCode(length = 6) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
}

// Generate a unique session ID
function generateSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

// Format time duration in seconds to human readable format
function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
}

// Format time remaining for display
function formatTimeRemaining(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Calculate distance between two points
function calculateDistance(point1, point2) {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Throttle function calls
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Debounce function calls
function debounce(func, wait, immediate) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    const later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

// Validate canvas data URL
function isValidCanvasDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return false;
  }
  
  // Check if it's a valid data URL format
  const dataUrlPattern = /^data:image\/(png|jpeg|jpg);base64,/;
  if (!dataUrlPattern.test(dataUrl)) {
    return false;
  }
  
  // Check if base64 data exists
  const base64Data = dataUrl.split(',')[1];
  if (!base64Data || base64Data.length === 0) {
    return false;
  }
  
  // Basic base64 validation
  try {
    Buffer.from(base64Data, 'base64');
    return true;
  } catch (error) {
    return false;
  }
}

// Convert canvas data URL to buffer
function dataUrlToBuffer(dataUrl) {
  if (!isValidCanvasDataUrl(dataUrl)) {
    throw new Error('Invalid canvas data URL');
  }
  
  const base64Data = dataUrl.split(',')[1];
  return Buffer.from(base64Data, 'base64');
}

// Get file size from data URL
function getDataUrlSize(dataUrl) {
  if (!isValidCanvasDataUrl(dataUrl)) {
    return 0;
  }
  
  const base64Data = dataUrl.split(',')[1];
  // Base64 encoding increases size by ~33%
  return Math.floor(base64Data.length * 0.75);
}

// Validate drawing point
function isValidDrawingPoint(point) {
  return (
    point &&
    typeof point.x === 'number' &&
    typeof point.y === 'number' &&
    point.x >= 0 &&
    point.y >= 0 &&
    point.x <= 10000 && // Reasonable canvas size limits
    point.y <= 10000
  );
}

// Sanitize drawing points array
function sanitizeDrawingPoints(points) {
  if (!Array.isArray(points)) {
    return [];
  }
  
  return points
    .filter(isValidDrawingPoint)
    .map(point => ({
      x: Math.round(point.x),
      y: Math.round(point.y),
      pressure: point.pressure || 1
    }));
}

// Generate color palette for players
function getPlayerColors() {
  return [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#96CEB4'  // Green
  ];
}

// Get color name from hex
function getColorName(hex) {
  const colorMap = {
    '#FF6B6B': 'Red',
    '#4ECDC4': 'Teal',
    '#45B7D1': 'Blue',
    '#96CEB4': 'Green'
  };
  
  return colorMap[hex] || 'Unknown';
}

// Calculate game statistics
function calculateGameStats(drawingData, players) {
  const stats = {
    totalStrokes: drawingData.length,
    playerStats: {},
    averageStrokeLength: 0,
    totalDrawingTime: 0
  };
  
  // Initialize player stats
  players.forEach(player => {
    stats.playerStats[player.socketId] = {
      name: player.name,
      color: player.color,
      strokeCount: 0,
      totalPoints: 0,
      averageStrokeLength: 0
    };
  });
  
  // Calculate stroke statistics
  let totalPoints = 0;
  drawingData.forEach(stroke => {
    const playerId = stroke.playerId;
    if (stats.playerStats[playerId]) {
      stats.playerStats[playerId].strokeCount++;
      stats.playerStats[playerId].totalPoints += stroke.points.length;
      totalPoints += stroke.points.length;
    }
  });
  
  // Calculate averages
  if (stats.totalStrokes > 0) {
    stats.averageStrokeLength = totalPoints / stats.totalStrokes;
  }
  
  Object.values(stats.playerStats).forEach(playerStat => {
    if (playerStat.strokeCount > 0) {
      playerStat.averageStrokeLength = playerStat.totalPoints / playerStat.strokeCount;
    }
  });
  
  return stats;
}

// Error response helper
function createErrorResponse(message, code = 'GENERIC_ERROR', details = null) {
  const error = {
    error: message,
    code,
    timestamp: new Date().toISOString()
  };
  
  if (details) {
    error.details = details;
  }
  
  return error;
}

// Success response helper
function createSuccessResponse(data, message = null) {
  const response = {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };
  
  if (message) {
    response.message = message;
  }
  
  return response;
}

// Async error handler wrapper
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Rate limiter helper
function createRateLimiter(windowMs = 15 * 60 * 1000, max = 100) {
  const requests = new Map();
  
  return (identifier) => {
    const now = Date.now();
    
    if (!requests.has(identifier)) {
      requests.set(identifier, []);
    }
    
    const userRequests = requests.get(identifier);
    
    // Remove old requests
    const validRequests = userRequests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= max) {
      return false; // Rate limit exceeded
    }
    
    validRequests.push(now);
    requests.set(identifier, validRequests);
    
    return true; // Request allowed
  };
}

// Memory usage helper
function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024), // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
    external: Math.round(usage.external / 1024 / 1024) // MB
  };
}

// System health check
function getSystemHealth() {
  return {
    uptime: process.uptime(),
    memory: getMemoryUsage(),
    nodeVersion: process.version,
    platform: process.platform,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  generateLobbyCode,
  generateSessionId,
  formatDuration,
  formatTimeRemaining,
  calculateDistance,
  throttle,
  debounce,
  isValidCanvasDataUrl,
  dataUrlToBuffer,
  getDataUrlSize,
  isValidDrawingPoint,
  sanitizeDrawingPoints,
  getPlayerColors,
  getColorName,
  calculateGameStats,
  createErrorResponse,
  createSuccessResponse,
  asyncHandler,
  createRateLimiter,
  getMemoryUsage,
  getSystemHealth
};