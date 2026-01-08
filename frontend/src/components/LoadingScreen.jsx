import { Palette } from 'lucide-react'
import { Button } from 'pixel-retroui'

const LoadingScreen = ({ message = 'Loading...' }) => {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-logo">
          <Palette size={64} className="loading-icon" />
        </div>
        <h2 className="loading-title font-minecraft">Collaborative Drawing Game</h2>
        <p className="loading-message font-minecraft">{message}</p>
        <div className="loading-button-container">
          <Button
            variant="primary"
            loading="true"
            disabled={true}
            className="loading-button"
          >
            Loading...
          </Button>
        </div>
      </div>

      <style>{`
        .loading-screen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          overflow: hidden;
        }

        .loading-content {
          text-align: center;
          color: var(--text-primary);
          animation: fadeIn 0.5s ease-out;
          background: var(--retro-bg);
          padding: 2rem;
          border-radius: var(--radius-xl);
          border: var(--retro-border);
          box-shadow: var(--retro-glow);
        }

        .loading-logo {
          margin-bottom: 1rem;
        }

        .loading-icon {
          animation: pulse 2s infinite;
          color: var(--accent-color);
          filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.5));
        }

        .loading-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          opacity: 0.9;
          text-shadow: 0 0 15px rgba(255, 221, 68, 0.8), 2px 2px 4px rgba(0, 0, 0, 0.8);
        }

        .loading-message {
          font-size: 0.875rem;
          margin-bottom: 1.5rem;
          opacity: 0.8;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        }

        .loading-button-container {
          display: flex;
          justify-content: center;
        }

        .loading-button {
          font-family: 'Minecraft', monospace !important;
          font-weight: bold !important;
          text-transform: uppercase !important;
          letter-spacing: 1px !important;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  )
}

export default LoadingScreen