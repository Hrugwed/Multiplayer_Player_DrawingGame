const gameService = require('../services/gameService');
const memoryStorage = require('../utils/memoryStorage');
const { validateCreateGame, validateJoinGame } = require('../utils/validation');

class GameController {
  // Create a new game lobby
  async createGame(req, res) {
    try {
      const { error } = validateCreateGame(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const { playerName, gameSettings } = req.body;
      
      // Check if MongoDB is available
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 1) {
        // Use memory storage for development
        const lobbyCode = memoryStorage.generateLobbyCode();
        const gameData = {
          lobbyCode,
          gameId: `mock-${lobbyCode}`,
          status: 'waiting',
          players: [],
          maxPlayers: 4,
          gameSettings: {
            duration: gameSettings?.duration || 300,
            canvasWidth: gameSettings?.canvasWidth || 800,
            canvasHeight: gameSettings?.canvasHeight || 600
          },
          createdAt: new Date().toISOString(),
          prompt: null,
          gameTimer: null
        };

        // Create game in memory
        memoryStorage.createGame(gameData);

        // Add host player with unique socket ID
        const hostPlayer = memoryStorage.addPlayerToGame(lobbyCode, {
          name: playerName,
          socketId: `temp-host-${lobbyCode}`
        });

        return res.status(201).json({
          success: true,
          data: {
            lobbyCode: gameData.lobbyCode,
            gameId: gameData.gameId,
            player: hostPlayer,
            gameSettings: gameData.gameSettings
          },
          message: 'Game created successfully (using memory storage)'
        });
      }

      const game = await gameService.createGame(playerName, gameSettings);

      res.status(201).json({
        success: true,
        data: {
          lobbyCode: game.lobbyCode,
          gameId: game._id,
          player: game.players[0],
          gameSettings: game.gameSettings
        }
      });
    } catch (error) {
      console.error('Create game error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Join an existing game
  async joinGame(req, res) {
    try {
      const { error } = validateJoinGame(req.body);
      if (error) {
        return res.status(400).json({ 
          error: 'INVALID_INPUT',
          message: 'Please check your input and try again.',
          details: error.details[0].message 
        });
      }

      const { lobbyCode, playerName } = req.body;
      
      // Check if MongoDB is available
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 1) {
        // Use memory storage for development
        const game = memoryStorage.getGame(lobbyCode);
        
        if (!game) {
          return res.status(404).json({ 
            error: 'GAME_NOT_FOUND',
            message: 'This game lobby doesn\'t exist. Please check the lobby code and try again.'
          });
        }

        if (game.status !== 'waiting') {
          return res.status(409).json({ 
            error: 'GAME_ALREADY_STARTED',
            message: 'This game has already started. You can\'t join a game in progress.'
          });
        }

        try {
          const newPlayer = memoryStorage.addPlayerToGame(lobbyCode, {
            name: playerName,
            socketId: `temp-join-${Date.now()}-${Math.random()}`
          });

          const updatedGame = memoryStorage.getGame(lobbyCode);

          return res.json({
            success: true,
            data: {
              game: {
                lobbyCode: updatedGame.lobbyCode,
                status: updatedGame.status,
                players: updatedGame.players.map(p => ({
                  name: p.name,
                  color: p.color,
                  isHost: p.isHost
                })),
                gameSettings: updatedGame.gameSettings
              },
              player: newPlayer
            },
            message: 'Successfully joined the game!'
          });
        } catch (memoryError) {
          if (memoryError.message === 'Game is full') {
            return res.status(409).json({ 
              error: 'GAME_FULL',
              message: 'This game lobby is full. Please try joining a different game.'
            });
          }
          return res.status(500).json({ 
            error: 'JOIN_FAILED',
            message: 'Failed to join the game. Please try again.'
          });
        }
      }

      const result = await gameService.joinGame(lobbyCode, playerName);

      res.json({
        success: true,
        data: result,
        message: 'Successfully joined the game!'
      });
    } catch (error) {
      console.error('Join game error:', error);
      
      // Handle specific error codes
      let statusCode = 500;
      let errorCode = 'JOIN_FAILED';
      let message = 'Failed to join the game. Please try again.';

      switch (error.message) {
        case 'GAME_NOT_FOUND':
          statusCode = 404;
          errorCode = 'GAME_NOT_FOUND';
          message = 'This game lobby doesn\'t exist. Please check the lobby code and try again.';
          break;
        case 'GAME_ALREADY_STARTED':
          statusCode = 409;
          errorCode = 'GAME_ALREADY_STARTED';
          message = 'This game has already started. You can\'t join a game in progress.';
          break;
        case 'GAME_FULL':
          statusCode = 409;
          errorCode = 'GAME_FULL';
          message = 'This game lobby is full. Please try joining a different game.';
          break;
        default:
          // Keep default values
          break;
      }

      res.status(statusCode).json({ 
        error: errorCode,
        message: message
      });
    }
  }

  // Get game status
  async getGameStatus(req, res) {
    try {
      const { lobbyCode } = req.params;
      
      // Check if MongoDB is available
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 1) {
        // Use memory storage for development
        const game = memoryStorage.getGame(lobbyCode);
        
        if (!game) {
          return res.status(404).json({ error: 'Game not found' });
        }

        return res.json({
          success: true,
          data: {
            lobbyCode: game.lobbyCode,
            status: game.status,
            players: game.players.map(p => ({
              name: p.name,
              color: p.color,
              isHost: p.isHost
            })),
            activePlayersCount: game.players.length,
            availableSlots: game.maxPlayers - game.players.length,
            gameSettings: game.gameSettings,
            prompt: game.prompt,
            gameTimer: game.gameTimer
          }
        });
      }

      const game = await gameService.getGameByLobbyCode(lobbyCode);

      if (!game) {
        return res.status(404).json({ error: 'Game not found' });
      }

      res.json({
        success: true,
        data: {
          lobbyCode: game.lobbyCode,
          status: game.status,
          players: game.players.map(p => ({
            name: p.name,
            color: p.color,
            isHost: p.isHost
          })),
          activePlayersCount: game.activePlayersCount,
          availableSlots: game.availableSlots,
          gameSettings: game.gameSettings,
          prompt: game.promptText,
          gameTimer: game.gameTimer
        }
      });
    } catch (error) {
      console.error('Get game status error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Start game (host only)
  async startGame(req, res) {
    try {
      const { lobbyCode } = req.params;
      const { socketId } = req.body;

      const result = await gameService.startGame(lobbyCode, socketId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Start game error:', error);
      const statusCode = error.message.includes('not found') ? 404 :
                        error.message.includes('permission') ? 403 :
                        error.message.includes('players') ? 400 : 500;
      res.status(statusCode).json({ error: error.message });
    }
  }

  // Submit final drawing for AI analysis
  async submitDrawing(req, res) {
    try {
      const { lobbyCode } = req.params;
      const { canvasDataUrl } = req.body;

      if (!canvasDataUrl) {
        return res.status(400).json({ error: 'Canvas data is required' });
      }

      const result = await gameService.submitFinalDrawing(lobbyCode, canvasDataUrl);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Submit drawing error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get game results
  async getGameResults(req, res) {
    try {
      const { lobbyCode } = req.params;
      const results = await gameService.getGameResults(lobbyCode);

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Get game results error:', error);
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({ error: error.message });
    }
  }

  // Leave game
  async leaveGame(req, res) {
    try {
      const { lobbyCode } = req.params;
      const { socketId } = req.body;

      await gameService.removePlayerFromGame(lobbyCode, socketId);

      res.json({
        success: true,
        message: 'Left game successfully'
      });
    } catch (error) {
      console.error('Leave game error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get active games (for admin/monitoring)
  async getActiveGames(req, res) {
    try {
      const games = await gameService.getActiveGames();
      
      res.json({
        success: true,
        data: games.map(game => ({
          lobbyCode: game.lobbyCode,
          status: game.status,
          playersCount: game.activePlayersCount,
          createdAt: game.createdAt,
          prompt: game.promptText
        }))
      });
    } catch (error) {
      console.error('Get active games error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new GameController();