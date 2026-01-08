# 🎨 System Architecture - Collaborative Drawing Game

## 🏗️ High-Level Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           COLLABORATIVE DRAWING GAME                            │
│                                SYSTEM ARCHITECTURE                              │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CLIENT LAYER  │    │  APPLICATION    │    │   DATA LAYER    │    │  EXTERNAL APIs  │
│   (Frontend)    │    │     LAYER       │    │                 │    │                 │
│                 │    │   (Backend)     │    │                 │    │                 │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ React SPA       │◄──►│ Node.js Server  │◄──►│ Redis Cache     │    │ OpenAI API      │
│ Vite Build      │    │ Express.js      │    │ (Real-time)     │    │ (AI Analysis)   │
│ Socket.IO Client│    │ Socket.IO       │    │                 │    │                 │
│ Zustand Store   │    │ JWT Auth        │    ├─────────────────┤    │                 │
│ RetroUI         │    │ Rate Limiting   │    │ MongoDB Atlas   │    │                 │
│                 │    │ CORS/Helmet     │    │ (Persistence)   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔄 Complete Data Flow Architecture

### 1. User Journey Flow
```
User Opens App → Home Page → Create/Join Game → Lobby → Drawing → Results
     ↓              ↓           ↓              ↓        ↓         ↓
   Load UI    → API Call → Socket Connect → Real-time → Canvas → AI Analysis
```

### 2. Real-Time Communication Flow
```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Player A      │         │   Node.js       │         │   Player B      │
│   (Browser)     │         │   Server        │         │   (Browser)     │
├─────────────────┤         ├─────────────────┤         ├─────────────────┤
│                 │         │                 │         │                 │
│ Mouse Move ────►│────────►│ Socket Handler ─│────────►│ Update Cursor   │
│                 │         │                 │         │                 │
│ Draw Stroke ───►│────────►│ Redis Store ────│────────►│ Render Stroke   │
│                 │         │ MongoDB Save    │         │                 │
│                 │         │                 │         │                 │
│ Join Lobby ────►│────────►│ Game Service ───│────────►│ Player Joined   │
│                 │         │ Redis Update    │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

## 🏛️ Detailed Component Architecture

### Frontend Architecture (React SPA)
```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │    Pages    │  │ Components  │  │   Stores    │             │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤             │
│  │ HomePage    │  │ Canvas      │  │ gameStore   │             │
│  │ LobbyPage   │  │ PlayerList  │  │ socketStore │             │
│  │ GamePage    │  │ Timer       │  │ Zustand     │             │
│  │ ResultsPage │  │ RetroUI     │  │             │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Services   │  │   Routing   │  │   Styling   │             │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤             │
│  │ api.js      │  │ React Router│  │ RetroUI     │             │
│  │ socket.js   │  │ Navigation  │  │ CSS Modules │             │
│  │ canvas.js   │  │ Guards      │  │ Responsive  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

### Backend Architecture (Node.js)
```
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Routes    │  │ Controllers │  │  Services   │             │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤             │
│  │ gameRoutes  │  │ gameCtrl    │  │ gameService │             │
│  │ promptRoutes│  │ promptCtrl  │  │ redisService│             │
│  │ /health     │  │ validation  │  │ aiService   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Sockets    │  │   Models    │  │ Middleware  │             │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤             │
│  │ gameSocket  │  │ Game.js     │  │ CORS        │             │
│  │ Real-time   │  │ Prompt.js   │  │ Rate Limit  │             │
│  │ Events      │  │ AIResult.js │  │ Helmet      │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

## 🗄️ Data Layer Architecture

### Redis Cache Layer (Performance)
```
┌─────────────────────────────────────────────────────────────────┐
│                         REDIS CACHE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │   Game State    │    │  Drawing Data   │    │ Player Cursors  │ │
│  ├─────────────────┤    ├─────────────────┤    ├─────────────────┤ │
│  │ game:ABC123     │    │ drawing:ABC123  │    │ cursor:ABC123:1 │ │
│  │ {               │    │ [               │    │ {x: 100, y: 50} │ │
│  │   status: active│    │   {stroke1},    │    │ TTL: 30 sec     │ │
│  │   players: [...] │    │   {stroke2}     │    │                 │ │
│  │   TTL: 24h      │    │ ]               │    │                 │ │
│  │ }               │    │ TTL: 2h         │    │                 │ │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘ │
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │  Socket Maps    │    │   Game Timer    │    │ Lobby Index     │ │
│  ├─────────────────┤    ├─────────────────┤    ├─────────────────┤ │
│  │ socket:xyz123   │    │ timer:ABC123    │    │ lobby:ABC123    │ │
│  │ {               │    │ {               │    │ {               │ │
│  │   lobbyCode,    │    │   startTime,    │    │   playerCount,  │ │
│  │   playerId      │    │   remaining     │    │   status        │ │
│  │ }               │    │ }               │    │ }               │ │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### MongoDB Persistence Layer
```
┌─────────────────────────────────────────────────────────────────┐
│                      MONGODB ATLAS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │   Games Coll.   │    │ Prompts Coll.   │    │ AIResults Coll. │ │
│  ├─────────────────┤    ├─────────────────┤    ├─────────────────┤ │
│  │ {               │    │ {               │    │ {               │ │
│  │   _id,          │    │   _id,          │    │   _id,          │ │
│  │   lobbyCode,    │    │   text,         │    │   gameId,       │ │
│  │   players: [],  │    │   category,     │    │   analysis,     │ │
│  │   drawingData,  │    │   difficulty    │    │   score         │ │
│  │   status,       │    │ }               │    │ }               │ │
│  │   createdAt     │    │                 │    │                 │ │
│  │ }               │    │ Indexes:        │    │ Indexes:        │ │
│  │                 │    │ - category      │    │ - gameId        │ │
│  │ Indexes:        │    │ - difficulty    │    │ - createdAt     │ │
│  │ - lobbyCode     │    │                 │    │                 │ │
│  │ - status        │    │                 │    │                 │ │
│  │ - createdAt     │    │                 │    │                 │ │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Real-Time Event Flow

### Drawing Stroke Complete Flow
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           DRAWING STROKE FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

Player A draws stroke
        ↓
Frontend: handleMouseUp()
        ↓
socket.emit('draw_end', strokeData)
        ↓
Backend: gameSocket.handleDrawEnd()
        ↓
┌─ Redis: addDrawingStroke() [1-3ms] ──┐
│                                      ↓
└─ MongoDB: game.addDrawingStroke() [50-100ms]
        ↓
socket.broadcast.emit('draw_end', stroke)
        ↓
All other players receive stroke
        ↓
Frontend: renderStroke() on canvas
        ↓
Real-time collaborative drawing! ✨
```

### Game State Synchronization
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        GAME STATE SYNC FLOW                                     │
└─────────────────────────────────────────────────────────────────────────────────┘

Player joins lobby
        ↓
API: POST /api/game/join
        ↓
GameService.joinGame()
        ↓
┌─ MongoDB: Game.findOne() & save() ──┐
│                                     ↓
└─ Redis: updateGamePlayers() [1-5ms] ─┘
        ↓
Socket: emit('player_joined')
        ↓
All lobby members get update
        ↓
UI updates in real-time
```

## 🚀 Deployment Architecture

### Production Environment
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          PRODUCTION DEPLOYMENT                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vercel CDN    │    │   Railway App   │    │  External APIs  │
│   (Frontend)    │    │   (Backend)     │    │                 │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • React Build   │    │ • Node.js       │    │ • MongoDB Atlas │
│ • Static Assets │◄──►│ • Socket.IO     │◄──►│ • Redis Cloud   │
│ • Global CDN    │    │ • Auto-scaling  │    │ • OpenAI API    │
│ • HTTPS/SSL     │    │ • Health Checks │    │ • Monitoring    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        ↑                       ↑                       ↑
        │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Users         │    │   Load Balancer │    │   Monitoring    │
│   (Browsers)    │    │   (Railway)     │    │   (Railway)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## ⚡ Performance Optimization Architecture

### Caching Strategy
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           CACHING LAYERS                                        │
└─────────────────────────────────────────────────────────────────────────────────┘

Request Flow:
Client Request → CDN Cache → Redis Cache → MongoDB → Response

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Browser       │    │   Redis L1      │    │   MongoDB L2    │
│   Cache         │    │   Cache         │    │   Database      │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Static Assets │    │ • Game State    │    │ • Persistent    │
│ • API Responses │    │ • Drawing Data  │    │ • Full Records  │
│ • 5 min TTL     │    │ • 1-24h TTL     │    │ • Permanent     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
     Hit: 0ms              Hit: 1-5ms           Hit: 50-200ms
```

### Scaling Architecture
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           HORIZONTAL SCALING                                     │
└─────────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │  Load Balancer  │
                    │   (Railway)     │
                    └─────────┬───────┘
                              │
            ┌─────────────────┼─────────────────┐
            ↓                 ↓                 ↓
    ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
    │ App Server 1│   │ App Server 2│   │ App Server N│
    │ Node.js     │   │ Node.js     │   │ Node.js     │
    └─────────────┘   └─────────────┘   └─────────────┘
            │                 │                 │
            └─────────────────┼─────────────────┘
                              ↓
                    ┌─────────────────┐
                    │  Shared Redis   │
                    │    Cluster      │
                    └─────────────────┘
```

## 🔐 Security Architecture

### Multi-Layer Security
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SECURITY LAYERS                                       │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Side   │    │   Server Side   │    │   Data Layer    │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Input Valid.  │    │ • Rate Limiting │    │ • Encryption    │
│ • XSS Protection│    │ • CORS Policy   │    │ • Access Control│
│ • HTTPS Only    │    │ • Helmet Headers│    │ • Network Sec.  │
│ • CSP Headers   │    │ • Input Sanitiz.│    │ • Audit Logs   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📊 Monitoring & Analytics Architecture

### Observability Stack
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         MONITORING STACK                                        │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Metrics       │    │     Logs        │    │    Alerts       │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Response Time │    │ • Error Logs    │    │ • Email Notify  │
│ • Active Users  │    │ • Access Logs   │    │ • Slack Webhook │
│ • Redis Hits    │    │ • Debug Logs    │    │ • SMS Critical  │
│ • Memory Usage  │    │ • Audit Trail   │    │ • Auto Recovery │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🎯 Key Architecture Benefits

### Performance Benefits
- **Sub-5ms response times** with Redis caching
- **Real-time collaboration** with Socket.IO
- **Horizontal scaling** capability
- **CDN-optimized** static assets

### Reliability Benefits
- **Graceful degradation** (works without Redis)
- **Auto-failover** with Railway
- **Health monitoring** and alerts
- **Backup strategies** for data

### Developer Experience
- **Hot reloading** in development
- **Type safety** with validation
- **Comprehensive logging** for debugging
- **Easy deployment** with Railway

This architecture provides enterprise-level performance and reliability while maintaining simplicity for development and deployment! 🚀