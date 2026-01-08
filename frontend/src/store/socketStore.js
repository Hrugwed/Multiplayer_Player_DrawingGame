import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'

const useSocketStore = create(
  devtools(
    (set, get) => ({
      // State
      socket: null,
      isConnected: false,
      connectionError: null,
      
      // Actions
      connect: () => {
        const existingSocket = get().socket
        if (existingSocket?.connected) {
          return existingSocket
        }
        
        const socket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:3001', {
          transports: ['websocket', 'polling'],
          timeout: 20000,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000
        })
        
        // Connection events
        socket.on('connect', () => {
          console.log('🔌 Connected to server:', socket.id)
          set({ 
            socket, 
            isConnected: true, 
            connectionError: null 
          })
        })
        
        socket.on('disconnect', (reason) => {
          console.log('🔌 Disconnected from server:', reason)
          set({ isConnected: false })
          
          if (reason === 'io server disconnect') {
            // Server disconnected, try to reconnect
            socket.connect()
          }
        })
        
        socket.on('connect_error', (error) => {
          console.error('🔌 Connection error:', error)
          set({ 
            connectionError: error.message,
            isConnected: false 
          })
        })
        
        socket.on('reconnect', (attemptNumber) => {
          console.log('🔌 Reconnected after', attemptNumber, 'attempts')
          toast.success('Reconnected to server!')
        })
        
        socket.on('reconnect_error', (error) => {
          console.error('🔌 Reconnection error:', error)
        })
        
        socket.on('reconnect_failed', () => {
          console.error('🔌 Failed to reconnect')
          toast.error('Failed to reconnect to server')
        })
        
        // Error handling
        socket.on('error', (error) => {
          console.error('Socket error:', error)
          toast.error(error.message || 'Socket error occurred')
        })
        
        set({ socket })
        return socket
      },
      
      disconnect: () => {
        const socket = get().socket
        if (socket) {
          socket.disconnect()
          set({ 
            socket: null, 
            isConnected: false, 
            connectionError: null 
          })
        }
      },
      
      // Emit events
      emit: (event, data) => {
        const socket = get().socket
        if (socket?.connected) {
          socket.emit(event, data)
        } else {
          console.warn('Socket not connected, cannot emit:', event)
        }
      },
      
      // Listen to events
      on: (event, callback) => {
        const socket = get().socket
        if (socket) {
          // Only log important events, not cursor/draw moves
          if (!['cursor_move', 'draw_move'].includes(event)) {
            console.log(`👂 [FRONTEND] Listening to event: ${event}`);
          }
          socket.on(event, (data) => {
            // Only log important events, not cursor/draw moves
            if (!['cursor_move', 'draw_move'].includes(event)) {
              console.log(`📥 [FRONTEND] Received event ${event}:`, data);
            }
            callback(data);
          });
        }
      },
      
      // Remove event listeners
      off: (event, callback) => {
        const socket = get().socket
        if (socket) {
          socket.off(event, callback)
        }
      },
      
      // Game-specific socket methods
      joinLobby: (lobbyCode, playerName) => {
        console.log(`📤 [FRONTEND] Emitting join_lobby:`, { lobbyCode, playerName });
        get().emit('join_lobby', { lobbyCode, playerName });
      },
      
      leaveLobby: (lobbyCode) => {
        get().emit('leave_lobby', { lobbyCode })
      },
      
      startGame: (lobbyCode) => {
        get().emit('start_game', { lobbyCode })
      },
      
      // Drawing events
      drawStart: (lobbyCode, point, strokeWidth) => {
        get().emit('draw_start', { lobbyCode, point, strokeWidth })
      },
      
      drawMove: (lobbyCode, point) => {
        get().emit('draw_move', { lobbyCode, point })
      },
      
      drawEnd: (lobbyCode, points) => {
        get().emit('draw_end', { lobbyCode, points })
      },
      
      clearCanvas: (lobbyCode) => {
        get().emit('clear_canvas', { lobbyCode })
      },
      
      // Cursor events
      moveCursor: (lobbyCode, x, y) => {
        get().emit('cursor_move', { lobbyCode, x, y })
      },
      
      // Voice chat events
      sendVoiceOffer: (lobbyCode, targetPlayerId, offer) => {
        get().emit('voice_offer', { lobbyCode, targetPlayerId, offer })
      },
      
      sendVoiceAnswer: (lobbyCode, targetPlayerId, answer) => {
        get().emit('voice_answer', { lobbyCode, targetPlayerId, answer })
      },
      
      sendVoiceIceCandidate: (lobbyCode, targetPlayerId, candidate) => {
        get().emit('voice_ice_candidate', { lobbyCode, targetPlayerId, candidate })
      },
      
      toggleVoice: (lobbyCode, isMuted) => {
        get().emit('voice_toggle', { lobbyCode, isMuted })
      },
      
      // Game end events
      submitDrawing: (lobbyCode, canvasDataUrl) => {
        get().emit('submit_drawing', { lobbyCode, canvasDataUrl })
      },
      
      // Get drawing history
      getDrawingHistory: (lobbyCode) => {
        get().emit('get_drawing_history', { lobbyCode })
      },
      
      // Utility methods
      isSocketConnected: () => {
        const socket = get().socket
        return socket?.connected || false
      },
      
      getSocketId: () => {
        const socket = get().socket
        return socket?.id || null
      },
      
      // Reconnection handling
      attemptReconnect: (lobbyCode, playerName) => {
        const socket = get().socket
        if (socket) {
          socket.emit('reconnect_attempt', { lobbyCode, playerName })
        }
      }
    }),
    {
      name: 'socket-store'
    }
  )
)

export { useSocketStore }