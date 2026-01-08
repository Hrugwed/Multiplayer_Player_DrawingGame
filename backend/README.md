# Collaborative Drawing Game - Backend

This is the backend API server for the collaborative drawing game. It provides real-time multiplayer functionality, game management, and AI-powered drawing analysis.

## Features

- **Real-time Multiplayer**: Socket.IO for real-time communication
- **Game Management**: Create, join, and manage drawing game sessions
- **AI Analysis**: OpenAI integration for drawing analysis and feedback
- **Data Persistence**: MongoDB for game data, Redis for caching
- **Drawing System**: Real-time collaborative drawing with stroke persistence
- **Prompt System**: Dynamic drawing prompts with difficulty levels

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.IO** - Real-time communication
- **MongoDB** - Primary database
- **Redis** - Caching and session management
- **OpenAI API** - AI drawing analysis
- **Joi** - Input validation

## Getting Started

### Prerequisites

- Node.js 16+ 
- MongoDB instance
- Redis instance (optional, falls back to memory storage)
- OpenAI API key (optional, uses fallback for AI analysis)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/drawing-game

# Redis (optional)
REDIS_URL=redis://localhost:6379

# OpenAI (optional)
AI_API_KEY=your_openai_api_key
AI_API_URL=https://api.openai.com/v1/chat/completions

# CORS
FRONTEND_URL=http://localhost:3000
```

3. Seed the database with initial prompts:
```bash
npm run seed
```

4. Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:5000`

## API Endpoints

### Game Management
- `POST /api/games` - Create a new game
- `POST /api/games/join` - Join an existing game
- `GET /api/games/:lobbyCode/status` - Get game status
- `POST /api/games/:lobbyCode/start` - Start a game (host only)
- `POST /api/games/:lobbyCode/submit` - Submit final drawing
- `GET /api/games/:lobbyCode/results` - Get game results

### Prompts
- `GET /api/prompts/random` - Get a random drawing prompt
- `GET /api/prompts` - Get all prompts (paginated)
- `POST /api/prompts` - Create a new prompt (admin)

## Socket Events

### Client to Server
- `join_lobby` - Join a game lobby
- `leave_lobby` - Leave a game lobby
- `start_game` - Start the game (host only)
- `draw_start` - Start drawing a stroke
- `draw_move` - Continue drawing a stroke
- `draw_end` - Finish drawing a stroke
- `cursor_move` - Update cursor position
- `voice_offer` - WebRTC voice chat offer
- `voice_answer` - WebRTC voice chat answer
- `voice_ice_candidate` - WebRTC ICE candidate

### Server to Client
- `lobby_joined` - Successfully joined lobby
- `player_joined` - Another player joined
- `player_left` - A player left
- `game_started` - Game has started
- `draw_start` - Another player started drawing
- `draw_move` - Another player is drawing
- `draw_end` - Another player finished a stroke
- `cursor_move` - Another player's cursor moved
- `timer_update` - Game timer update
- `game_time_up` - Game time expired
- `game_finished` - Game completed
- `error` - Error occurred

## Project Structure

```
backend/
├── config/          # Database and Redis configuration
├── controllers/     # Route controllers
├── models/          # MongoDB models
├── routes/          # Express routes
├── services/        # Business logic services
├── sockets/         # Socket.IO event handlers
├── scripts/         # Utility scripts
├── utils/           # Helper utilities
├── server.js        # Main server file
└── package.json     # Dependencies and scripts
```

## Error Handling

The backend implements comprehensive error handling with:
- Structured error codes
- User-friendly error messages
- Input validation
- Graceful degradation when services are unavailable
- Proper HTTP status codes

## Development

### Running Tests
```bash
npm test
```

### Code Structure
- **Controllers**: Handle HTTP requests and responses
- **Services**: Contain business logic and database operations
- **Models**: Define MongoDB schemas and methods
- **Sockets**: Handle real-time Socket.IO events
- **Utils**: Helper functions and validation

### Adding New Features
1. Create/update models in `models/`
2. Add business logic in `services/`
3. Create API endpoints in `controllers/` and `routes/`
4. Add Socket.IO events in `sockets/`
5. Update validation in `utils/validation.js`

## Deployment

The backend is configured for deployment on Railway, Heroku, or similar platforms:

1. Set environment variables on your platform
2. Ensure MongoDB and Redis instances are accessible
3. Deploy using your platform's deployment method

## License

MIT License - see LICENSE file for details