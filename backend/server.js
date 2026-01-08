const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = require('./config/database');
const { connectRedis } = require('./config/redis');
const gameRoutes = require('./routes/gameRoutes');
const promptRoutes = require('./routes/promptRoutes');
const { initializeSocketHandlers } = require('./sockets/gameSocket');

const app = express();
const server = http.createServer(app);

// CORS configuration
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:5174', // Alternative port
    /\.vercel\.app$/, // Allow all Vercel deployments
    /\.fly\.dev$/ // Allow Fly.io deployments
  ],
  credentials: true
};

const io = socketIo(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling']
});

// Security middleware
app.use(helmet());
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Connect to databases (non-blocking for development)
connectDB().catch(err => console.log('MongoDB connection failed, continuing without it:', err.message));
connectRedis().catch(err => console.log('Redis connection failed, continuing without it:', err.message));

// Middleware to check database connection
const checkDatabaseConnection = (req, res, next) => {
  // For development, we'll allow requests even without database
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  
  // In production, check if MongoDB is connected
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      error: 'Database not available',
      message: 'Please try again later'
    });
  }
  
  next();
};

// Routes
app.use('/api/game', checkDatabaseConnection, gameRoutes);
app.use('/api/prompts', checkDatabaseConnection, promptRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Debug endpoint to clear all games (development only)
app.post('/debug/clear-games', (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Only available in development' });
  }
  
  const memoryStorage = require('./utils/memoryStorage');
  memoryStorage.clearAllGames();
  
  res.json({ 
    success: true, 
    message: 'All games cleared',
    timestamp: new Date().toISOString()
  });
});

// Initialize Socket.IO handlers
initializeSocketHandlers(io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = { app, server, io };