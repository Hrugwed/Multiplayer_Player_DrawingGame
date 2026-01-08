const { createClient } = require('redis');

let redisClient;

const connectRedis = async () => {
  // Skip Redis connection in development if not available
  if (process.env.NODE_ENV === 'development' && !process.env.REDIS_URL) {
    console.log('🔴 Redis skipped in development (no REDIS_URL provided)');
    return;
  }
  
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('🔴 Redis Connected');
    });

    redisClient.on('disconnect', () => {
      console.log('Redis Disconnected');
    });

    await redisClient.connect();

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await redisClient.quit();
      console.log('Redis connection closed through app termination');
    });

  } catch (error) {
    console.error('Redis connection failed:', error);
    // Don't exit process, just log the error for development
    console.log('Continuing without Redis...');
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
};

module.exports = { connectRedis, getRedisClient };