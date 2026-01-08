import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { Trophy, Star, Lightbulb, Target, Home, RotateCcw, Share } from 'lucide-react'
import { Button, Card } from 'pixel-retroui'
import toast from 'react-hot-toast'

const ResultsPage = () => {
  const { lobbyCode } = useParams()
  const navigate = useNavigate()
  const { currentGame, getGameResults } = useGameStore()
  
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true)
        setError(null)
        
        if (!lobbyCode) {
          throw new Error('No lobby code provided')
        }
        
        const gameResults = await getGameResults(lobbyCode)
        
        if (!gameResults) {
          throw new Error('No results found for this game')
        }
        
        setResults(gameResults)
      } catch (err) {
        console.error('Failed to fetch results:', err)
        
        let errorMessage = 'Failed to load game results'
        
        // Handle specific error types
        if (err.response?.status === 404) {
          errorMessage = 'Game results not found. The game may not have finished yet.'
        } else if (err.response?.status === 500) {
          errorMessage = 'Server error while loading results. Please try again.'
        } else if (err.message.includes('Network Error')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        } else if (err.message) {
          errorMessage = err.message
        }
        
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    if (lobbyCode) {
      fetchResults()
    } else {
      setError('No lobby code provided')
      setLoading(false)
    }
  }, [lobbyCode, getGameResults])

  const handlePlayAgain = () => {
    navigate('/')
  }

  const handleGoHome = () => {
    navigate('/')
  }

  const handleShare = async () => {
    try {
      if (navigator.share && results?.game?.finalCanvas?.dataUrl) {
        await navigator.share({
          title: 'Check out our collaborative drawing!',
          text: `We drew "${results.game.prompt}" together and got ${results.aiResult?.scores?.overall || 'an awesome'} score!`,
          url: window.location.href
        })
        toast.success('Results shared successfully!')
      } else {
        // Fallback to copying URL
        await navigator.clipboard.writeText(window.location.href)
        toast.success('Results link copied to clipboard!')
      }
    } catch (error) {
      console.error('Share failed:', error)
      
      // Try fallback copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href)
        toast.success('Results link copied to clipboard!')
      } catch (clipboardError) {
        toast.error('Failed to share results. Your browser may not support sharing.')
      }
    }
  }

  if (loading) {
    return (
      <div className="results-page loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <h2 className="font-minecraft">Analyzing your masterpiece...</h2>
          <p className="font-minecraft">Our AI art critic is preparing some feedback!</p>
        </div>
      </div>
    )
  }

  if (error || !results) {
    return (
      <div className="results-page error">
        <div className="error-content">
          <h2 className="font-minecraft">Oops! Something went wrong</h2>
          <p className="font-minecraft">{error || 'Could not load game results'}</p>
          <Button onClick={handleGoHome} variant="primary" className="retro-button">
            <Home size={16} />
            Go Home
          </Button>
        </div>
      </div>
    )
  }

  const { game, aiResult } = results
  const hasAIResult = aiResult && aiResult.scores

  return (
    <div className="results-page">
      <div className="container">
        <div className="results-content">
          {/* Header */}
          <div className="results-header">
            <Trophy className="trophy-icon" />
            <h1 className="font-minecraft">Game Complete!</h1>
            <p className="prompt-display font-minecraft">
              You drew: <span className="prompt">"{game.prompt}"</span>
            </p>
          </div>

          {/* Final Drawing */}
          <div className="drawing-section">
            <Card className="retro-card">
              <div className="card-header">
                <h3 className="font-minecraft">Your Collaborative Masterpiece</h3>
              </div>
              <div className="card-body">
                {game.finalCanvas?.dataUrl ? (
                  <div className="final-drawing">
                    <img 
                      src={game.finalCanvas.dataUrl} 
                      alt="Final collaborative drawing"
                      className="drawing-image"
                    />
                  </div>
                ) : (
                  <div className="no-drawing">
                    <p className="font-minecraft">No final drawing available</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* AI Results */}
          {hasAIResult && (
            <div className="ai-results-section">
              <Card className="retro-card">
                <div className="card-header">
                  <h3 className="font-minecraft">AI Art Critic's Verdict</h3>
                </div>
                <div className="card-body">
                  {/* Scores */}
                  <div className="scores-grid">
                    <div className="score-card creativity">
                      <div className="score-icon">
                        <Lightbulb size={24} />
                      </div>
                      <div className="score-content">
                        <h4 className="font-minecraft">Creativity</h4>
                        <div className="score-value">
                          {aiResult.scores.creativity}/10
                        </div>
                      </div>
                    </div>

                    <div className="score-card similarity">
                      <div className="score-icon">
                        <Target size={24} />
                      </div>
                      <div className="score-content">
                        <h4 className="font-minecraft">Prompt Match</h4>
                        <div className="score-value">
                          {aiResult.scores.promptSimilarity}/10
                        </div>
                      </div>
                    </div>

                    <div className="score-card overall">
                      <div className="score-icon">
                        <Star size={24} />
                      </div>
                      <div className="score-content">
                        <h4 className="font-minecraft">Overall Score</h4>
                        <div className="score-value">
                          {aiResult.scores.overall}/10
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Feedback */}
                  <div className="feedback-section">
                    <div className="roast-section">
                      <h4 className="font-minecraft">AI's Roast 🔥</h4>
                      <blockquote className="roast-text font-minecraft">
                        "{aiResult.feedback.roast}"
                      </blockquote>
                    </div>

                    <div className="feedback-grid">
                      <div className="feedback-column">
                        <h5 className="font-minecraft">What We Loved ❤️</h5>
                        <ul className="feedback-list positive">
                          {aiResult.feedback.highlights.map((highlight, index) => (
                            <li key={index} className="font-minecraft">{highlight}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="feedback-column">
                        <h5 className="font-minecraft">Room for Improvement 💡</h5>
                        <ul className="feedback-list suggestions">
                          {aiResult.feedback.improvements.map((improvement, index) => (
                            <li key={index} className="font-minecraft">{improvement}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Player Stats */}
          <div className="player-stats-section">
            <Card className="retro-card">
              <div className="card-header">
                <h3 className="font-minecraft">Player Contributions</h3>
              </div>
              <div className="card-body">
                <div className="players-grid">
                  {game.players.map((player, index) => {
                    const contribution = game.finalCanvas?.metadata?.playerContributions?.find(
                      c => c.playerId === player.socketId
                    )
                    
                    return (
                      <div key={index} className="player-stat">
                        <div 
                          className="player-color"
                          style={{ backgroundColor: player.color }}
                        ></div>
                        <div className="player-info">
                          <span className="player-name font-minecraft">{player.name}</span>
                          <span className="stroke-count font-minecraft">
                            {contribution?.strokeCount || 0} strokes
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                {game.finalCanvas?.metadata && (
                  <div className="total-stats">
                    <p className="font-minecraft">Total strokes: <strong>{game.finalCanvas.metadata.totalStrokes}</strong></p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Actions */}
          <div className="results-actions">
            <Button onClick={handleShare} variant="secondary" className="retro-button">
              <Share size={16} />
              Share Results
            </Button>
            
            <Button onClick={handlePlayAgain} variant="primary" className="retro-button">
              <RotateCcw size={16} />
              Play Again
            </Button>
            
            <Button onClick={handleGoHome} variant="secondary" className="retro-button">
              <Home size={16} />
              Home
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        .results-page {
          height: 100vh;
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .results-page.loading,
        .results-page.error {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .loading-content,
        .error-content {
          text-align: center;
          color: var(--text-primary);
          max-width: 400px;
          background: var(--retro-bg);
          padding: 2rem;
          border-radius: var(--radius-xl);
          border: var(--retro-border);
          box-shadow: var(--retro-glow);
        }

        .loading-content h2,
        .error-content h2 {
          margin-bottom: 1rem;
          text-shadow: 0 0 15px rgba(255, 221, 68, 0.8), 2px 2px 4px rgba(0, 0, 0, 0.8);
        }

        .loading-content p,
        .error-content p {
          margin-bottom: 2rem;
          opacity: 0.9;
          text-shadow: 0 0 5px rgba(255, 255, 255, 0.3);
        }

        .retro-button {
          font-family: 'Minecraft', monospace !important;
          font-weight: bold !important;
          text-transform: uppercase !important;
          letter-spacing: 1px !important;
        }

        .results-content {
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
          animation: fadeIn 0.8s ease-out;
          height: 100vh;
          display: flex;
          flex-direction: column;
          padding: 1rem;
          overflow: hidden;
        }

        .results-header {
          text-align: center;
          margin-bottom: 1rem;
          color: var(--text-primary);
          flex-shrink: 0;
        }

        .trophy-icon {
          width: 3rem;
          height: 3rem;
          margin: 0 auto 0.5rem;
          color: var(--warning-color);
          animation: pulse 2s infinite;
          filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.5));
        }

        .results-header h1 {
          margin-bottom: 0.5rem;
          text-shadow: 0 0 20px rgba(255, 221, 68, 0.8), 2px 2px 4px rgba(0, 0, 0, 0.8);
          font-size: 1.75rem;
        }

        .prompt-display {
          font-size: 1rem;
          opacity: 0.9;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
        }

        .prompt {
          font-weight: 600;
          color: var(--accent-color);
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
        }

        .drawing-section {
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
          text-shadow: 0 0 10px rgba(255, 221, 68, 0.8), 1px 1px 2px rgba(0, 0, 0, 0.8);
          font-size: 1rem;
        }

        .card-body {
          flex: 1;
          min-height: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .final-drawing {
          text-align: center;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .drawing-image {
          max-width: 100%;
          max-height: 100%;
          border-radius: var(--radius-md);
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
          border: 3px solid #fff;
        }

        .no-drawing {
          text-align: center;
          padding: 2rem;
          color: var(--text-primary);
        }

        .ai-results-section {
          margin-bottom: 1rem;
          flex: 1;
          min-height: 0;
        }

        .scores-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .score-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          border-radius: var(--radius-lg);
          text-align: center;
          border: 3px solid #fff;
          box-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
        }

        .score-card.creativity {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
        }

        .score-card.similarity {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          color: white;
        }

        .score-card.overall {
          background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
          color: white;
        }

        .score-icon {
          flex-shrink: 0;
          filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.5));
        }

        .score-content h4 {
          margin-bottom: 0.25rem;
          font-size: 0.75rem;
          opacity: 0.9;
          text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
        }

        .score-value {
          font-size: 1.25rem;
          font-weight: bold;
          font-family: 'Minecraft', monospace;
          text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
        }

        .feedback-section {
          margin-top: 1rem;
          overflow-y: auto;
          flex: 1;
        }

        .roast-section {
          margin-bottom: 1rem;
          text-align: center;
        }

        .roast-section h4 {
          margin-bottom: 0.5rem;
          color: #fff;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
          font-size: 0.875rem;
        }

        .roast-text {
          font-size: 0.875rem;
          font-style: italic;
          background: rgba(255, 255, 255, 0.1);
          padding: 1rem;
          border-radius: var(--radius-lg);
          border-left: 4px solid var(--primary-color);
          margin: 0;
          color: #fff;
          border: 2px solid rgba(255, 255, 255, 0.3);
          text-shadow: 0 0 5px rgba(255, 255, 255, 0.3);
        }

        .feedback-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .feedback-column h5 {
          margin-bottom: 0.5rem;
          color: #fff;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
          font-size: 0.75rem;
        }

        .feedback-list {
          list-style: none;
          padding: 0;
        }

        .feedback-list li {
          padding: 0.5rem;
          margin-bottom: 0.25rem;
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.1);
          position: relative;
          padding-left: 1.5rem;
          color: #fff;
          border: 2px solid rgba(255, 255, 255, 0.2);
          font-size: 0.75rem;
        }

        .feedback-list.positive li::before {
          content: '✨';
          position: absolute;
          left: 0.5rem;
        }

        .feedback-list.suggestions li::before {
          content: '💡';
          position: absolute;
          left: 0.5rem;
        }

        .player-stats-section {
          margin-bottom: 1rem;
          flex-shrink: 0;
        }

        .players-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .player-stat {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-md);
          border: 2px solid rgba(255, 255, 255, 0.2);
        }

        .player-color {
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 50%;
          flex-shrink: 0;
          border: 2px solid #fff;
        }

        .player-info {
          display: flex;
          flex-direction: column;
        }

        .player-name {
          font-weight: 500;
          color: #fff;
          font-size: 0.75rem;
        }

        .stroke-count {
          font-size: 0.625rem;
          color: rgba(255, 255, 255, 0.7);
        }

        .total-stats {
          text-align: center;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-md);
          border: 2px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          font-size: 0.75rem;
        }

        .results-actions {
          display: flex;
          justify-content: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .results-page {
            padding: 1rem 0;
          }

          .scores-grid {
            grid-template-columns: 1fr;
          }

          .score-card {
            flex-direction: column;
            text-align: center;
          }

          .feedback-grid {
            grid-template-columns: 1fr;
          }

          .results-actions {
            flex-direction: column;
            align-items: center;
          }

          .results-actions .btn {
            width: 100%;
            max-width: 200px;
          }
        }
      `}</style>
    </div>
  )
}

export default ResultsPage