import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useGameStore } from './store/gameStore'
import { useSocketStore } from './store/socketStore'

// Pages
import HomePage from './pages/HomePage'
import LobbyPage from './pages/LobbyPage'
import GamePage from './pages/GamePage'
import ResultsPage from './pages/ResultsPage'

// Components
import LoadingScreen from './components/LoadingScreen'
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  const { isConnected, connect, disconnect } = useSocketStore()
  const { currentGame, isLoading } = useGameStore()
  const location = useLocation()

  // Determine if current page should be scrollable
  const isHomePage = location.pathname === '/'
  const appOverflow = isHomePage ? 'auto' : 'hidden'

  useEffect(() => {
    // Initialize socket connection
    connect()

    // Cleanup on unmount
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  // Update body overflow based on current page
  useEffect(() => {
    document.body.style.overflow = appOverflow
    document.documentElement.style.overflow = appOverflow
    
    return () => {
      // Cleanup on unmount
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    }
  }, [appOverflow])

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <ErrorBoundary>
      <div className="app" style={{ 
        height: isHomePage ? 'auto' : '100vh', 
        minHeight: isHomePage ? '100vh' : 'auto',
        overflow: appOverflow 
      }}>
        <Routes>
          {/* Home page - Create or join game */}
          <Route path="/" element={<HomePage />} />
          
          {/* Lobby page - Wait for players */}
          <Route 
            path="/lobby/:lobbyCode" 
            element={
              currentGame ? <LobbyPage /> : <Navigate to="/" replace />
            } 
          />
          
          {/* Game page - Drawing canvas */}
          <Route 
            path="/game/:lobbyCode" 
            element={
              currentGame && (currentGame.status === 'active' || currentGame.status === 'starting') ? 
                <GamePage /> : 
                <Navigate to={`/lobby/${currentGame?.lobbyCode || ''}`} replace />
            } 
          />
          
          {/* Results page - AI feedback */}
          <Route 
            path="/results/:lobbyCode" 
            element={
              currentGame?.status === 'finished' ? 
                <ResultsPage /> : 
                <Navigate to="/" replace />
            } 
          />
          
          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        
        {/* Connection status indicator */}
        {!isConnected && (
          <div className="connection-status">
            <div className="connection-indicator offline">
              <span>Reconnecting...</span>
              <div className="loading-spinner"></div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}

export default App