const { getRedisClient } = require('../config/redis');

class RedisService {
  constructor() {
    this.GAME_PREFIX = 'game:';
    this.LOBBY_PREFIX = 'lobby:';
    this.PLAYER_PREFIX = 'player:';
    this.DRAWING_PREFIX = 'drawing:';
    
    // TTL values (in seconds)
    this.GAME_TTL = 24 * 60 * 60; // 24 hours
    this.LOBBY_TTL = 6 * 60 * 60; // 6 hours
    this.DRAWING_TTL = 2 * 60 * 60; // 2 hours
  }

  getClient() {
    try {
      return getRedisClient();
    } catch (error) {
      console.warn('Redis not available:', error.message);
      return null;
    }
  }

  // Game state management
  async setGameState(lobbyCode, gameData) {
    try {
      const client = this.getClient();
      if (!client) {
        console.warn('Redis client not available for setGameState');
        return false;
      }

      if (!lobbyCode || !gameData) {
        throw new Error('REDIS_INVALID_PARAMS');
      }
      
      const key = `${this.GAME_PREFIX}${lobbyCode}`;
      
      await client.setEx(key, this.GAME_TTL, JSON.stringify(gameData));
      
      // Also maintain a lobby index
      await client.setEx(
        `${this.LOBBY_PREFIX}${lobbyCode}`,
        this.LOBBY_TTL,
        JSON.stringify({
          gameId: gameData.gameId,
          status: gameData.status,
          playerCount: gameData.players?.length || 0,
          createdAt: gameData.createdAt || new Date().toISOString()
        })
      );

      return true;
    } catch (error) {
      console.warn('Redis setGameState error:', error.message);
      if (error.message === 'REDIS_INVALID_PARAMS') {
        throw error;
      }
      throw new Error('REDIS_SET_FAILED');
    }
  }

  async getGameState(lobbyCode) {
    try {
      const client = this.getClient();
      if (!client) {
        console.warn('Redis client not available for getGameState');
        return null;
      }

      if (!lobbyCode) {
        throw new Error('REDIS_LOBBY_CODE_REQUIRED');
      }
      
      const key = `${this.GAME_PREFIX}${lobbyCode}`;
      
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn('Redis getGameState error:', error.message);
      if (error.message === 'REDIS_LOBBY_CODE_REQUIRED') {
        throw error;
      }
      return null;
    }
  }

  async deleteGameState(lobbyCode) {
    try {
      const client = this.getClient();
      if (!client) {
        console.warn('Redis client not available for deleteGameState');
        return false;
      }

      if (!lobbyCode) {
        throw new Error('REDIS_LOBBY_CODE_REQUIRED');
      }
      
      const gameKey = `${this.GAME_PREFIX}${lobbyCode}`;
      const lobbyKey = `${this.LOBBY_PREFIX}${lobbyCode}`;
      const drawingKey = `${this.DRAWING_PREFIX}${lobbyCode}`;
      
      await Promise.all([
        client.del(gameKey),
        client.del(lobbyKey),
        client.del(drawingKey)
      ]);

      return true;
    } catch (error) {
      console.warn('Redis deleteGameState error:', error.message);
      if (error.message === 'REDIS_LOBBY_CODE_REQUIRED') {
        throw error;
      }
      throw new Error('REDIS_DELETE_FAILED');
    }
  }

  // Player management
  async updateGamePlayers(lobbyCode, players) {
    const gameState = await this.getGameState(lobbyCode);
    if (gameState) {
      gameState.players = players;
      await this.setGameState(lobbyCode, gameState);
    }
  }

  async addPlayerToLobby(lobbyCode, player) {
    const gameState = await this.getGameState(lobbyCode);
    if (gameState) {
      if (!gameState.players) {
        gameState.players = [];
      }
      gameState.players.push(player);
      await this.setGameState(lobbyCode, gameState);
    }
  }

  async removePlayerFromLobby(lobbyCode, socketId) {
    const gameState = await this.getGameState(lobbyCode);
    if (gameState && gameState.players) {
      gameState.players = gameState.players.filter(p => p.socketId !== socketId);
      await this.setGameState(lobbyCode, gameState);
    }
  }

  // Drawing data management
  async addDrawingStroke(lobbyCode, stroke) {
    try {
      const client = this.getClient();
      if (!client) {
        console.warn('Redis client not available for addDrawingStroke');
        return false;
      }

      if (!lobbyCode || !stroke) {
        throw new Error('REDIS_INVALID_STROKE_PARAMS');
      }
      
      const key = `${this.DRAWING_PREFIX}${lobbyCode}`;
      
      // Store as a list of strokes
      await client.rPush(key, JSON.stringify(stroke));
      await client.expire(key, this.DRAWING_TTL);

      return true;
    } catch (error) {
      console.warn('Redis addDrawingStroke error:', error.message);
      if (error.message === 'REDIS_INVALID_STROKE_PARAMS') {
        throw error;
      }
      throw new Error('REDIS_STROKE_ADD_FAILED');
    }
  }

  async getDrawingStrokes(lobbyCode, limit = 1000) {
    try {
      const client = this.getClient();
      if (!client) {
        console.warn('Redis client not available for getDrawingStrokes');
        return [];
      }

      if (!lobbyCode) {
        throw new Error('REDIS_LOBBY_CODE_REQUIRED');
      }

      if (limit < 1 || limit > 10000) {
        throw new Error('REDIS_INVALID_LIMIT');
      }
      
      const key = `${this.DRAWING_PREFIX}${lobbyCode}`;
      
      const strokes = await client.lRange(key, 0, limit - 1);
      return strokes.map(stroke => {
        try {
          return JSON.parse(stroke);
        } catch (parseError) {
          console.warn('Failed to parse stroke data:', parseError);
          return null;
        }
      }).filter(stroke => stroke !== null);
    } catch (error) {
      console.warn('Redis getDrawingStrokes error:', error.message);
      if (['REDIS_LOBBY_CODE_REQUIRED', 'REDIS_INVALID_LIMIT'].includes(error.message)) {
        throw error;
      }
      return [];
    }
  }

  async clearDrawingData(lobbyCode) {
    try {
      const client = this.getClient();
      if (!client) {
        console.warn('Redis client not available for clearDrawingData');
        return false;
      }

      if (!lobbyCode) {
        throw new Error('REDIS_LOBBY_CODE_REQUIRED');
      }
      
      const key = `${this.DRAWING_PREFIX}${lobbyCode}`;
      
      await client.del(key);
      return true;
    } catch (error) {
      console.warn('Redis clearDrawingData error:', error.message);
      if (error.message === 'REDIS_LOBBY_CODE_REQUIRED') {
        throw error;
      }
      throw new Error('REDIS_CLEAR_FAILED');
    }
  }

  // Player cursor positions (for real-time cursor sharing)
  async updatePlayerCursor(lobbyCode, playerId, cursorData) {
    const client = this.getClient();
    const key = `cursor:${lobbyCode}:${playerId}`;
    
    await client.setEx(key, 30, JSON.stringify(cursorData)); // 30 second TTL
  }

  async getPlayerCursors(lobbyCode) {
    const client = this.getClient();
    const pattern = `cursor:${lobbyCode}:*`;
    
    const keys = await client.keys(pattern);
    const cursors = {};
    
    for (const key of keys) {
      const playerId = key.split(':')[2];
      const data = await client.get(key);
      if (data) {
        cursors[playerId] = JSON.parse(data);
      }
    }
    
    return cursors;
  }

  async removePlayerCursor(lobbyCode, playerId) {
    const client = this.getClient();
    const key = `cursor:${lobbyCode}:${playerId}`;
    
    await client.del(key);
  }

  // Lobby discovery
  async getActiveLobbyList() {
    const client = this.getClient();
    const pattern = `${this.LOBBY_PREFIX}*`;
    
    const keys = await client.keys(pattern);
    const lobbies = [];
    
    for (const key of keys) {
      const data = await client.get(key);
      if (data) {
        const lobbyData = JSON.parse(data);
        const lobbyCode = key.replace(this.LOBBY_PREFIX, '');
        lobbies.push({
          lobbyCode,
          ...lobbyData
        });
      }
    }
    
    return lobbies.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Game timer management
  async setGameTimer(lobbyCode, timerData) {
    const client = this.getClient();
    const key = `timer:${lobbyCode}`;
    
    await client.setEx(key, this.GAME_TTL, JSON.stringify(timerData));
  }

  async getGameTimer(lobbyCode) {
    const client = this.getClient();
    const key = `timer:${lobbyCode}`;
    
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async updateRemainingTime(lobbyCode, remainingTime) {
    const timerData = await this.getGameTimer(lobbyCode);
    if (timerData) {
      timerData.remainingTime = remainingTime;
      await this.setGameTimer(lobbyCode, timerData);
    }
  }

  // Socket ID mapping (for reconnection handling)
  async mapSocketToPlayer(socketId, lobbyCode, playerId) {
    const client = this.getClient();
    const key = `socket:${socketId}`;
    
    await client.setEx(key, this.GAME_TTL, JSON.stringify({
      lobbyCode,
      playerId,
      connectedAt: new Date().toISOString()
    }));
  }

  async getPlayerBySocket(socketId) {
    const client = this.getClient();
    const key = `socket:${socketId}`;
    
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async removeSocketMapping(socketId) {
    const client = this.getClient();
    const key = `socket:${socketId}`;
    
    await client.del(key);
  }

  // Statistics and monitoring
  async getActiveGamesCount() {
    const client = this.getClient();
    const pattern = `${this.LOBBY_PREFIX}*`;
    
    const keys = await client.keys(pattern);
    return keys.length;
  }

  async getActivePlayersCount() {
    const client = this.getClient();
    const pattern = `socket:*`;
    
    const keys = await client.keys(pattern);
    return keys.length;
  }

  // Cleanup utilities
  async cleanupExpiredData() {
    const client = this.getClient();
    
    // Redis handles TTL automatically, but we can do additional cleanup
    const patterns = [
      'cursor:*',
      'timer:*'
    ];
    
    let cleanedCount = 0;
    
    for (const pattern of patterns) {
      const keys = await client.keys(pattern);
      for (const key of keys) {
        const ttl = await client.ttl(key);
        if (ttl === -1) { // No TTL set
          await client.expire(key, 3600); // Set 1 hour TTL
          cleanedCount++;
        }
      }
    }
    
    return cleanedCount;
  }

  // Health check
  async healthCheck() {
    const client = this.getClient();
    
    try {
      await client.ping();
      return {
        status: 'healthy',
        activeGames: await this.getActiveGamesCount(),
        activePlayers: await this.getActivePlayersCount()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

module.exports = new RedisService();