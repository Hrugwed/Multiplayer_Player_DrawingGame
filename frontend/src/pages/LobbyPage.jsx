import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { useSocketStore } from '../store/socketStore'
import { Users, Crown, Play, Copy, Check, Mic, MicOff } from 'lucide-react'
import { Button, Card } from 'pixel-retroui'
import toast from 'react-hot-toast'

const LobbyPage = () => {
  const { lobbyCode } = useParams()
  const navigate = useNavigate()
  const { currentGame, currentPlayer, isLoading, addPlayer, updateGame, startGame: updateGameStatus } = useGameStore()
  const { socket, joinLobby, startGame, on, off } = useSocketStore()
  
  const [copied, setCopied] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(false)

  const [hasJoinedSocket, setHasJoinedSocket] = useState(false)

  useEffect(() => {
    console.log(`🏠 [LOBBY PAGE] Component mounted for lobby: ${lobbyCode}`);
    console.log(`🏠 [LOBBY PAGE] Current game:`, currentGame);
    console.log(`🏠 [LOBBY PAGE] Current player:`, currentPlayer);
    
    if (!currentGame || !currentPlayer) {
      console.log(`❌ [LOBBY PAGE] Missing game or player data, redirecting to home`);
      navigate('/')
      return
    }

    // Only join if socket is connected and we haven't joined yet
    if (socket && socket.connected && !hasJoinedSocket) {
      console.log(`🔌 [LOBBY PAGE] Socket available, joining lobby`);
      joinLobby(lobbyCode, currentPlayer.name)
      setHasJoinedSocket(true)
    } else {
      console.log(`❌ [LOBBY PAGE] Socket not available, not connected, or already joined`);
    }
  }, [lobbyCode, currentPlayer?.name, socket?.connected]) // Remove socket from dependencies to prevent re-joining

  useEffect(() => {
    if (!socket) return;

    // Socket event listeners
    const handlePlayerJoined = (data) => {
      console.log(`👤 [LOBBY PAGE] Player joined event:`, data)
      toast.success(`${data.player.name} joined the game!`)
      
      // Add the new player to the game store
      addPlayer(data.player);
    }

    const handlePlayerLeft = (data) => {
      console.log(`👋 [LOBBY PAGE] Player left event:`, data)
      toast(`${data.player.name} left the game`, { icon: '👋' })
    }

    const handleGameStarted = (data) => {
      console.log(`🎮 [LOBBY PAGE] Game started event:`, data)
      toast.success('Game is starting!')
      
      // Update the game store with the started game data
      updateGameStatus(data.game)
      
      // Navigate to the game page
      navigate(`/game/${lobbyCode}`)
    }

    const handleError = (error) => {
      console.error(`❌ [LOBBY PAGE] Socket error:`, error)
      
      // Handle specific error codes with user-friendly messages
      let errorMessage = error.message || 'An error occurred'
      
      switch (error.error) {
        case 'GAME_NOT_FOUND':
          errorMessage = 'This game lobby doesn\'t exist. Please check the lobby code.'
          break
        case 'GAME_ALREADY_STARTED':
          errorMessage = 'This game has already started. You can\'t join a game in progress.'
          break
        case 'GAME_FULL':
          errorMessage = 'This game lobby is full. Please try joining a different game.'
          break
        case 'PERMISSION_DENIED':
          errorMessage = 'Only the host can start the game.'
          break
        case 'INSUFFICIENT_PLAYERS':
          errorMessage = 'Need at least 2 players to start the game.'
          break
        case 'INVALID_LOBBY_CODE':
          errorMessage = 'Invalid lobby code. Please make sure you\'re in the correct game.'
          break
        default:
          // Use the provided message or fallback
          errorMessage = error.message || 'Something went wrong. Please try again.'
          break
      }
      
      toast.error(errorMessage)
    }

    const handleLobbyJoined = (data) => {
      console.log(`✅ [LOBBY PAGE] Lobby joined successfully:`, data)
      // Update the game store with the latest game state
      if (data.success && data.game) {
        console.log(`📊 [LOBBY PAGE] Updating game state with:`, data.game);
        updateGame(data.game);
      }
    }

    console.log(`👂 [LOBBY PAGE] Setting up event listeners`);
    // Add event listeners
    on('player_joined', handlePlayerJoined)
    on('player_left', handlePlayerLeft)
    on('game_started', handleGameStarted)
    on('error', handleError)
    on('lobby_joined', handleLobbyJoined)

    // Cleanup
    return () => {
      console.log(`🧹 [LOBBY PAGE] Cleaning up event listeners`);
      off('player_joined', handlePlayerJoined)
      off('player_left', handlePlayerLeft)
      off('game_started', handleGameStarted)
      off('error', handleError)
      off('lobby_joined', handleLobbyJoined)
    }
  }, [socket, on, off, addPlayer, updateGame, updateGameStatus, navigate, lobbyCode])

  const handleStartGame = () => {
    if (currentPlayer?.isHost && currentGame?.players?.length >= 2) {
      startGame(lobbyCode)
    }
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(lobbyCode)
      setCopied(true)
      toast.success('Lobby code copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy code')
    }
  }

  const handleLeaveGame = () => {
    navigate('/')
  }

  const toggleVoice = () => {
    setVoiceEnabled(!voiceEnabled)
    // Voice chat implementation would go here
  }

  if (!currentGame || !currentPlayer) {
    return null
  }

  const canStartGame = currentPlayer.isHost && currentGame.players.length >= 2
  const playersNeeded = Math.max(0, 2 - currentGame.players.length)

  return (
    <div className="lobby-page">
      <div className="container">
        <div className="lobby-content">
          {/* Header */}
          <div className="lobby-header">
            <div className="lobby-code-section">
              <h1 className="font-minecraft">Game Lobby</h1>
              <div className="lobby-code-display">
                <span className="lobby-code">{lobbyCode}</span>
                <Button 
                  onClick={handleCopyCode}
                  className="copy-button"
                  variant="secondary"
                  size="sm"
                  title="Copy lobby code"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </Button>
              </div>
              <p className="lobby-subtitle">
                Share this code with friends to join the game
              </p>
            </div>

            <div className="voice-controls">
              <Button
                onClick={toggleVoice}
                className={`voice-button ${voiceEnabled ? 'active' : ''}`}
                variant={voiceEnabled ? 'primary' : 'secondary'}
                title={voiceEnabled ? 'Disable voice chat' : 'Enable voice chat'}
              >
                {voiceEnabled ? <Mic size={20} /> : <MicOff size={20} />}
              </Button>
            </div>
          </div>

          {/* Players Section */}
          <div className="players-section">
            <Card className="retro-card">
              <div className="card-header">
                <div className="players-header">
                  <Users size={20} />
                  <h3 className="font-minecraft">Players ({currentGame.players.length}/4)</h3>
                </div>
              </div>
              <div className="card-body">
                <div className="players-grid">
                  {currentGame.players.map((player, index) => (
                    <div key={index} className="player-card">
                      <div 
                        className="player-color" 
                        style={{ backgroundColor: player.color }}
                      ></div>
                      <div className="player-info">
                        <span className="player-name">{player.name}</span>
                        {player.isHost && (
                          <Crown size={16} className="host-icon" />
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Empty slots */}
                  {Array.from({ length: 4 - currentGame.players.length }).map((_, index) => (
                    <div key={`empty-${index}`} className="player-card empty">
                      <div className="player-color empty"></div>
                      <div className="player-info">
                        <span className="player-name">Waiting for player...</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Game Settings */}
          <div className="game-settings">
            <Card className="retro-card">
              <div className="card-header">
                <h3 className="font-minecraft">Game Settings</h3>
              </div>
              <div className="card-body">
                <div className="settings-grid">
                  <div className="setting-item">
                    <span className="setting-label">Duration:</span>
                    <span className="setting-value">
                      {Math.floor(currentGame.gameSettings.duration / 60)} minutes
                    </span>
                  </div>
                  <div className="setting-item">
                    <span className="setting-label">Canvas Size:</span>
                    <span className="setting-value">
                      {currentGame.gameSettings.canvasWidth} × {currentGame.gameSettings.canvasHeight}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Actions */}
          <div className="lobby-actions">
            {currentPlayer.isHost ? (
              <div className="host-actions">
                {playersNeeded > 0 && (
                  <p className="players-needed font-minecraft">
                    Need {playersNeeded} more player{playersNeeded !== 1 ? 's' : ''} to start
                  </p>
                )}
                <Button
                  onClick={handleStartGame}
                  disabled={!canStartGame || isLoading}
                  variant="primary"
                  size="lg"
                  className="retro-button start-button"
                >
                  {isLoading ? (
                    <>
                      <div className="loading-spinner"></div>
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play size={20} />
                      Start Game
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="player-actions">
                <p className="waiting-message font-minecraft">
                  Waiting for {currentGame.players.find(p => p.isHost)?.name} to start the game...
                </p>
              </div>
            )}

            <Button
              onClick={handleLeaveGame}
              variant="secondary"
              className="retro-button leave-button"
            >
              Leave Game
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        .lobby-page {
          height: 100vh;
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .lobby-content {
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
          animation: fadeIn 0.5s ease-out;
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 1rem;
        }

        .lobby-header {
          text-align: center;
          margin-bottom: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          flex-shrink: 0;
        }

        .lobby-code-section {
          flex: 1;
        }

        .lobby-header h1 {
          color: var(--text-primary);
          margin-bottom: 0.5rem;
          font-size: 1.75rem;
          text-shadow: 0 0 15px rgba(255, 221, 68, 0.8), 2px 2px 4px rgba(0, 0, 0, 0.8);
        }

        .lobby-code-display {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .lobby-code {
          font-family: 'Minecraft', monospace;
          font-size: 1.5rem;
          font-weight: bold;
          color: var(--text-primary);
          background: var(--retro-bg);
          padding: 0.5rem 1rem;
          border-radius: var(--radius-md);
          letter-spacing: 0.2em;
          border: var(--retro-border);
          box-shadow: var(--retro-glow);
          text-shadow: 0 0 10px rgba(255, 221, 68, 0.8), 1px 1px 2px rgba(0, 0, 0, 0.8);
        }

        .copy-button {
          font-family: 'Minecraft', monospace !important;
        }

        .lobby-subtitle {
          color: var(--text-inverse);
          opacity: 0.8;
          margin: 0;
          font-size: 0.875rem;
        }

        .voice-controls {
          display: flex;
          gap: 0.5rem;
        }

        .voice-button {
          font-family: 'Minecraft', monospace !important;
        }

        .players-section {
          margin-bottom: 1rem;
          flex: 1;
          min-height: 0;
        }

        .retro-card {
          background: var(--retro-bg) !important;
          border: var(--retro-border) !important;
          box-shadow: var(--retro-glow) !important;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .card-header h3 {
          color: var(--text-primary) !important;
          margin: 0;
          font-size: 1rem;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        }

        .card-body {
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }

        .players-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-primary);
        }

        .players-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
          height: 100%;
        }

        .player-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: linear-gradient(135deg, rgba(255, 107, 53, 0.2), rgba(247, 147, 30, 0.2));
          border-radius: var(--radius-md);
          transition: var(--transition);
          border: 2px solid var(--border-color);
        }

        .player-card.empty {
          opacity: 0.5;
          border: 2px dashed rgba(255, 255, 255, 0.3);
          background: transparent;
        }

        .player-color {
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 50%;
          flex-shrink: 0;
          border: 2px solid #fff;
        }

        .player-color.empty {
          background: rgba(255, 255, 255, 0.3);
        }

        .player-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex: 1;
        }

        .player-name {
          font-weight: 500;
          color: var(--text-primary);
          font-family: 'Minecraft', monospace;
          font-size: 0.875rem;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        }

        .host-icon {
          color: var(--warning-color);
        }

        .game-settings {
          margin-bottom: 1rem;
          flex-shrink: 0;
        }

        .settings-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }

        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-md);
          border: 2px solid rgba(255, 255, 255, 0.2);
        }

        .setting-label {
          font-weight: 500;
          color: #fff;
          font-family: 'Minecraft', monospace;
          font-size: 0.75rem;
        }

        .setting-value {
          font-weight: 600;
          color: #fff;
          font-family: 'Minecraft', monospace;
          font-size: 0.75rem;
        }

        .lobby-actions {
          text-align: center;
          flex-shrink: 0;
        }

        .host-actions {
          margin-bottom: 0.75rem;
        }

        .players-needed {
          color: var(--text-inverse);
          margin-bottom: 0.75rem;
          font-size: 1rem;
        }

        .waiting-message {
          color: var(--text-inverse);
          margin-bottom: 0.75rem;
          font-size: 1rem;
          opacity: 0.9;
        }

        .retro-button {
          font-family: 'Minecraft', monospace !important;
          font-weight: bold !important;
          text-transform: uppercase !important;
          letter-spacing: 1px !important;
        }

        .start-button {
          margin-bottom: 0.75rem;
          padding: 0.75rem 1.5rem !important;
          font-size: 1rem !important;
        }

        .leave-button {
          margin-top: 0.5rem;
        }

        @media (max-width: 768px) {
          .lobby-header {
            flex-direction: column;
            text-align: center;
          }

          .lobby-code {
            font-size: 1.25rem;
          }

          .players-grid {
            grid-template-columns: 1fr;
          }

          .settings-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}

export default LobbyPage