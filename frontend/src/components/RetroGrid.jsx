import React from 'react'

const RetroGrid = ({
  angle = 65,
  cellSize = 60,
  opacity = 0.3,
  lightLineColor = "#ffdd44",
  darkLineColor = "#ff6b35",
  className = ""
}) => {
  const gridStyle = {
    '--angle': `${angle}deg`,
    '--cell-size': `${cellSize}px`,
    '--opacity': opacity,
    '--light-line-color': lightLineColor,
    '--dark-line-color': darkLineColor,
  }

  return (
    <div 
      className={`retro-grid ${className}`}
      style={gridStyle}
    >
      <style>{`
        .retro-grid {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        }

        .retro-grid::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 200%;
          height: 200%;
          background-image: 
            linear-gradient(to right, var(--light-line-color) 1px, transparent 1px),
            linear-gradient(to bottom, var(--light-line-color) 1px, transparent 1px);
          background-size: var(--cell-size) var(--cell-size);
          opacity: var(--opacity);
          transform: 
            perspective(1000px) 
            rotateX(var(--angle)) 
            translateY(-50%);
          animation: grid 20s linear infinite;
          filter: drop-shadow(0 0 10px var(--light-line-color));
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .retro-grid::before {
            background-image: 
              linear-gradient(to right, var(--dark-line-color) 1px, transparent 1px),
              linear-gradient(to bottom, var(--dark-line-color) 1px, transparent 1px);
          }
        }

        /* Enhanced cyberpunk effect */
        .retro-grid::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            180deg,
            transparent 0%,
            transparent 40%,
            rgba(255, 107, 53, 0.1) 70%,
            rgba(255, 221, 68, 0.2) 100%
          );
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}

export default RetroGrid