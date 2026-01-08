const gameService = require('../services/gameService');
const redisService = require('../services/redisService');
const memoryStorage = require('../utils/memoryStorage');

class GameSocketHandler {
  constructor(io) {
    this.io = io;
    this.gameTimers = new Map(); // Store active game timers
    this.joinAttempts = new Map(); // Track join attempts to prevent duplicates
  }

  // Initialize socket event handlers
  initializeHandlers(socket) {
    console.log(`🔌 [SOCKET] Client connected: ${socket.id}`);

    // Game lobby events
    socket.on('join_lobby', (data) => {
      console.log(`📥 [SOCKET] Received join_lobby event:`, { socketId: socket.id, data });
      
      // Debounce join attempts
      const joinKey = `${socket.id}-${data.lobbyCode}`;
      const lastAttempt = this.joinAttempts.get(joinKey);
      const now = Date.now();
      
      if (lastAttempt && (now - lastAttempt) < 1000) { // 1 second debounce
        console.log(`⚠️ [SOCKET] Ignoring duplicate join attempt from ${socket.id} for ${data.lobbyCode}`);
        return;
      }
      
      this.joinAttempts.set(joinKey, now);
      this.handleJoinLobby(socket, data);
    });
    
    socket.on('leave_lobby', (data) => {
      console.log(`📥 [SOCKET] Received leave_lobby event:`, { socketId: socket.id, data });
      this.handleLeaveLobby(socket, data);
    });
    
    socket.on('start_game', (data) => {
      console.log(`📥 [SOCKET] Received start_game event:`, { socketId: socket.id, data });
      this.handleStartGame(socket, data);
    });

    // Drawing events
    socket.on('draw_start', (data) => this.handleDrawStart(socket, data));
    socket.on('draw_move', (data) => this.handleDrawMove(socket, data));
    socket.on('draw_end', (data) => this.handleDrawEnd(socket, data));
    socket.on('clear_canvas', (data) => this.handleClearCanvas(socket, data));
    socket.on('get_drawing_history', (data) => this.handleGetDrawingHistory(socket, data));

    // Cursor events
    socket.on('cursor_move', (data) => this.handleCursorMove(socket, data));

    // Voice chat signaling events
    socket.on('voice_offer', (data) => this.handleVoiceOffer(socket, data));
    socket.on('voice_answer', (data) => this.handleVoiceAnswer(socket, data));
    socket.on('voice_ice_candidate', (data) => this.handleVoiceIceCandidate(socket, data));
    socket.on('voice_toggle', (data) => this.handleVoiceToggle(socket, data));

    // Game end events
    socket.on('submit_drawing', (data) => this.handleSubmitDrawing(socket, data));

    // Connection events
    socket.on('disconnect', () => this.handleDisconnect(socket));
    socket.on('reconnect_attempt', (data) => this.handleReconnect(socket, data));

    // Heartbeat for connection monitoring
    socket.on('ping', () => socket.emit('pong'));
  }

  // Handle joining a lobby
  async handleJoinLobby(socket, data) {
    console.log(`🔌 [SOCKET] handleJoinLobby called:`, { socketId: socket.id, data });
    
    try {
      const { lobbyCode, playerName } = data;
      
      if (!lobbyCode || !playerName) {
        console.log(`❌ [SOCKET] Missing data:`, { lobbyCode, playerName });
        socket.emit('error', { 
          error: 'INVALID_INPUT',
          message: 'Please provide both lobby code and player name to join the game.'
        });
        return;
      }

      // Validate input format
      if (lobbyCode.length !== 6) {
        socket.emit('error', { 
          error: 'INVALID_LOBBY_CODE',
          message: 'Lobby code must be exactly 6 characters long.'
        });
        return;
      }

      if (playerName.trim().length < 2) {
        socket.emit('error', { 
          error: 'INVALID_PLAYER_NAME',
          message: 'Player name must be at least 2 characters long.'
        });
        return;
      }

      if (playerName.trim().length > 20) {
        socket.emit('error', { 
          error: 'INVALID_PLAYER_NAME',
          message: 'Player name must be 20 characters or less.'
        });
        return;
      }

      // Check if this socket is already in a lobby to prevent duplicate joins
      if (socket.lobbyCode === lobbyCode && socket.playerName === playerName) {
        console.log(`⚠️ [SOCKET] Socket ${socket.id} already in lobby ${lobbyCode} as ${playerName}, ignoring duplicate join`);
        return;
      }

      console.log(`🎮 [SOCKET] Attempting to join lobby ${lobbyCode} with player ${playerName}`);

      // Check if MongoDB is available
      const mongoose = require('mongoose');
      let result;
      let isNewPlayer = false;
      
      if (mongoose.connection.readyState !== 1) {
        console.log(`💾 [SOCKET] Using memory storage for lobby ${lobbyCode}`);
        
        // Use memory storage for development
        const game = memoryStorage.getGame(lobbyCode);
        
        if (!game) {
          console.log(`❌ [SOCKET] Game not found: ${lobbyCode}`);
          socket.emit('error', { 
            error: 'GAME_NOT_FOUND',
            message: 'This game lobby doesn\'t exist. Please check the lobby code and try again.'
          });
          return;
        }

        console.log(`📊 [SOCKET] Current game state:`, {
          lobbyCode: game.lobbyCode,
          status: game.status,
          playersCount: game.players.length,
          players: game.players.map(p => ({ name: p.name, socketId: p.socketId }))
        });

        if (game.status !== 'waiting') {
          console.log(`❌ [SOCKET] Game already started: ${lobbyCode}`);
          socket.emit('error', { 
            error: 'GAME_ALREADY_STARTED',
            message: 'This game has already started. You can\'t join a game in progress.'
          });
          return;
        }

        // Check if this socket is already in the game (prevent duplicates)
        const existingPlayer = game.players.find(p => p.socketId === socket.id);
        if (existingPlayer) {
          console.log(`🔄 [SOCKET] Player reconnecting:`, existingPlayer);
          // Player is already in the game, just update their socket connection
          result = {
            game: {
              lobbyCode: game.lobbyCode,
              status: game.status,
              players: game.players,
              gameSettings: game.gameSettings
            },
            player: existingPlayer
          };
          isNewPlayer = false;
        } else {
          console.log(`➕ [SOCKET] Adding new player to game`);
          // Add new player
          try {
            const newPlayer = memoryStorage.addPlayerToGame(lobbyCode, {
              name: playerName,
              socketId: socket.id
            });

            console.log(`✅ [SOCKET] Player added successfully:`, newPlayer);

            const updatedGame = memoryStorage.getGame(lobbyCode);
            console.log(`📊 [SOCKET] Updated game state:`, {
              lobbyCode: updatedGame.lobbyCode,
              playersCount: updatedGame.players.length,
              players: updatedGame.players.map(p => ({ name: p.name, color: p.color, isHost: p.isHost }))
            });

            result = {
              game: {
                lobbyCode: updatedGame.lobbyCode,
                status: updatedGame.status,
                players: updatedGame.players,
                gameSettings: updatedGame.gameSettings
              },
              player: newPlayer
            };
            isNewPlayer = true;
          } catch (memoryError) {
            console.log(`❌ [SOCKET] Memory error:`, memoryError.message);
            // Handle specific memory storage errors
            if (memoryError.message === 'Game is full') {
              socket.emit('error', { 
                error: 'GAME_FULL',
                message: 'This game lobby is full. Please try joining a different game.'
              });
              return;
            }
            socket.emit('error', { 
              error: 'JOIN_FAILED',
              message: 'Failed to join the game. Please try again.'
            });
            return;
          }
        }
      } else {
        console.log(`🗄️ [SOCKET] Using database for lobby ${lobbyCode}`);
        // Use database
        result = await gameService.joinGame(lobbyCode, playerName, socket.id);
        
        // Check if this was a host reconnection (existing player with temp socket ID)
        const game = await gameService.getGameByLobbyCode(lobbyCode);
        
        // If the joining player is the host, this is not a new player
        isNewPlayer = !result.player.isHost;
        
        console.log(`👤 [SOCKET] Player join result:`, {
          playerName: result.player.name,
          isHost: result.player.isHost,
          isNewPlayer,
          socketId: result.player.socketId,
          totalPlayers: game.players.length
        });
      }
      
      console.log(`🏠 [SOCKET] Joining socket room: ${lobbyCode}`);
      // Join socket room
      socket.join(lobbyCode);
      
      // Store player info in socket
      socket.lobbyCode = lobbyCode;
      socket.playerName = playerName;
      socket.playerId = socket.id;

      console.log(`💾 [SOCKET] Socket data stored:`, {
        lobbyCode: socket.lobbyCode,
        playerName: socket.playerName,
        playerId: socket.playerId
      });

      // Map socket to player in Redis (if available)
      try {
        await redisService.mapSocketToPlayer(socket.id, lobbyCode, socket.id);
        console.log(`📝 [SOCKET] Redis mapping successful`);
      } catch (redisError) {
        console.log(`⚠️ [SOCKET] Redis not available, continuing without it`);
      }

      console.log(`📤 [SOCKET] Emitting lobby_joined to player`);
      // Emit success to the joining player
      socket.emit('lobby_joined', {
        success: true,
        game: result.game,
        player: result.player
      });

      // If game is active, send drawing history
      if (result.game.status === 'active') {
        try {
          console.log(`📚 [SOCKET] Game is active, sending drawing history`);
          // Try to get drawing history from Redis or game service
          let drawingStrokes = [];
          
          try {
            drawingStrokes = await redisService.getDrawingStrokes(lobbyCode);
          } catch (redisError) {
            console.log('Could not get drawing history from Redis');
          }
          
          if (drawingStrokes.length > 0) {
            console.log(`📤 [SOCKET] Sending ${drawingStrokes.length} drawing strokes to new player`);
            socket.emit('drawing_history', { strokes: drawingStrokes });
          }
        } catch (error) {
          console.log('Could not send drawing history:', error.message);
        }
      }

      // Only notify other players if this is a new player (not a reconnection)
      if (isNewPlayer) {
        console.log(`📢 [SOCKET] Broadcasting player_joined to room ${lobbyCode}`);
        console.log(`📢 [SOCKET] Players in room before broadcast:`, socket.adapter.rooms.get(lobbyCode));
        
        const broadcastData = {
          player: {
            name: result.player.name,
            color: result.player.color,
            isHost: result.player.isHost
          },
          playersCount: result.game.players.length
        };
        
        console.log(`📢 [SOCKET] Broadcasting data:`, broadcastData);
        
        socket.to(lobbyCode).emit('player_joined', broadcastData);

        console.log(`👤 [SOCKET] Player ${playerName} joined lobby ${lobbyCode}`);
      } else {
        console.log(`🔄 [SOCKET] Player ${playerName} reconnected to lobby ${lobbyCode}`);
      }

    } catch (error) {
      console.error('❌ [SOCKET] Join lobby error:', error);
      
      // Handle specific error codes from gameService
      let errorCode = 'JOIN_FAILED';
      let message = 'Failed to join the game. Please try again.';

      switch (error.message) {
        case 'GAME_NOT_FOUND':
          errorCode = 'GAME_NOT_FOUND';
          message = 'This game lobby doesn\'t exist. Please check the lobby code and try again.';
          break;
        case 'GAME_ALREADY_STARTED':
          errorCode = 'GAME_ALREADY_STARTED';
          message = 'This game has already started. You can\'t join a game in progress.';
          break;
        case 'GAME_FULL':
          errorCode = 'GAME_FULL';
          message = 'This game lobby is full. Please try joining a different game.';
          break;
        default:
          // Keep default values
          break;
      }

      socket.emit('error', { error: errorCode, message });
    }
  }

  // Handle leaving a lobby
  async handleLeaveLobby(socket, data) {
    try {
      const { lobbyCode } = data || {};
      const actualLobbyCode = lobbyCode || socket.lobbyCode;

      if (!actualLobbyCode) {
        return;
      }

      await this.removePlayerFromLobby(socket, actualLobbyCode);

    } catch (error) {
      console.error('Leave lobby error:', error);
      socket.emit('error', { message: error.message });
    }
  }

  // Handle starting a game
  async handleStartGame(socket, data) {
    try {
      const { lobbyCode } = data;
      
      if (!lobbyCode || socket.lobbyCode !== lobbyCode) {
        socket.emit('error', { 
          error: 'INVALID_LOBBY_CODE',
          message: 'Invalid lobby code. Please make sure you\'re in the correct game.'
        });
        return;
      }

      console.log(`🎮 [SOCKET] Start game request from ${socket.playerName} (${socket.id}) for lobby ${lobbyCode}`);

      // Check if MongoDB is available
      const mongoose = require('mongoose');
      let result;
      
      if (mongoose.connection.readyState !== 1) {
        console.log(`💾 [SOCKET] Using memory storage for start game`);
        
        const game = memoryStorage.getGame(lobbyCode);
        if (!game) {
          socket.emit('error', { 
            error: 'GAME_NOT_FOUND',
            message: 'Game not found. The lobby may have expired.'
          });
          return;
        }

        // Find the player and verify host status
        const player = game.players.find(p => p.socketId === socket.id);
        console.log(`👤 [SOCKET] Player found:`, player);
        console.log(`👥 [SOCKET] All players:`, game.players.map(p => ({ name: p.name, socketId: p.socketId, isHost: p.isHost })));
        
        if (!player) {
          socket.emit('error', { 
            error: 'PLAYER_NOT_FOUND',
            message: 'You are not registered in this game. Please rejoin the lobby.'
          });
          return;
        }

        if (!player.isHost) {
          socket.emit('error', { 
            error: 'PERMISSION_DENIED',
            message: 'Only the host can start the game.'
          });
          return;
        }

        if (game.players.length < 2) {
          socket.emit('error', { 
            error: 'INSUFFICIENT_PLAYERS',
            message: 'Need at least 2 players to start the game.'
          });
          return;
        }

        // Update game status
        game.status = 'active';
        game.gameTimer = {
          startTime: new Date(),
          endTime: new Date(Date.now() + game.gameSettings.duration * 1000),
          remainingTime: game.gameSettings.duration
        };
        
        memoryStorage.updateGame(lobbyCode, game);
        
        result = { game };
      } else {
        console.log(`🗄️ [SOCKET] Using database for start game`);
        result = await gameService.startGame(lobbyCode, socket.id);
      }

      // Start game timer
      this.startGameTimer(lobbyCode, result.game.gameTimer.endTime);

      // Notify all players in the lobby
      this.io.to(lobbyCode).emit('game_started', {
        game: result.game
      });

      console.log(`🎮 Game started in lobby ${lobbyCode} by ${socket.playerName}`);

    } catch (error) {
      console.error('Start game error:', error);
      
      // Handle specific error codes
      let errorCode = 'START_GAME_FAILED';
      let message = 'Failed to start the game. Please try again.';

      if (error.message.includes('not found')) {
        errorCode = 'GAME_NOT_FOUND';
        message = 'Game not found. The lobby may have expired.';
      } else if (error.message.includes('permission') || error.message.includes('host')) {
        errorCode = 'PERMISSION_DENIED';
        message = 'Only the host can start the game.';
      } else if (error.message.includes('players')) {
        errorCode = 'INSUFFICIENT_PLAYERS';
        message = 'Need at least 2 players to start the game.';
      }

      socket.emit('error', { error: errorCode, message });
    }
  }

  // Handle drawing start
  async handleDrawStart(socket, data) {
    try {
      const { lobbyCode, point, strokeWidth } = data;
      
      if (!this.validateDrawingData(socket, lobbyCode)) {
        return;
      }

      const strokeData = {
        points: [point],
        strokeWidth: strokeWidth || 2
      };

      // Add stroke to game
      const stroke = await gameService.addDrawingStroke(lobbyCode, socket.id, strokeData);

      // Broadcast to other players
      socket.to(lobbyCode).emit('draw_start', {
        playerId: socket.id,
        playerName: socket.playerName,
        color: stroke.color,
        point,
        strokeWidth: stroke.strokeWidth,
        strokeId: stroke._id
      });

    } catch (error) {
      console.error('Draw start error:', error);
    }
  }

  // Handle drawing move
  async handleDrawMove(socket, data) {
    try {
      const { lobbyCode, point } = data;
      
      if (!this.validateDrawingData(socket, lobbyCode)) {
        return;
      }

      // Broadcast to other players (no need to store every point)
      socket.to(lobbyCode).emit('draw_move', {
        playerId: socket.id,
        point
      });

    } catch (error) {
      console.error('Draw move error:', error);
    }
  }

  // Handle drawing end
  async handleDrawEnd(socket, data) {
    try {
      const { lobbyCode, points } = data;
      
      if (!this.validateDrawingData(socket, lobbyCode)) {
        return;
      }

      console.log(`🎨 [SOCKET] Draw end from ${socket.playerName}: ${points?.length} points`);

      // Get player info for color
      let playerColor = '#000000';
      let playerName = socket.playerName || 'Unknown';
      
      // Try to get player color from game
      try {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState === 1) {
          const game = await gameService.getGameByLobbyCode(lobbyCode);
          const player = game?.players.find(p => p.socketId === socket.id);
          if (player) {
            playerColor = player.color;
            playerName = player.name;
          }
        } else {
          // Use memory storage
          const memoryStorage = require('../utils/memoryStorage');
          const game = memoryStorage.getGame(lobbyCode);
          const player = game?.players.find(p => p.socketId === socket.id);
          if (player) {
            playerColor = player.color;
            playerName = player.name;
          }
        }
      } catch (error) {
        console.log('Could not get player color, using default');
      }

      // Store the stroke with all points
      const strokeData = {
        points: points || [],
        strokeWidth: data.strokeWidth || 2,
        color: playerColor,
        playerName: playerName
      };

      // Store in game service (this will handle both DB and memory storage)
      try {
        await gameService.addDrawingStroke(lobbyCode, socket.id, strokeData);
      } catch (error) {
        console.log('Could not store stroke in game service:', error.message);
      }

      // Broadcast complete stroke to other players with all necessary info
      socket.to(lobbyCode).emit('draw_end', {
        playerId: socket.id,
        playerName: playerName,
        color: playerColor,
        points: points,
        strokeWidth: strokeData.strokeWidth,
        timestamp: Date.now()
      });

      console.log(`📤 [SOCKET] Broadcasted stroke to ${lobbyCode}`);

    } catch (error) {
      console.error('Draw end error:', error);
    }
  }

  // Handle get drawing history request
  async handleGetDrawingHistory(socket, data) {
    try {
      const { lobbyCode } = data;
      
      if (!lobbyCode || socket.lobbyCode !== lobbyCode) {
        console.log(`❌ [SOCKET] Invalid drawing history request from ${socket.id}`);
        return;
      }

      console.log(`📚 [SOCKET] Drawing history requested for ${lobbyCode} by ${socket.playerName}`);

      let drawingStrokes = [];

      // Check if MongoDB is available
      const mongoose = require('mongoose');
      
      if (mongoose.connection.readyState !== 1) {
        console.log(`💾 [SOCKET] Using memory storage for drawing history`);
        // Use memory storage
        const memoryStorage = require('../utils/memoryStorage');
        drawingStrokes = memoryStorage.getDrawingStrokes(lobbyCode);
      } else {
        console.log(`🗄️ [SOCKET] Using database for drawing history`);
        // Try to get from Redis first, then database
        try {
          drawingStrokes = await redisService.getDrawingStrokes(lobbyCode);
        } catch (redisError) {
          console.log('Could not get drawing history from Redis, trying database');
          
          // Fallback to database
          const game = await gameService.getGameByLobbyCode(lobbyCode);
          if (game && game.drawingData) {
            drawingStrokes = game.drawingData.map(stroke => ({
              points: stroke.points,
              color: stroke.color,
              strokeWidth: stroke.strokeWidth,
              playerId: stroke.playerId,
              playerName: stroke.playerName || 'Unknown',
              timestamp: stroke.timestamp
            }));
          }
        }
      }

      console.log(`📤 [SOCKET] Sending ${drawingStrokes.length} drawing strokes to ${socket.playerName}`);
      
      // Send drawing history to the requesting player
      socket.emit('drawing_history', { 
        strokes: drawingStrokes 
      });

    } catch (error) {
      console.error('Get drawing history error:', error);
      socket.emit('error', { message: 'Failed to get drawing history' });
    }
  }

  // Handle canvas clear (host only)
  async handleClearCanvas(socket, data) {
    try {
      const { lobbyCode } = data;
      
      if (!lobbyCode || socket.lobbyCode !== lobbyCode) {
        return;
      }

      // Verify host permission
      const game = await gameService.getGameByLobbyCode(lobbyCode);
      const player = game?.players.find(p => p.socketId === socket.id);
      
      if (!player?.isHost) {
        socket.emit('error', { message: 'Only the host can clear the canvas' });
        return;
      }

      // Clear drawing data
      await redisService.clearDrawingData(lobbyCode);

      // Broadcast to all players
      this.io.to(lobbyCode).emit('canvas_cleared', {
        clearedBy: socket.playerName
      });

    } catch (error) {
      console.error('Clear canvas error:', error);
    }
  }

  // Handle cursor movement
  async handleCursorMove(socket, data) {
    try {
      const { lobbyCode, x, y } = data;
      
      if (!lobbyCode || socket.lobbyCode !== lobbyCode) {
        return;
      }

      // Update cursor position in Redis
      await redisService.updatePlayerCursor(lobbyCode, socket.id, {
        x, y,
        playerName: socket.playerName,
        timestamp: Date.now()
      });

      // Broadcast to other players
      socket.to(lobbyCode).emit('cursor_move', {
        playerId: socket.id,
        playerName: socket.playerName,
        x, y
      });

    } catch (error) {
      console.error('Cursor move error:', error);
    }
  }

  // Handle voice chat offer
  handleVoiceOffer(socket, data) {
    const { lobbyCode, targetPlayerId, offer } = data;
    
    if (!lobbyCode || socket.lobbyCode !== lobbyCode) {
      return;
    }

    socket.to(targetPlayerId).emit('voice_offer', {
      fromPlayerId: socket.id,
      fromPlayerName: socket.playerName,
      offer
    });
  }

  // Handle voice chat answer
  handleVoiceAnswer(socket, data) {
    const { lobbyCode, targetPlayerId, answer } = data;
    
    if (!lobbyCode || socket.lobbyCode !== lobbyCode) {
      return;
    }

    socket.to(targetPlayerId).emit('voice_answer', {
      fromPlayerId: socket.id,
      fromPlayerName: socket.playerName,
      answer
    });
  }

  // Handle voice ICE candidate
  handleVoiceIceCandidate(socket, data) {
    const { lobbyCode, targetPlayerId, candidate } = data;
    
    if (!lobbyCode || socket.lobbyCode !== lobbyCode) {
      return;
    }

    socket.to(targetPlayerId).emit('voice_ice_candidate', {
      fromPlayerId: socket.id,
      candidate
    });
  }

  // Handle voice toggle (mute/unmute)
  handleVoiceToggle(socket, data) {
    const { lobbyCode, isMuted } = data;
    
    if (!lobbyCode || socket.lobbyCode !== lobbyCode) {
      return;
    }

    socket.to(lobbyCode).emit('player_voice_toggle', {
      playerId: socket.id,
      playerName: socket.playerName,
      isMuted
    });
  }

  // Handle drawing submission
  async handleSubmitDrawing(socket, data) {
    try {
      const { lobbyCode, canvasDataUrl } = data;
      
      if (!lobbyCode || socket.lobbyCode !== lobbyCode) {
        socket.emit('error', { message: 'Invalid lobby code' });
        return;
      }

      // Verify host permission
      const game = await gameService.getGameByLobbyCode(lobbyCode);
      const player = game?.players.find(p => p.socketId === socket.id);
      
      if (!player?.isHost) {
        socket.emit('error', { message: 'Only the host can submit the drawing' });
        return;
      }

      // Submit drawing for AI analysis
      const result = await gameService.submitFinalDrawing(lobbyCode, canvasDataUrl);

      // Stop game timer
      this.stopGameTimer(lobbyCode);

      // Notify all players
      this.io.to(lobbyCode).emit('game_finished', {
        gameId: result.gameId,
        message: 'Drawing submitted for AI analysis'
      });

      // Send AI results when ready
      if (result.aiResult) {
        setTimeout(() => {
          this.io.to(lobbyCode).emit('ai_results_ready', {
            aiResult: result.aiResult
          });
        }, 2000); // Small delay for dramatic effect
      }

      console.log(`🎨 Drawing submitted for lobby ${lobbyCode}`);

    } catch (error) {
      console.error('Submit drawing error:', error);
      socket.emit('error', { message: error.message });
    }
  }

  // Handle reconnection
  async handleReconnect(socket, data) {
    try {
      const { lobbyCode, playerName } = data;
      
      if (!lobbyCode || !playerName) {
        socket.emit('error', { message: 'Lobby code and player name are required for reconnection' });
        return;
      }

      // Try to update player socket ID
      const player = await gameService.updatePlayerSocketId(lobbyCode, 'old-socket-id', socket.id);
      
      if (player) {
        socket.join(lobbyCode);
        socket.lobbyCode = lobbyCode;
        socket.playerName = playerName;
        socket.playerId = socket.id;

        // Update Redis mapping
        await redisService.mapSocketToPlayer(socket.id, lobbyCode, socket.id);

        // Get current game state
        const game = await gameService.getGameByLobbyCode(lobbyCode);
        
        socket.emit('reconnected', {
          success: true,
          game: {
            lobbyCode: game.lobbyCode,
            status: game.status,
            players: game.players.map(p => ({
              name: p.name,
              color: p.color,
              isHost: p.isHost
            })),
            prompt: game.promptText,
            gameTimer: game.gameTimer
          },
          player
        });

        // Get drawing history
        const drawingStrokes = await redisService.getDrawingStrokes(lobbyCode);
        if (drawingStrokes.length > 0) {
          socket.emit('drawing_history', { strokes: drawingStrokes });
        }

        console.log(`🔄 Player ${playerName} reconnected to lobby ${lobbyCode}`);
      }

    } catch (error) {
      console.error('Reconnect error:', error);
      socket.emit('error', { message: 'Failed to reconnect' });
    }
  }

  // Handle disconnection
  async handleDisconnect(socket) {
    try {
      console.log(`🔌 Client disconnected: ${socket.id}`);

      if (socket.lobbyCode) {
        await this.removePlayerFromLobby(socket, socket.lobbyCode);
      }

      // Clean up Redis mappings
      await redisService.removeSocketMapping(socket.id);
      
      if (socket.lobbyCode) {
        await redisService.removePlayerCursor(socket.lobbyCode, socket.id);
      }

    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }

  // Helper: Remove player from lobby
  async removePlayerFromLobby(socket, lobbyCode) {
    try {
      const removedPlayer = await gameService.removePlayerFromGame(lobbyCode, socket.id);
      
      if (removedPlayer) {
        // Leave socket room
        socket.leave(lobbyCode);
        
        // Notify other players
        socket.to(lobbyCode).emit('player_left', {
          player: {
            name: removedPlayer.name,
            color: removedPlayer.color
          },
          message: `${removedPlayer.name} left the game`
        });

        // If game becomes empty, stop timer
        const game = await gameService.getGameByLobbyCode(lobbyCode);
        if (!game || game.players.length === 0) {
          this.stopGameTimer(lobbyCode);
        }

        console.log(`👤 Player ${socket.playerName} left lobby ${lobbyCode}`);
      }
    } catch (error) {
      console.error('Remove player error:', error);
    }
  }

  // Helper: Validate drawing data
  validateDrawingData(socket, lobbyCode) {
    if (!lobbyCode || socket.lobbyCode !== lobbyCode) {
      socket.emit('error', { message: 'Invalid lobby code' });
      return false;
    }
    return true;
  }

  // Start game timer
  startGameTimer(lobbyCode, endTime) {
    // Clear existing timer if any
    this.stopGameTimer(lobbyCode);

    const timer = setInterval(async () => {
      const now = new Date();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));

      if (remaining <= 0) {
        // Time's up!
        this.io.to(lobbyCode).emit('game_time_up', {
          message: 'Time is up! Please submit your drawing.'
        });
        this.stopGameTimer(lobbyCode);
      } else {
        // Send timer update
        this.io.to(lobbyCode).emit('timer_update', {
          remainingTime: remaining
        });

        // Update Redis
        await redisService.updateRemainingTime(lobbyCode, remaining);
      }
    }, 1000);

    this.gameTimers.set(lobbyCode, timer);
    console.log(`⏰ Timer started for lobby ${lobbyCode}`);
  }

  // Stop game timer
  stopGameTimer(lobbyCode) {
    const timer = this.gameTimers.get(lobbyCode);
    if (timer) {
      clearInterval(timer);
      this.gameTimers.delete(lobbyCode);
      console.log(`⏰ Timer stopped for lobby ${lobbyCode}`);
    }
  }

  // Clean up all timers
  cleanup() {
    for (const [lobbyCode, timer] of this.gameTimers) {
      clearInterval(timer);
    }
    this.gameTimers.clear();
  }
}

// Initialize socket handlers
function initializeSocketHandlers(io) {
  const gameSocketHandler = new GameSocketHandler(io);

  io.on('connection', (socket) => {
    gameSocketHandler.initializeHandlers(socket);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    gameSocketHandler.cleanup();
  });

  return gameSocketHandler;
}

module.exports = { initializeSocketHandlers, GameSocketHandler };