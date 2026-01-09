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
        
        {/* RetroUI Loading Button */}
        <div className="loading-button-container">
          <Button
            variant="primary"
            loading={true}
            disabled={true}
            className="loading-button"
          >
            Loading Game...
          </Button>
        </div>

        {/* Additional Loading Indicators */}
        <div className="loading-indicators">
          <div className="retro-spinner"></div>
          <div className="loading-dots">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
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

        .loading-indicators {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          margin-top: 1rem;
        }

        .retro-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--accent-color);
          border-top: 3px solid transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          box-shadow: 0 0 10px rgba(255, 221, 68, 0.5);
        }

        .loading-dots {
          display: flex;
          gap: 0.5rem;
        }

        .dot {
          width: 8px;
          height: 8px;
          background: var(--accent-color);
          border-radius: 50%;
          animation: bounce 1.4s ease-in-out infinite both;
          box-shadow: 0 0 5px rgba(255, 221, 68, 0.7);
        }

        .dot:nth-child(1) { animation-delay: -0.32s; }
        .dot:nth-child(2) { animation-delay: -0.16s; }
        .dot:nth-child(3) { animation-delay: 0s; }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
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