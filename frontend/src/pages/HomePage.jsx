import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { useSocketStore } from '../store/socketStore'
import { Palette, Users, Zap, Mic, HelpCircle, X } from 'lucide-react'
import { Button, Card, Input } from 'pixel-retroui'
import toast from 'react-hot-toast'

const HomePage = () => {
  const navigate = useNavigate()
  const { createGame, joinGame, isLoading } = useGameStore()
  const { isConnected } = useSocketStore()
  
  const [activeTab, setActiveTab] = useState('create')
  const [playerName, setPlayerName] = useState('')
  const [lobbyCode, setLobbyCode] = useState('')
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [gameSettings, setGameSettings] = useState({
    duration: 300, // 5 minutes
    canvasWidth: 800,
    canvasHeight: 600
  })

  const handleCreateGame = async (e) => {
    e.preventDefault()
    
    if (!playerName.trim()) {
      toast.error('Please enter your name to create a game')
      return
    }
    
    if (playerName.trim().length < 2) {
      toast.error('Your name must be at least 2 characters long')
      return
    }
    
    if (playerName.trim().length > 20) {
      toast.error('Your name must be 20 characters or less')
      return
    }
    
    if (!isConnected) {
      toast.error('Not connected to server. Please wait and try again.')
      return
    }

    try {
      const lobbyCode = await createGame(playerName.trim(), gameSettings)
      navigate(`/lobby/${lobbyCode}`)
    } catch (error) {
      console.error('Failed to create game:', error)
      // Error message is already shown by the store
    }
  }

  const handleJoinGame = async (e) => {
    e.preventDefault()
    
    if (!playerName.trim()) {
      toast.error('Please enter your name to join a game')
      return
    }
    
    if (playerName.trim().length < 2) {
      toast.error('Your name must be at least 2 characters long')
      return
    }
    
    if (playerName.trim().length > 20) {
      toast.error('Your name must be 20 characters or less')
      return
    }
    
    if (!lobbyCode.trim()) {
      toast.error('Please enter a lobby code to join a game')
      return
    }
    
    if (lobbyCode.trim().length !== 6) {
      toast.error('Lobby code must be exactly 6 characters')
      return
    }
    
    if (!isConnected) {
      toast.error('Not connected to server. Please wait and try again.')
      return
    }

    try {
      await joinGame(lobbyCode.trim().toUpperCase(), playerName.trim())
      navigate(`/lobby/${lobbyCode.trim().toUpperCase()}`)
    } catch (error) {
      console.error('Failed to join game:', error)
      // Error message is already shown by the store
    }
  }

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  }

  return (
    <div className="home-page">
      <div className="container">
        <div className="home-content">
          {/* Header */}
          <div className="home-header text-center mb-8">
            <div className="logo mb-4">
              <Palette size={48} className="text-inverse mx-auto mb-2" />
              <div className="title-with-help">
                <h1 className="text-inverse mb-2 font-minecraft">Collaborative Drawing Game</h1>
                <Button
                  onClick={() => setShowHowToPlay(true)}
                  className="help-button"
                  variant="secondary"
                  size="sm"
                  title="How to Play"
                >
                  <HelpCircle size={16} />
                </Button>
              </div>
              <p className="text-inverse opacity-90">
                Draw together, laugh together, get roasted by AI together!
              </p>
            </div>
          </div>

          {/* Features */}
          {/* <div className="features-grid mb-8">
            <div className="feature-card">
              <Users className="feature-icon" />
              <h3>Up to 4 Players</h3>
              <p>Collaborate with friends in real-time</p>
            </div>
            <div className="feature-card">
              <Palette className="feature-icon" />
              <h3>Shared Canvas</h3>
              <p>Draw together on the same canvas</p>
            </div>
            <div className="feature-card">
              <Mic className="feature-icon" />
              <h3>Voice Chat</h3>
              <p>Talk while you draw</p>
            </div>
            <div className="feature-card">
              <Zap className="feature-icon" />
              <h3>AI Judging</h3>
              <p>Get hilarious AI feedback</p>
            </div>
          </div> */}

          {/* Main Content - Game Form and Right Sidebar */}
          <div className="main-content-grid">
            {/* Game Form */}
            <div className="game-form-container">
              <Card className="retro-card">
                <div className="card-header">
                  <div className="tab-buttons">
                    <Button
                      variant={activeTab === 'create' ? 'primary' : 'secondary'}
                      className={`tab-button ${activeTab === 'create' ? 'active' : ''}`}
                      onClick={() => setActiveTab('create')}
                    >
                      Create Game
                    </Button>
                    <Button
                      variant={activeTab === 'join' ? 'primary' : 'secondary'}
                      className={`tab-button ${activeTab === 'join' ? 'active' : ''}`}
                      onClick={() => setActiveTab('join')}
                    >
                      Join Game
                    </Button>
                  </div>
                </div>

                <div className="card-body">
                  {activeTab === 'create' ? (
                    <form onSubmit={handleCreateGame} className="game-form">
                      <div className="form-group">
                        <label className="form-label font-minecraft">Your Name</label>
                        <Input
                          type="text"
                          placeholder="Enter your name"
                          value={playerName}
                          onChange={(e) => setPlayerName(e.target.value)}
                          maxLength={20}
                          required
                          className="retro-input"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label font-minecraft">Game Duration</label>
                        <select
                          value={gameSettings.duration}
                          onChange={(e) => setGameSettings({
                            ...gameSettings,
                            duration: parseInt(e.target.value)
                          })}
                          className="retro-select"
                        >
                          <option value={180}>3 minutes</option>
                          <option value={300}>5 minutes</option>
                          <option value={600}>10 minutes</option>
                          <option value={900}>15 minutes</option>
                        </select>
                        <small className="text-secondary">
                          How long players have to draw
                        </small>
                      </div>

                      <div className="form-group">
                        <label className="form-label font-minecraft">Canvas Size</label>
                        <select
                          value={`${gameSettings.canvasWidth}x${gameSettings.canvasHeight}`}
                          onChange={(e) => {
                            const [width, height] = e.target.value.split('x').map(Number)
                            setGameSettings({
                              ...gameSettings,
                              canvasWidth: width,
                              canvasHeight: height
                            })
                          }}
                          className="retro-select"
                        >
                          <option value="800x600">800 x 600 (Standard)</option>
                          <option value="1024x768">1024 x 768 (Large)</option>
                          <option value="1200x800">1200 x 800 (Wide)</option>
                        </select>
                      </div>

                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full retro-button"
                        disabled={isLoading || !isConnected}
                        loading={isLoading ? "true" : undefined}
                      >
                        {isLoading ? 'Creating Game...' : 'Create Game'}
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleJoinGame} className="game-form">
                      <div className="form-group">
                        <label className="form-label font-minecraft">Your Name</label>
                        <Input
                          type="text"
                          placeholder="Enter your name"
                          value={playerName}
                          onChange={(e) => setPlayerName(e.target.value)}
                          maxLength={20}
                          required
                          className="retro-input"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label font-minecraft">Lobby Code</label>
                        <Input
                          type="text"
                          placeholder="Enter 6-character code"
                          value={lobbyCode}
                          onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                          maxLength={6}
                          required
                          className="retro-input lobby-code-input"
                        />
                        <small className="text-secondary">
                          Get this code from the game host
                        </small>
                      </div>

                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full retro-button"
                        disabled={isLoading || !isConnected}
                        loading={isLoading ? "true" : undefined}
                      >
                        {isLoading ? 'Joining Game...' : 'Join Game'}
                      </Button>
                    </form>
                  )}

                  {!isConnected && (
                    <div className="connection-warning">
                      <p className="text-warning text-center">
                        Connecting to server...
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Right Sidebar - Features Only */}
            <div className="right-sidebar">
              {/* Features Grid */}
              <div className="sidebar-features">
                <Card className="retro-card">
                  <div className="card-header">
                    <h3 className="font-minecraft">Game Features</h3>
                  </div>
                  <div className="card-body">
                    <div className="sidebar-features-grid">
                      <div className="sidebar-feature-card">
                        <Users className="sidebar-feature-icon" />
                        <div className="sidebar-feature-content">
                          <h4>Up to 4 Players</h4>
                          <p>Collaborate with friends in real-time</p>
                        </div>
                      </div>
                      <div className="sidebar-feature-card">
                        <Palette className="sidebar-feature-icon" />
                        <div className="sidebar-feature-content">
                          <h4>Shared Canvas</h4>
                          <p>Draw together on the same canvas</p>
                        </div>
                      </div>
                      <div className="sidebar-feature-card">
                        <Mic className="sidebar-feature-icon" />
                        <div className="sidebar-feature-content">
                          <h4>Voice Chat</h4>
                          <p>Talk while you draw</p>
                        </div>
                      </div>
                      <div className="sidebar-feature-card">
                        <Zap className="sidebar-feature-icon" />
                        <div className="sidebar-feature-content">
                          <h4>AI Judging</h4>
                          <p>Get hilarious AI feedback</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How to Play Modal */}
      {showHowToPlay && (
        <div className="modal-overlay" onClick={() => setShowHowToPlay(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="font-minecraft">How to Play</h2>
              <Button
                onClick={() => setShowHowToPlay(false)}
                className="close-button"
                variant="primary"
              >
                CLOSE
              </Button>
            </div>
            <div className="modal-body">
              <div className="steps-grid">
                <div className="step">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <h4 className="font-minecraft">Create or Join</h4>
                    <p>Start a new game or join with a lobby code from a friend</p>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <h4 className="font-minecraft">Wait for Players</h4>
                    <p>Up to 4 players can join your lobby. Share the lobby code with friends!</p>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <h4 className="font-minecraft">Draw Together</h4>
                    <p>Collaborate on the same canvas with your assigned color. You'll get a drawing prompt to work on together.</p>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">4</div>
                  <div className="step-content">
                    <h4 className="font-minecraft">Get AI Feedback</h4>
                    <p>Receive humorous AI analysis of your masterpiece with scores and roasts!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .home-page {
          min-height: 100vh;
          overflow-y: auto;
          display: flex;
          align-items: center;
          padding: 2rem 0;
        }

        .home-content {
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          padding: 0 1rem;
        }

        .logo {
          animation: fadeIn 0.8s ease-out;
        }

        .logo .text-inverse {
          color: var(--text-primary) !important;
          text-shadow: 0 0 15px rgba(255, 221, 68, 0.8), 2px 2px 4px rgba(0, 0, 0, 0.8) !important;
        }

        .title-with-help {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 0.5rem;
        }

        .help-button {
          font-family: 'Minecraft', monospace !important;
          padding: 0.5rem !important;
          border-radius: 50% !important;
          background: var(--retro-bg) !important;
          border: var(--retro-border) !important;
          color: var(--text-primary) !important;
          box-shadow: var(--retro-glow) !important;
        }

        .help-button:hover {
          transform: scale(1.1) !important;
          box-shadow: 0 0 20px rgba(255, 221, 68, 0.6) !important;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .feature-card {
          background: linear-gradient(135deg, rgba(255, 107, 53, 0.2), rgba(247, 147, 30, 0.2));
          backdrop-filter: blur(10px);
          border-radius: var(--radius-lg);
          padding: 1rem;
          text-align: center;
          color: var(--text-primary);
          transition: var(--transition);
          border: 2px solid var(--border-color);
          box-shadow: var(--retro-glow);
        }

        .feature-card:hover {
          transform: translateY(-2px);
          background: linear-gradient(135deg, rgba(255, 107, 53, 0.3), rgba(247, 147, 30, 0.3));
          border-color: var(--accent-color);
          box-shadow: 0 0 30px rgba(255, 221, 68, 0.4);
        }

        .feature-icon {
          width: 2rem;
          height: 2rem;
          margin: 0 auto 0.5rem;
          color: var(--accent-color);
        }

        .feature-card h3 {
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
        }

        .feature-card p {
          font-size: 0.75rem;
          opacity: 0.9;
          margin: 0;
        }

        .main-content-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .game-form-container {
          /* Game form takes left column */
        }

        .right-sidebar {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .sidebar-features {
          /* Features in sidebar */
        }

        .how-to-play {
          /* How to play in sidebar */
        }

        .sidebar-features-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;
        }

        .sidebar-feature-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: linear-gradient(135deg, rgba(255, 107, 53, 0.2), rgba(247, 147, 30, 0.2));
          border-radius: var(--radius-md);
          border: 2px solid var(--border-color);
          transition: var(--transition);
        }

        .sidebar-feature-card:hover {
          transform: translateY(-1px);
          background: linear-gradient(135deg, rgba(255, 107, 53, 0.3), rgba(247, 147, 30, 0.3));
          border-color: var(--accent-color);
          box-shadow: 0 0 15px rgba(255, 221, 68, 0.3);
        }

        .sidebar-feature-icon {
          width: 1.5rem;
          height: 1.5rem;
          color: var(--accent-color);
          flex-shrink: 0;
        }

        .sidebar-feature-content {
          flex: 1;
        }

        .sidebar-feature-content h4 {
          font-size: 0.75rem;
          margin-bottom: 0.25rem;
          color: var(--text-primary);
          font-family: 'Minecraft', monospace;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        }

        .sidebar-feature-content p {
          font-size: 0.625rem;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.4;
        }

        .retro-card {
          background: var(--retro-bg) !important;
          border: var(--retro-border) !important;
          box-shadow: var(--retro-glow) !important;
        }

        .tab-buttons {
          display: flex;
          gap: 0.5rem;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 1rem;
        }

        .tab-button {
          flex: 1;
          font-weight: 500 !important;
          transition: var(--transition);
        }

        .retro-input {
          background: var(--retro-bg) !important;
          border: var(--retro-border) !important;
          color: var(--text-primary) !important;
          font-family: 'Minecraft', monospace !important;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8) !important;
        }

        .retro-input:focus {
          box-shadow: var(--retro-glow) !important;
        }

        .retro-button {
          font-family: 'Minecraft', monospace !important;
          font-weight: bold !important;
          text-transform: uppercase !important;
          letter-spacing: 1px !important;
        }

        .game-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1rem 0;
        }

        .form-label {
          color: var(--text-primary) !important;
          font-weight: bold;
          margin-bottom: 0.25rem;
          display: block;
          font-size: 0.875rem;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        }

        .lobby-code-input {
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-size: 1rem;
          text-align: center;
        }

        .w-full {
          width: 100%;
        }

        .connection-warning {
          margin-top: 0.5rem;
          padding: 0.75rem;
          background: rgba(245, 158, 11, 0.1);
          border-radius: var(--radius-md);
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .how-to-play {
          margin-top: 1.5rem;
        }

        .steps-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }

        .step {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .step-number {
          width: 1.5rem;
          height: 1.5rem;
          background: var(--primary-color);
          color: var(--text-inverse);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.75rem;
          flex-shrink: 0;
          border: 2px solid #fff;
        }

        .step-content h4 {
          margin-bottom: 0.25rem;
          font-size: 0.875rem;
          color: var(--text-primary);
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        }

        .step-content p {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin: 0;
        }

        .home-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .home-header h1 {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .home-header p {
          font-size: 1rem;
        }

        @media (max-width: 1024px) {
          .features-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .main-content-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .right-sidebar {
            gap: 1rem;
          }

          .sidebar-features-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .home-page {
            padding: 1rem 0;
            align-items: flex-start;
          }

          .features-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
            margin-bottom: 1rem;
          }

          .feature-card {
            padding: 0.75rem;
          }

          .main-content-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .right-sidebar {
            gap: 1rem;
          }

          .sidebar-features-grid {
            grid-template-columns: 1fr;
          }

          .home-header h1 {
            font-size: 1.5rem;
          }

          .game-form {
            gap: 0.75rem;
          }
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 2rem;
        }

        .modal-content {
          background: var(--retro-bg);
          border: var(--retro-border);
          border-radius: var(--radius-lg);
          box-shadow: var(--retro-glow);
          max-width: 500px;
          width: 100%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 2px solid var(--border-color);
        }

        .modal-header h2 {
          color: var(--text-primary);
          margin: 0;
          font-size: 1.25rem;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        }

        .close-button {
          font-family: 'Minecraft', monospace !important;
          font-weight: bold !important;
          text-transform: uppercase !important;
          letter-spacing: 1px !important;
        }

        .modal-body {
          padding: 1rem;
        }

        .modal-body .steps-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }

        .modal-body .step {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .modal-body .step-number {
          width: 2rem;
          height: 2rem;
          background: var(--primary-color);
          color: var(--text-inverse);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.875rem;
          flex-shrink: 0;
          border: 2px solid #fff;
        }

        .modal-body .step-content h4 {
          margin-bottom: 0.5rem;
          font-size: 1rem;
          color: var(--text-primary);
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        }

        .modal-body .step-content p {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.5;
        }
      `}</style>
    </div>
  )
}

export default HomePage