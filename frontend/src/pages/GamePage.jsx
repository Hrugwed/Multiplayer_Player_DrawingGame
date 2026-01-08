import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { useSocketStore } from '../store/socketStore'
import { Timer, Users, Palette, Send, Mic, MicOff } from 'lucide-react'
import { Button, Card } from 'pixel-retroui'
import RetroGrid from '../components/RetroGrid'
import toast from 'react-hot-toast'

const GamePage = () => {
  const { lobbyCode } = useParams()
  const navigate = useNavigate()
  const { currentGame, currentPlayer, updateTimer, finishGame } = useGameStore()
  const { socket, on, off, drawStart, drawMove, drawEnd, moveCursor, getDrawingHistory } = useSocketStore()
  
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentStroke, setCurrentStroke] = useState([])
  const [allStrokes, setAllStrokes] = useState([]) // Store all strokes for persistence
  const [lastDrawnStrokeIndex, setLastDrawnStrokeIndex] = useState(-1) // Track what we've already drawn
  const [canvasInitialized, setCanvasInitialized] = useState(false) // Prevent multiple initializations
  const [historyLoaded, setHistoryLoaded] = useState(false) // Prevent multiple history requests
  const [voiceMuted, setVoiceMuted] = useState(false)
  const [cursors, setCursors] = useState({})

  useEffect(() => {
    if (!currentGame || !currentPlayer || currentGame.status !== 'active') {
      navigate(`/lobby/${lobbyCode}`)
      return
    }

    console.log('🎮 [GAME PAGE] Game page mounted, initializing...');

    // Initialize canvas
    const canvas = canvasRef.current
    if (canvas) {
      canvas.width = currentGame.gameSettings.canvasWidth
      canvas.height = currentGame.gameSettings.canvasHeight
      
      // Initialize canvas once
      initializeCanvas();
      
      console.log('🎨 [CANVAS] Canvas initialized:', canvas.width, 'x', canvas.height);
    }

    // Fetch existing drawing data when component mounts
    const fetchExistingDrawing = async () => {
      console.log('📚 [GAME PAGE] Fetching existing drawing data...');
      try {
        // Request drawing history from server
        if (socket && socket.connected) {
          console.log('📤 [GAME PAGE] Requesting drawing history via socket');
          getDrawingHistory(lobbyCode);
        }
      } catch (error) {
        console.error('❌ [GAME PAGE] Failed to fetch drawing history:', error);
      }
    };

    // Fetch existing drawing data
    fetchExistingDrawing();

    // Socket event listeners
    const handleDrawStart = (data) => {
      if (data.playerId !== socket?.id) {
        drawOnCanvas(data, 'start')
      }
    }

    const handleDrawMove = (data) => {
      if (data.playerId !== socket?.id) {
        drawOnCanvas(data, 'move')
      }
    }

    const handleDrawEnd = (data) => {
      if (data.playerId !== socket?.id) {
        drawOnCanvas(data, 'end')
      }
    }

    const handleCursorMove = (data) => {
      if (data.playerId !== socket?.id) {
        setCursors(prev => ({
          ...prev,
          [data.playerId]: {
            x: data.x,
            y: data.y,
            playerName: data.playerName
          }
        }))
      }
    }

    const handleTimerUpdate = (data) => {
      updateTimer(data.remainingTime)
    }

    const handleGameTimeUp = () => {
      toast('Time is up! Submit your drawing.', { icon: '⏰' })
    }

    const handleGameFinished = () => {
      navigate(`/results/${lobbyCode}`)
    }

    const handleError = (error) => {
      console.error(`❌ [GAME PAGE] Socket error:`, error)
      
      // Handle specific error codes with user-friendly messages
      let errorMessage = error.message || 'An error occurred'
      
      switch (error.error) {
        case 'GAME_NOT_FOUND':
          errorMessage = 'Game not found. The lobby may have expired.'
          navigate(`/lobby/${lobbyCode}`)
          break
        case 'PERMISSION_DENIED':
          errorMessage = 'You don\'t have permission to perform this action.'
          break
        case 'INVALID_LOBBY_CODE':
          errorMessage = 'Invalid lobby code. Please rejoin the game.'
          navigate('/')
          break
        default:
          // Use the provided message or fallback
          errorMessage = error.message || 'Something went wrong in the game.'
          break
      }
      
      toast.error(errorMessage)
    }

    const handleDrawingHistory = (data) => {
      if (historyLoaded) {
        console.log('📚 [CANVAS] History already loaded, ignoring duplicate request');
        return;
      }
      
      console.log('📚 [CANVAS] Received drawing history:', data.strokes?.length || 0, 'strokes')
      if (data.strokes && Array.isArray(data.strokes)) {
        console.log('📚 [CANVAS] Setting drawing history strokes');
        
        // Don't clear canvas again if it's already initialized
        if (!canvasInitialized) {
          initializeCanvas();
        }
        
        setLastDrawnStrokeIndex(-1);
        setAllStrokes(data.strokes);
        setHistoryLoaded(true);
      }
    }

    // Add event listeners
    on('draw_start', handleDrawStart)
    on('draw_move', handleDrawMove)
    on('draw_end', handleDrawEnd)
    on('cursor_move', handleCursorMove)
    on('timer_update', handleTimerUpdate)
    on('game_time_up', handleGameTimeUp)
    on('game_finished', handleGameFinished)
    on('drawing_history', handleDrawingHistory)
    on('error', handleError)

    // Cleanup
    return () => {
      off('draw_start', handleDrawStart)
      off('draw_move', handleDrawMove)
      off('draw_end', handleDrawEnd)
      off('cursor_move', handleCursorMove)
      off('timer_update', handleTimerUpdate)
      off('game_time_up', handleGameTimeUp)
      off('game_finished', handleGameFinished)
      off('drawing_history', handleDrawingHistory)
      off('error', handleError)
    }
  }, []) // Empty dependency array to prevent re-running

  // Separate effect for navigation check
  useEffect(() => {
    if (!currentGame || !currentPlayer || currentGame.status !== 'active') {
      navigate(`/lobby/${lobbyCode}`)
    }
  }, [currentGame, currentPlayer, lobbyCode, navigate])

  const drawStrokeOnCanvas = (stroke) => {
    const canvas = canvasRef.current
    if (!canvas || !stroke.points || stroke.points.length === 0) return

    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.strokeWidth || 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    ctx.beginPath()
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
    
    stroke.points.forEach(point => {
      ctx.lineTo(point.x, point.y)
    })
    
    ctx.stroke()
  }

  const initializeCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas || canvasInitialized) return

    const ctx = canvas.getContext('2d')
    
    // Clear canvas only once during initialization
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    setCanvasInitialized(true);
    console.log('🎨 [CANVAS] Canvas initialized and cleared (one time only)');
  }

  // Draw only new strokes incrementally (much more efficient)
  const drawNewStrokes = () => {
    if (lastDrawnStrokeIndex >= allStrokes.length - 1) {
      return; // No new strokes to draw
    }

    console.log('🎨 [CANVAS] Drawing new strokes from index', lastDrawnStrokeIndex + 1, 'to', allStrokes.length - 1);
    
    // Draw only the new strokes
    for (let i = lastDrawnStrokeIndex + 1; i < allStrokes.length; i++) {
      drawStrokeOnCanvas(allStrokes[i]);
    }
    
    setLastDrawnStrokeIndex(allStrokes.length - 1);
  }

  // Only draw new strokes when allStrokes changes (no more flickering!)
  useEffect(() => {
    drawNewStrokes();
  }, [allStrokes.length])

  const drawOnCanvas = (data, type) => {
    if (type === 'start') {
      // Start a new stroke - just log for now
      console.log('🎨 [CANVAS] Starting stroke from:', data.playerName);
    } else if (type === 'move') {
      // Handle real-time drawing for smooth experience
      // We don't store individual move events, just the final stroke
    } else if (type === 'end') {
      // Complete stroke received - add to our stroke history
      if (data.points && data.points.length > 0) {
        console.log('🎨 [CANVAS] Adding received stroke from:', data.playerName, 'with', data.points.length, 'points');
        
        const newStroke = {
          points: data.points,
          color: data.color,
          strokeWidth: data.strokeWidth || 2,
          playerId: data.playerId,
          playerName: data.playerName,
          timestamp: data.timestamp || Date.now()
        };
        
        // Add to stroke history - this will trigger incremental drawing
        setAllStrokes(prev => {
          // Check if this stroke already exists to prevent duplicates
          const exists = prev.some(stroke => 
            stroke.playerId === newStroke.playerId && 
            stroke.timestamp === newStroke.timestamp
          );
          
          if (exists) {
            console.log('🎨 [CANVAS] Stroke already exists, skipping');
            return prev;
          }
          
          console.log('🎨 [CANVAS] Adding new stroke to history. Total strokes:', prev.length + 1);
          return [...prev, newStroke];
        });
      }
    }
  }

  const getMousePos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  const handleMouseDown = (e) => {
    if (!currentPlayer || !socket) return
    
    setIsDrawing(true)
    const pos = getMousePos(e)
    setCurrentStroke([pos])
    
    // Draw locally for immediate feedback
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = currentPlayer.color
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    
    // Emit to other players
    drawStart(lobbyCode, pos, 2)
  }

  const handleMouseMove = (e) => {
    const pos = getMousePos(e)
    
    // Always emit cursor position
    if (socket) {
      moveCursor(lobbyCode, pos.x, pos.y)
    }
    
    if (!isDrawing || !currentPlayer) return
    
    // Add to current stroke
    setCurrentStroke(prev => [...prev, pos])
    
    // Draw locally for immediate feedback (don't redraw everything)
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = currentPlayer.color
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    
    // Emit to other players for real-time feedback
    drawMove(lobbyCode, pos)
  }

  const handleMouseUp = () => {
    if (!isDrawing || !currentPlayer || currentStroke.length === 0) return
    
    setIsDrawing(false)
    
    console.log('🎨 [CANVAS] Mouse up - completing our stroke:', currentStroke.length, 'points');
    
    // Create our stroke object
    const newStroke = {
      points: [...currentStroke], // Make a copy
      color: currentPlayer.color,
      strokeWidth: 2,
      playerId: socket?.id,
      playerName: currentPlayer.name,
      timestamp: Date.now()
    }
    
    // Add our own stroke to the history immediately (incremental drawing will handle it)
    setAllStrokes(prev => {
      console.log('🎨 [CANVAS] Adding our own stroke to history. Total strokes:', prev.length + 1);
      return [...prev, newStroke];
    });
    
    // Emit complete stroke to other players
    drawEnd(lobbyCode, currentStroke)
    setCurrentStroke([])
  }

  const handleSubmitDrawing = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    try {
      const dataUrl = canvas.toDataURL('image/png')
      // This would normally call the game store to submit
      toast.success('Drawing submitted!')
      navigate(`/results/${lobbyCode}`)
    } catch (error) {
      toast.error('Failed to submit drawing')
    }
  }

  const toggleVoice = () => {
    setVoiceMuted(!voiceMuted)
    // Voice chat implementation would go here
  }

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  if (!currentGame || !currentPlayer) {
    return null
  }

  const timeRemaining = currentGame.gameTimer?.remainingTime || 0
  const isTimeUp = timeRemaining <= 0

  return (
    <div className="game-page">
      {/* Retro Grid Background */}
      <RetroGrid 
        angle={65}
        cellSize={50}
        opacity={0.2}
        lightLineColor="#ffdd44"
        darkLineColor="#ff6b35"
      />
      
      <div className="game-container">
        {/* Header */}
        <div className="game-header">
          <div className="game-info">
            <h2 className="prompt-text font-minecraft">
              Draw: <span className="prompt">{currentGame.prompt}</span>
            </h2>
          </div>
          
          <div className="game-controls">
            <div className="timer">
              <Timer size={20} />
              <span className={`time ${timeRemaining <= 30 ? 'warning' : ''}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
            
            <Button
              onClick={toggleVoice}
              className={`voice-button ${voiceMuted ? 'muted' : 'active'}`}
              variant={voiceMuted ? 'danger' : 'primary'}
            >
              {voiceMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </Button>
          </div>
        </div>

        {/* Main Game Area */}
        <div className="game-main">
          {/* Canvas Area */}
          <div className="canvas-container">
            <canvas
              ref={canvasRef}
              className="drawing-canvas"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
            
            {/* Cursors Overlay */}
            <div className="cursors-overlay">
              {Object.entries(cursors).map(([playerId, cursor]) => (
                <div
                  key={playerId}
                  className="player-cursor"
                  style={{
                    left: cursor.x,
                    top: cursor.y,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className="cursor-dot"></div>
                  <div className="cursor-label">{cursor.playerName}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="game-sidebar">
            {/* Players */}
            <Card className="retro-card">
              <div className="card-header">
                <Users size={16} />
                <h3 className="font-minecraft">Players</h3>
              </div>
              <div className="card-body">
                <div className="players-list">
                  {currentGame.players.map((player, index) => (
                    <div key={index} className="player-item">
                      <div 
                        className="player-color"
                        style={{ backgroundColor: player.color }}
                      ></div>
                      <span className="player-name">{player.name}</span>
                      {player.socketId === currentPlayer.socketId && (
                        <span className="you-label">(You)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Tools */}
            <Card className="retro-card">
              <div className="card-header">
                <Palette size={16} />
                <h3 className="font-minecraft">Your Color</h3>
              </div>
              <div className="card-body">
                <div className="color-display">
                  <div 
                    className="current-color"
                    style={{ backgroundColor: currentPlayer.color }}
                  ></div>
                  <span>This is your assigned color</span>
                </div>
              </div>
            </Card>

            {/* Submit Button */}
            {(isTimeUp || currentPlayer.isHost) && (
              <Button
                onClick={handleSubmitDrawing}
                variant="primary"
                size="lg"
                className="submit-button retro-button"
              >
                <Send size={20} />
                Submit Drawing
              </Button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .game-page {
          height: 100vh;
          background: var(--bg-secondary);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .game-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
        }

        .game-header {
          background: linear-gradient(135deg, var(--bg-primary), var(--bg-secondary));
          padding: 0.75rem 1.5rem;
          border-bottom: 3px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          box-shadow: var(--retro-glow);
          flex-shrink: 0;
        }

        .prompt-text {
          margin: 0;
          color: var(--text-primary);
          font-size: 1.25rem;
          text-shadow: 0 0 10px rgba(255, 221, 68, 0.8), 1px 1px 2px rgba(0, 0, 0, 0.8);
        }

        .prompt {
          color: var(--primary-color);
          font-weight: 600;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
        }

        .game-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .timer {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: var(--retro-bg);
          border-radius: var(--radius-md);
          font-weight: 600;
          font-family: 'Minecraft', monospace;
          color: var(--text-primary);
          border: var(--retro-border);
          box-shadow: var(--retro-glow);
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        }

        .time.warning {
          color: var(--error-color);
          animation: pulse 1s infinite;
        }

        .voice-button {
          font-family: 'Minecraft', monospace !important;
        }

        .game-main {
          flex: 1;
          display: flex;
          gap: 1rem;
          padding: 1rem;
          overflow: hidden;
          min-height: 0;
        }

        .canvas-container {
          flex: 1;
          position: relative;
          background: white;
          border-radius: var(--radius-lg);
          box-shadow: 0 0 30px rgba(0, 0, 0, 0.5);
          overflow: hidden;
          border: 3px solid #000;
          min-height: 0;
        }

        .drawing-canvas {
          display: block;
          width: 100%;
          height: 100%;
          cursor: crosshair;
        }

        .cursors-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
        }

        .player-cursor {
          position: absolute;
          z-index: 10;
        }

        .cursor-dot {
          width: 8px;
          height: 8px;
          background: var(--primary-color);
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: var(--shadow-sm);
        }

        .cursor-label {
          position: absolute;
          top: -25px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--text-primary);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          white-space: nowrap;
          font-family: 'Minecraft', monospace;
        }

        .game-sidebar {
          width: 280px;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          overflow: hidden;
        }

        .retro-card {
          background: var(--retro-bg) !important;
          border: var(--retro-border) !important;
          box-shadow: var(--retro-glow) !important;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-primary);
          padding: 0.75rem;
          flex-shrink: 0;
        }

        .card-header h3 {
          color: var(--text-primary) !important;
          margin: 0;
          font-size: 0.875rem;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        }

        .card-body {
          padding: 0.75rem;
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }

        .players-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          overflow-y: auto;
          max-height: 200px;
        }

        .player-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          background: linear-gradient(135deg, rgba(255, 107, 53, 0.2), rgba(247, 147, 30, 0.2));
          border-radius: var(--radius-md);
          border: 2px solid var(--border-color);
        }

        .player-color {
          width: 1rem;
          height: 1rem;
          border-radius: 50%;
          flex-shrink: 0;
          border: 2px solid #fff;
        }

        .player-name {
          flex: 1;
          font-weight: 500;
          color: var(--text-primary);
          font-family: 'Minecraft', monospace;
          font-size: 0.75rem;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        }

        .you-label {
          font-size: 0.625rem;
          color: var(--primary-color);
          font-style: italic;
          font-family: 'Minecraft', monospace;
        }

        .color-display {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .current-color {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: var(--radius-md);
          border: 3px solid #fff;
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
        }

        .color-display span {
          color: var(--text-primary);
          font-family: 'Minecraft', monospace;
          font-size: 0.75rem;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        }

        .submit-button {
          width: 100%;
          margin-top: auto;
          flex-shrink: 0;
        }

        .retro-button {
          font-family: 'Minecraft', monospace !important;
          font-weight: bold !important;
          text-transform: uppercase !important;
          letter-spacing: 1px !important;
        }

        @media (max-width: 1024px) {
          .game-main {
            flex-direction: column;
          }

          .game-sidebar {
            width: 100%;
            flex-direction: row;
            overflow-x: auto;
            height: auto;
          }

          .game-sidebar .retro-card {
            min-width: 200px;
            height: auto;
          }
        }

        @media (max-width: 768px) {
          .game-header {
            padding: 0.5rem 1rem;
            flex-direction: column;
            align-items: stretch;
          }

          .game-controls {
            justify-content: center;
          }

          .game-sidebar {
            flex-direction: column;
            height: auto;
          }

          .prompt-text {
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  )
}

export default GamePage