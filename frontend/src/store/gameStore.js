import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import toast from 'react-hot-toast'
import { gameAPI } from '../services/api'

const useGameStore = create(
  devtools(
    (set, get) => ({
      // State
      currentGame: null,
      currentPlayer: null,
      isLoading: false,
      error: null,
      gameTimer: null,
      
      // Actions
      setLoading: (loading) => set({ isLoading: loading }),
      
      setError: (error) => {
        set({ error })
        if (error) {
          toast.error(error)
        }
      },
      
      clearError: () => set({ error: null }),
      
      // Create a new game
      createGame: async (playerName, gameSettings = {}) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await gameAPI.createGame(playerName, gameSettings)
          
          if (response.success) {
            set({
              currentGame: {
                lobbyCode: response.data.lobbyCode,
                gameId: response.data.gameId,
                status: 'waiting',
                players: [response.data.player],
                gameSettings: response.data.gameSettings,
                prompt: null,
                gameTimer: null
              },
              currentPlayer: response.data.player,
              isLoading: false
            })
            
            toast.success(response.message || `Game created! Lobby code: ${response.data.lobbyCode}`)
            return response.data.lobbyCode
          }
        } catch (error) {
          const errorData = error.response?.data
          let errorMessage = 'Failed to create game'
          
          // Handle specific error codes
          if (errorData?.error) {
            switch (errorData.error) {
              case 'INVALID_INPUT':
                errorMessage = 'Please enter a valid name and game settings.'
                break
              case 'SERVER_ERROR':
                errorMessage = 'Server error. Please try again in a moment.'
                break
              default:
                errorMessage = errorData.message || 'Failed to create game. Please try again.'
                break
            }
          }
          
          set({ error: errorMessage, isLoading: false })
          toast.error(errorMessage)
          throw error
        }
      },
      
      // Join an existing game
      joinGame: async (lobbyCode, playerName) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await gameAPI.joinGame(lobbyCode, playerName)
          
          if (response.success) {
            set({
              currentGame: response.data.game,
              currentPlayer: response.data.player,
              isLoading: false
            })
            
            toast.success(response.message || `Successfully joined game ${lobbyCode}!`)
            return response.data
          }
        } catch (error) {
          const errorData = error.response?.data
          let errorMessage = 'Failed to join game'
          
          // Handle specific error codes with user-friendly messages
          if (errorData?.error) {
            switch (errorData.error) {
              case 'GAME_NOT_FOUND':
                errorMessage = 'Game not found. Please check the lobby code and try again.'
                break
              case 'GAME_ALREADY_STARTED':
                errorMessage = 'This game has already started. You can\'t join a game in progress.'
                break
              case 'GAME_FULL':
                errorMessage = 'This game lobby is full. Please try joining a different game.'
                break
              case 'INVALID_INPUT':
                errorMessage = 'Please enter a valid name and lobby code.'
                break
              default:
                errorMessage = errorData.message || 'Failed to join game. Please try again.'
                break
            }
          }
          
          set({ error: errorMessage, isLoading: false })
          toast.error(errorMessage)
          throw error
        }
      },
      
      // Update game state (from socket events)
      updateGame: (gameData) => {
        console.log(`🔄 [GAME STORE] Updating game with:`, gameData);
        const currentGame = get().currentGame
        if (currentGame) {
          console.log(`📊 [GAME STORE] Current game before update:`, {
            lobbyCode: currentGame.lobbyCode,
            playersCount: currentGame.players.length,
            players: currentGame.players.map(p => ({ name: p.name, isHost: p.isHost }))
          });
          
          // Be careful with player data - don't override existing players unless explicitly needed
          const updatedGame = { ...currentGame };
          
          // Update all fields except players (handle players separately)
          Object.keys(gameData).forEach(key => {
            if (key !== 'players') {
              updatedGame[key] = gameData[key];
            }
          });
          
          // Only update players if the new data has more players or different structure
          if (gameData.players && gameData.players.length > currentGame.players.length) {
            console.log(`👥 [GAME STORE] Updating players array (new count: ${gameData.players.length})`);
            updatedGame.players = gameData.players;
          } else if (gameData.players) {
            console.log(`⚠️ [GAME STORE] Ignoring players update (would reduce player count from ${currentGame.players.length} to ${gameData.players.length})`);
          }
          
          console.log(`📊 [GAME STORE] Game after update:`, {
            lobbyCode: updatedGame.lobbyCode,
            playersCount: updatedGame.players.length,
            players: updatedGame.players.map(p => ({ name: p.name, isHost: p.isHost }))
          });
          
          set({ currentGame: updatedGame });
        }
      },
      
      // Add player to current game
      addPlayer: (player) => {
        console.log(`➕ [GAME STORE] Adding player:`, player);
        const currentGame = get().currentGame
        if (currentGame) {
          console.log(`📊 [GAME STORE] Current players before adding:`, currentGame.players.map(p => ({ name: p.name, socketId: p.socketId, isHost: p.isHost })));
          
          // Only check for existing player by name (not socketId, as that can change)
          const existingPlayerIndex = currentGame.players.findIndex(p => p.name === player.name);
          
          if (existingPlayerIndex === -1) {
            // This is a genuinely new player
            const updatedGame = {
              ...currentGame,
              players: [...currentGame.players, player]
            };
            console.log(`✅ [GAME STORE] Added new player. Total players now:`, updatedGame.players.length);
            console.log(`📊 [GAME STORE] Updated players:`, updatedGame.players.map(p => ({ name: p.name, isHost: p.isHost, color: p.color })));
            set({ currentGame: updatedGame });
          } else {
            console.log(`⚠️ [GAME STORE] Player with name "${player.name}" already exists at index ${existingPlayerIndex}`);
            console.log(`🔍 [GAME STORE] Existing player:`, currentGame.players[existingPlayerIndex]);
            console.log(`🔍 [GAME STORE] New player data:`, player);
            
            // Don't update existing players from player_joined events
            // This prevents overriding the host or other existing players
            console.log(`🚫 [GAME STORE] Ignoring duplicate player_joined event for existing player`);
          }
        } else {
          console.log(`❌ [GAME STORE] No current game to add player to`);
        }
      },
      
      // Remove player from current game
      removePlayer: (playerName) => {
        const currentGame = get().currentGame
        if (currentGame) {
          set({
            currentGame: {
              ...currentGame,
              players: currentGame.players.filter(p => p.name !== playerName)
            }
          })
        }
      },
      
      // Start game
      startGame: (gameData) => {
        console.log(`🎮 [GAME STORE] Starting game with data:`, gameData);
        const updatedGame = {
          ...get().currentGame,
          ...gameData,
          status: 'active'
        };
        console.log(`📊 [GAME STORE] Updated game status to:`, updatedGame.status);
        
        set({ currentGame: updatedGame });
        
        // Start local timer
        if (gameData.gameTimer) {
          get().startTimer(gameData.gameTimer);
        }
      },
      
      // Start game timer
      startTimer: (timerData) => {
        const existingTimer = get().gameTimer
        if (existingTimer) {
          clearInterval(existingTimer)
        }
        
        const endTime = new Date(timerData.endTime)
        
        const timer = setInterval(() => {
          const now = new Date()
          const remaining = Math.max(0, Math.floor((endTime - now) / 1000))
          
          const currentGame = get().currentGame
          if (currentGame) {
            set({
              currentGame: {
                ...currentGame,
                gameTimer: {
                  ...currentGame.gameTimer,
                  remainingTime: remaining
                }
              }
            })
          }
          
          if (remaining <= 0) {
            clearInterval(timer)
            set({ gameTimer: null })
          }
        }, 1000)
        
        set({ gameTimer: timer })
      },
      
      // Stop game timer
      stopTimer: () => {
        const timer = get().gameTimer
        if (timer) {
          clearInterval(timer)
          set({ gameTimer: null })
        }
      },
      
      // Update timer from socket
      updateTimer: (remainingTime) => {
        const currentGame = get().currentGame
        if (currentGame && currentGame.gameTimer) {
          set({
            currentGame: {
              ...currentGame,
              gameTimer: {
                ...currentGame.gameTimer,
                remainingTime
              }
            }
          })
        }
      },
      
      // Finish game
      finishGame: (results = null) => {
        get().stopTimer()
        
        const currentGame = get().currentGame
        if (currentGame) {
          set({
            currentGame: {
              ...currentGame,
              status: 'finished',
              results
            }
          })
        }
      },
      
      // Leave current game
      leaveGame: async () => {
        const currentGame = get().currentGame
        const currentPlayer = get().currentPlayer
        
        if (currentGame && currentPlayer) {
          try {
            await gameAPI.leaveGame(currentGame.lobbyCode, currentPlayer.socketId)
          } catch (error) {
            console.error('Error leaving game:', error)
          }
        }
        
        get().stopTimer()
        set({
          currentGame: null,
          currentPlayer: null,
          error: null
        })
      },
      
      // Reset game state
      resetGame: () => {
        get().stopTimer()
        set({
          currentGame: null,
          currentPlayer: null,
          error: null,
          isLoading: false
        })
      },
      
      // Get game status
      getGameStatus: async (lobbyCode) => {
        try {
          const response = await gameAPI.getGameStatus(lobbyCode)
          return response.data
        } catch (error) {
          console.error('Error getting game status:', error)
          throw error
        }
      },
      
      // Submit drawing
      submitDrawing: async (canvasDataUrl) => {
        const currentGame = get().currentGame
        if (!currentGame) {
          throw new Error('No active game')
        }
        
        set({ isLoading: true })
        
        try {
          const response = await gameAPI.submitDrawing(currentGame.lobbyCode, canvasDataUrl)
          
          if (response.success) {
            toast.success('Drawing submitted for AI analysis!')
            set({ isLoading: false })
            return response.data
          }
        } catch (error) {
          const errorMessage = error.response?.data?.error || 'Failed to submit drawing'
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },
      
      // Get game results
      getGameResults: async (lobbyCode) => {
        try {
          const response = await gameAPI.getGameResults(lobbyCode)
          return response.data
        } catch (error) {
          console.error('Error getting game results:', error)
          throw error
        }
      }
    }),
    {
      name: 'game-store',
      partialize: (state) => ({
        currentGame: state.currentGame,
        currentPlayer: state.currentPlayer
      })
    }
  )
)

export { useGameStore }