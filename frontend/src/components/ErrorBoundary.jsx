import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from 'pixel-retroui'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-content">
            <div className="error-icon">
              <AlertTriangle size={64} />
            </div>
            
            <h1 className="error-title font-minecraft">Oops! Something went wrong</h1>
            
            <p className="error-message font-minecraft">
              We're sorry, but something unexpected happened. 
              The drawing game encountered an error and needs to be refreshed.
            </p>

            <div className="error-actions">
              <Button 
                onClick={this.handleReload}
                variant="primary"
                className="retro-button"
              >
                <RefreshCw size={16} />
                Reload Page
              </Button>
              
              <Button 
                onClick={this.handleGoHome}
                variant="secondary"
                className="retro-button"
              >
                <Home size={16} />
                Go Home
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Error Details (Development)</summary>
                <div className="error-stack">
                  <h4>Error:</h4>
                  <pre>{this.state.error.toString()}</pre>
                  
                  {this.state.errorInfo && (
                    <>
                      <h4>Component Stack:</h4>
                      <pre>{this.state.errorInfo.componentStack}</pre>
                    </>
                  )}
                </div>
              </details>
            )}
          </div>

          <style>{`
            .error-boundary {
              height: 100vh;
              background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 2rem;
              overflow: hidden;
            }

            .error-content {
              max-width: 500px;
              text-align: center;
              color: var(--text-primary);
              background: var(--retro-bg);
              backdrop-filter: blur(10px);
              border-radius: var(--radius-xl);
              padding: 2rem;
              box-shadow: var(--shadow-xl);
              border: var(--retro-border);
              box-shadow: var(--retro-glow);
            }

            .error-icon {
              margin-bottom: 1.5rem;
              color: var(--error-color);
              animation: pulse 2s infinite;
              filter: drop-shadow(0 0 10px rgba(255, 0, 0, 0.5));
            }

            .error-title {
              font-size: 1.5rem;
              font-weight: 600;
              margin-bottom: 1rem;
              color: var(--text-primary);
              text-shadow: 0 0 15px rgba(255, 221, 68, 0.8), 2px 2px 4px rgba(0, 0, 0, 0.8);
            }

            .error-message {
              font-size: 1rem;
              line-height: 1.6;
              margin-bottom: 1.5rem;
              opacity: 0.9;
              text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            }

            .error-actions {
              display: flex;
              gap: 1rem;
              justify-content: center;
              flex-wrap: wrap;
              margin-bottom: 1.5rem;
            }

            .retro-button {
              font-family: 'Minecraft', monospace !important;
              font-weight: bold !important;
              text-transform: uppercase !important;
              letter-spacing: 1px !important;
            }

            .error-details {
              text-align: left;
              background: rgba(0, 0, 0, 0.2);
              border-radius: var(--radius-md);
              padding: 1rem;
              margin-top: 2rem;
            }

            .error-details summary {
              cursor: pointer;
              font-weight: 500;
              margin-bottom: 1rem;
              color: var(--warning-color);
            }

            .error-stack {
              font-size: 0.75rem;
              color: rgba(255, 255, 255, 0.8);
            }

            .error-stack h4 {
              margin: 1rem 0 0.5rem 0;
              color: var(--text-inverse);
            }

            .error-stack pre {
              background: rgba(0, 0, 0, 0.3);
              padding: 0.5rem;
              border-radius: var(--radius-sm);
              overflow-x: auto;
              white-space: pre-wrap;
              word-break: break-word;
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

            @media (max-width: 768px) {
              .error-content {
                padding: 2rem;
                margin: 1rem;
              }

              .error-title {
                font-size: 1.5rem;
              }

              .error-message {
                font-size: 1rem;
              }

              .error-actions {
                flex-direction: column;
                align-items: center;
              }

              .btn {
                width: 100%;
                max-width: 200px;
              }
            }
          `}</style>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary