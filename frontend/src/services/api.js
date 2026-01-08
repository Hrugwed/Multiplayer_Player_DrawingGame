import axios from 'axios'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Debug: Log the base URL (remove in production)
if (import.meta.env.DEV) {
  console.log('API Base URL:', import.meta.env.VITE_API_URL || 'http://localhost:3001/api');
}

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add any auth headers or request modifications here
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    // Handle common errors
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response
      
      switch (status) {
        case 400:
          console.error('Bad Request:', data.error)
          break
        case 404:
          console.error('Not Found:', data.error)
          break
        case 409:
          console.error('Conflict:', data.error)
          break
        case 500:
          console.error('Server Error:', data.error)
          break
        default:
          console.error('API Error:', data.error || 'Unknown error')
      }
    } else if (error.request) {
      // Network error
      console.error('Network Error:', error.message)
    } else {
      // Other error
      console.error('Error:', error.message)
    }
    
    return Promise.reject(error)
  }
)

// Game API endpoints
export const gameAPI = {
  // Create a new game
  createGame: (playerName, gameSettings = {}) => {
    return api.post('/game/create', {
      playerName,
      gameSettings
    })
  },
  
  // Join an existing game
  joinGame: (lobbyCode, playerName) => {
    return api.post('/game/join', {
      lobbyCode,
      playerName
    })
  },
  
  // Get game status
  getGameStatus: (lobbyCode) => {
    return api.get(`/game/${lobbyCode}/status`)
  },
  
  // Start game (host only)
  startGame: (lobbyCode, socketId) => {
    return api.post(`/game/${lobbyCode}/start`, {
      socketId
    })
  },
  
  // Submit final drawing
  submitDrawing: (lobbyCode, canvasDataUrl) => {
    return api.post(`/game/${lobbyCode}/submit`, {
      canvasDataUrl
    })
  },
  
  // Get game results
  getGameResults: (lobbyCode) => {
    return api.get(`/game/${lobbyCode}/results`)
  },
  
  // Leave game
  leaveGame: (lobbyCode, socketId) => {
    return api.post(`/game/${lobbyCode}/leave`, {
      socketId
    })
  },
  
  // Get active games (admin)
  getActiveGames: () => {
    return api.get('/game')
  }
}

// Prompt API endpoints
export const promptAPI = {
  // Get random prompt
  getRandomPrompt: (difficulty = null) => {
    const params = difficulty ? { difficulty } : {}
    return api.get('/prompts/random', { params })
  },
  
  // Get all prompts
  getAllPrompts: (params = {}) => {
    return api.get('/prompts', { params })
  },
  
  // Create new prompt (admin)
  createPrompt: (promptData) => {
    return api.post('/prompts', promptData)
  },
  
  // Update prompt (admin)
  updatePrompt: (id, updates) => {
    return api.put(`/prompts/${id}`, updates)
  },
  
  // Delete prompt (admin)
  deletePrompt: (id) => {
    return api.delete(`/prompts/${id}`)
  },
  
  // Get prompt statistics
  getPromptStats: () => {
    return api.get('/prompts/stats')
  },
  
  // Seed initial prompts (development)
  seedPrompts: () => {
    return api.post('/prompts/seed')
  }
}

// Utility functions
export const apiUtils = {
  // Check if error is network related
  isNetworkError: (error) => {
    return !error.response && error.request
  },
  
  // Check if error is server error (5xx)
  isServerError: (error) => {
    return error.response && error.response.status >= 500
  },
  
  // Check if error is client error (4xx)
  isClientError: (error) => {
    return error.response && error.response.status >= 400 && error.response.status < 500
  },
  
  // Get error message from error object
  getErrorMessage: (error) => {
    if (error.response?.data?.error) {
      return error.response.data.error
    }
    if (error.message) {
      return error.message
    }
    return 'An unknown error occurred'
  },
  
  // Retry function for failed requests
  retry: async (fn, retries = 3, delay = 1000) => {
    try {
      return await fn()
    } catch (error) {
      if (retries > 0 && (apiUtils.isNetworkError(error) || apiUtils.isServerError(error))) {
        await new Promise(resolve => setTimeout(resolve, delay))
        return apiUtils.retry(fn, retries - 1, delay * 2)
      }
      throw error
    }
  }
}

export default api