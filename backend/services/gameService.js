const Game = require('../models/Game');
const Prompt = require('../models/Prompt');
const AIResult = require('../models/AIResult');
const redisService = require('./redisService');
const aiService = require('./aiService');
const { generateLobbyCode } = require('../utils/helpers');

class GameService {
  // Create a new game
  async createGame(hostName, gameSettings = {}) {
    const lobbyCode = await this.generateUniqueLobbyCode();
    
    const game = new Game({
      lobbyCode,
      gameSettings: {
        duration: gameSettings.duration || 300,
        canvasWidth: gameSettings.canvasWidth || 800,
        canvasHeight: gameSettings.canvasHeight || 600
      }
    });

    // Add host as first player
    const hostPlayer = game.addPlayer('temp-socket-id', hostName);
    await game.save();

    // Store in Redis for quick access
    await redisService.setGameState(lobbyCode, {
      gameId: game._id.toString(),
      status: game.status,
      players: game.players,
      createdAt: game.createdAt
    });

    return game;
  }

  // Join existing game
  async joinGame(lobbyCode, playerName, socketId = 'temp-socket-id') {
    const game = await Game.findOne({ lobbyCode });
    
    if (!game) {
      throw new Error('GAME_NOT_FOUND');
    }

    if (game.status !== 'waiting') {
      throw new Error('GAME_ALREADY_STARTED');
    }

    if (game.players.length >= game.maxPlayers) {
      throw new Error('GAME_FULL');
    }

    // Check if this is the host reconnecting (player exists but with temp socket ID)
    const existingPlayer = game.players.find(p => p.name === playerName);
    
    if (existingPlayer) {
      // If player exists and has a temp socket ID, update it with the real socket ID
      if (existingPlayer.socketId.startsWith('temp-')) {
        console.log(`🔄 [GAME SERVICE] Updating host socket ID from ${existingPlayer.socketId} to ${socketId}`);
        existingPlayer.socketId = socketId;
        await game.save();
        
        // Update Redis
        await redisService.updateGamePlayers(lobbyCode, game.players);
        
        return {
          game: {
            lobbyCode: game.lobbyCode,
            status: game.status,
            players: game.players.map(p => ({
              name: p.name,
              color: p.color,
              isHost: p.isHost
            })),
            gameSettings: game.gameSettings
          },
          player: existingPlayer
        };
      } else {
        // Player already has a real socket ID, handle duplicate name
        let finalPlayerName = playerName;
        let counter = 1;
        while (game.players.find(p => p.name === finalPlayerName)) {
          finalPlayerName = `${playerName} (${counter})`;
          counter++;
        }
        
        const newPlayer = game.addPlayer(socketId, finalPlayerName);
        await game.save();
        
        // Update Redis
        await redisService.updateGamePlayers(lobbyCode, game.players);
        
        return {
          game: {
            lobbyCode: game.lobbyCode,
            status: game.status,
            players: game.players.map(p => ({
              name: p.name,
              color: p.color,
              isHost: p.isHost
            })),
            gameSettings: game.gameSettings
          },
          player: newPlayer
        };
      }
    }

    // New player joining
    const newPlayer = game.addPlayer(socketId, playerName);
    await game.save();

    // Update Redis
    await redisService.updateGamePlayers(lobbyCode, game.players);

    return {
      game: {
        lobbyCode: game.lobbyCode,
        status: game.status,
        players: game.players.map(p => ({
          name: p.name,
          color: p.color,
          isHost: p.isHost
        })),
        gameSettings: game.gameSettings
      },
      player: newPlayer
    };
  }

  // Start game
  async startGame(lobbyCode, hostSocketId) {
    const game = await Game.findOne({ lobbyCode });
    
    if (!game) {
      throw new Error('Game not found');
    }

    console.log(`🎮 [GAME SERVICE] Start game request for ${lobbyCode} from socket ${hostSocketId}`);
    console.log(`👥 [GAME SERVICE] Current players:`, game.players.map(p => ({
      name: p.name,
      socketId: p.socketId,
      isHost: p.isHost
    })));

    // Verify host permission
    const host = game.players.find(p => p.socketId === hostSocketId && p.isHost);
    if (!host) {
      console.log(`❌ [GAME SERVICE] Host not found. Looking for socket ${hostSocketId} with isHost=true`);
      throw new Error('Only the host can start the game');
    }

    if (game.players.length < 2) {
      throw new Error('Need at least 2 players to start');
    }

    // If game was finished, reset it for a new round
    if (game.status === 'finished') {
      console.log(`🔄 [GAME SERVICE] Resetting finished game for new round`);
      
      // Clear previous game data
      game.canvasDataUrl = null;
      game.aiResult = null;
      game.status = 'waiting'; // Reset status first
      
      // Clear drawing data from Redis
      try {
        await redisService.clearDrawingData(lobbyCode);
        console.log(`🧹 [GAME SERVICE] Cleared drawing data from Redis`);
      } catch (redisError) {
        console.log(`⚠️ [GAME SERVICE] Could not clear Redis drawing data:`, redisError.message);
      }
    }

    // Get random prompt (always get a fresh one for new games)
    const prompt = await Prompt.getRandomPrompt();
    if (!prompt) {
      throw new Error('No prompts available');
    }

    // Start the game
    game.startGame(prompt);
    await game.save();

    // Update Redis with game state
    await redisService.setGameState(lobbyCode, {
      gameId: game._id.toString(),
      status: game.status,
      players: game.players,
      prompt: prompt.text,
      gameTimer: game.gameTimer,
      drawingData: []
    });

    console.log(`✅ [GAME SERVICE] Game ${lobbyCode} started successfully by ${host.name}`);

    return {
      game: {
        lobbyCode: game.lobbyCode,
        status: game.status,
        prompt: prompt.text,
        gameTimer: game.gameTimer,
        players: game.players.map(p => ({
          name: p.name,
          color: p.color,
          isHost: p.isHost
        }))
      }
    };
  }

  // Add drawing stroke
  async addDrawingStroke(lobbyCode, playerId, strokeData) {
    // Check if MongoDB is available
    const mongoose = require('mongoose');
    
    if (mongoose.connection.readyState !== 1) {
      console.log(`💾 [GAME SERVICE] Using memory storage for drawing stroke`);
      // Use memory storage
      const memoryStorage = require('../utils/memoryStorage');
      return memoryStorage.addDrawingStroke(lobbyCode, {
        playerId,
        ...strokeData
      });
    }

    console.log(`🗄️ [GAME SERVICE] Using database for drawing stroke`);
    const game = await Game.findOne({ lobbyCode });
    
    if (!game) {
      throw new Error('Game not found');
    }

    if (game.status !== 'active') {
      throw new Error('Game is not active');
    }

    const stroke = game.addDrawingStroke(playerId, strokeData);
    await game.save();

    // Update Redis with new stroke
    await redisService.addDrawingStroke(lobbyCode, stroke);

    return stroke;
  }

  // Submit final drawing
  async submitFinalDrawing(lobbyCode, canvasDataUrl) {
    const game = await Game.findOne({ lobbyCode }).populate('prompt');
    
    if (!game) {
      throw new Error('Game not found');
    }

    // Finish the game
    game.finishGame(canvasDataUrl);
    await game.save();

    // Get AI analysis
    try {
      const aiResult = await aiService.analyzeDrawing(
        canvasDataUrl,
        game.promptText,
        game._id
      );
      
      game.aiResult = aiResult._id;
      await game.save();

      // Update Redis
      await redisService.setGameState(lobbyCode, {
        gameId: game._id.toString(),
        status: game.status,
        aiResult: aiResult
      });

      return {
        gameId: game._id,
        aiResult
      };
    } catch (aiError) {
      console.error('AI analysis failed:', aiError);
      // Game is still finished, just without AI analysis
      return {
        gameId: game._id,
        aiResult: null,
        error: 'AI analysis failed'
      };
    }
  }

  // Get game results
  async getGameResults(lobbyCode) {
    const game = await Game.findOne({ lobbyCode })
      .populate('aiResult')
      .populate('prompt');
    
    if (!game) {
      throw new Error('Game not found');
    }

    if (game.status !== 'finished') {
      throw new Error('Game is not finished yet');
    }

    return {
      game: {
        lobbyCode: game.lobbyCode,
        prompt: game.promptText,
        players: game.players.map(p => ({
          name: p.name,
          color: p.color
        })),
        finalCanvas: game.finalCanvas,
        gameTimer: game.gameTimer
      },
      aiResult: game.aiResult
    };
  }

  // Remove player from game
  async removePlayerFromGame(lobbyCode, socketId) {
    const game = await Game.findOne({ lobbyCode });
    
    if (!game) {
      throw new Error('Game not found');
    }

    const removedPlayer = game.removePlayer(socketId);
    
    if (!removedPlayer) {
      return null; // Player wasn't in the game
    }

    // If no players left, mark game as abandoned
    if (game.players.length === 0) {
      game.status = 'abandoned';
      await redisService.deleteGameState(lobbyCode);
    } else {
      await redisService.updateGamePlayers(lobbyCode, game.players);
    }

    await game.save();
    return removedPlayer;
  }

  // Get game by lobby code
  async getGameByLobbyCode(lobbyCode) {
    // Try Redis first for active games
    const cachedGame = await redisService.getGameState(lobbyCode);
    if (cachedGame) {
      return await Game.findById(cachedGame.gameId);
    }

    // Fallback to MongoDB
    return await Game.findOne({ lobbyCode });
  }

  // Get active games
  async getActiveGames() {
    return await Game.find({
      status: { $in: ['waiting', 'starting', 'active'] }
    }).sort({ createdAt: -1 });
  }

  // Update player socket ID (for reconnection)
  async updatePlayerSocketId(lobbyCode, oldSocketId, newSocketId) {
    const game = await Game.findOne({ lobbyCode });
    
    if (!game) {
      throw new Error('Game not found');
    }

    const player = game.players.find(p => p.socketId === oldSocketId);
    if (!player) {
      throw new Error('Player not found');
    }

    player.socketId = newSocketId;
    await game.save();

    // Update Redis
    await redisService.updateGamePlayers(lobbyCode, game.players);

    return player;
  }

  // Generate unique lobby code
  async generateUniqueLobbyCode() {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const code = generateLobbyCode();
      const existing = await Game.findOne({ lobbyCode: code });
      
      if (!existing) {
        return code;
      }
      
      attempts++;
    }

    throw new Error('Failed to generate unique lobby code');
  }

  // Clean up old games (should be run periodically)
  async cleanupOldGames() {
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    const result = await Game.updateMany(
      {
        status: { $in: ['waiting', 'active'] },
        createdAt: { $lt: cutoffDate }
      },
      { status: 'abandoned' }
    );

    console.log(`Cleaned up ${result.modifiedCount} old games`);
    return result.modifiedCount;
  }
}

module.exports = new GameService();