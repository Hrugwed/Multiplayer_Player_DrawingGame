# Collaborative Drawing Game

A real-time multiplayer drawing game where players collaborate on the same canvas and receive AI-powered feedback on their artwork. Built with React, Node.js, Socket.IO, and OpenAI integration.

## 🎮 Features

- **Real-time Collaboration**: Multiple players draw simultaneously on a shared canvas
- **AI Art Critic**: Get humorous and constructive feedback from AI on your drawings
- **Dynamic Prompts**: Variety of drawing prompts with different difficulty levels
- **Voice Chat**: Built-in WebRTC voice communication (coming soon)
- **Retro UI**: Nostalgic 80s arcade-style interface with RetroUI components
- **Responsive Design**: Works on desktop and mobile devices
- **Game Management**: Create lobbies, invite friends, and manage game sessions

## 🏗️ Project Structure

This is a monorepo containing both backend and frontend applications:

```
collaborative-drawing-game/
├── backend/                 # Node.js API server
│   ├── config/             # Database and Redis configuration
│   ├── controllers/        # Route controllers
│   ├── models/             # MongoDB models
│   ├── services/           # Business logic
│   ├── sockets/            # Socket.IO handlers
│   └── server.js           # Main server file
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── store/          # State management
│   └── public/             # Static assets
├── docs/                   # Documentation files
└── README.md               # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- MongoDB (local or cloud)
- Redis (optional, falls back to memory storage)
- OpenAI API key (optional, uses fallback responses)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd collaborative-drawing-game
```

2. **Install dependencies for both backend and frontend**
```bash
npm run install:all
```

3. **Set up environment variables**

Backend (`.env` in `backend/` directory):
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/drawing-game
REDIS_URL=redis://localhost:6379
AI_API_KEY=your_openai_api_key
FRONTEND_URL=http://localhost:3000
```

Frontend (`.env.local` in `frontend/` directory):
```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

4. **Seed the database with initial prompts**
```bash
npm run seed
```

5. **Start both applications**
```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:5000`
- Frontend application on `http://localhost:3000`

## 🎯 How to Play

1. **Create or Join a Game**
   - Enter your name and create a new game lobby
   - Share the 6-character lobby code with friends
   - Or join an existing game with a lobby code

2. **Wait for Players**
   - Up to 4 players can join each game
   - Each player gets assigned a unique color
   - Host can start the game when ready (minimum 2 players)

3. **Draw Together**
   - Everyone draws on the same canvas simultaneously
   - Follow the given drawing prompt
   - Use your assigned color to contribute to the artwork

4. **Get AI Feedback**
   - Submit the final drawing for AI analysis
   - Receive scores for creativity and prompt similarity
   - Enjoy humorous roasts and constructive feedback

## 🛠️ Development

### Backend Development
```bash
cd backend
npm run dev        # Start with nodemon
npm test          # Run tests
npm run seed      # Seed database
```

### Frontend Development
```bash
cd frontend
npm run dev       # Start Vite dev server
npm run build     # Build for production
npm run preview   # Preview production build
```

### Full Stack Development
```bash
npm run dev       # Start both backend and frontend
npm run build     # Build both applications
npm test          # Run all tests
```

## 🔧 Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.IO** - Real-time communication
- **MongoDB** - Primary database
- **Redis** - Caching and sessions
- **OpenAI API** - AI drawing analysis
- **Joi** - Input validation

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Zustand** - State management
- **Socket.IO Client** - Real-time communication
- **React Router** - Navigation
- **RetroUI** - Retro-styled UI components
- **React Hot Toast** - Notifications

## 📚 API Documentation

### Game Endpoints
- `POST /api/games` - Create a new game
- `POST /api/games/join` - Join an existing game
- `GET /api/games/:lobbyCode/status` - Get game status
- `POST /api/games/:lobbyCode/start` - Start a game
- `GET /api/games/:lobbyCode/results` - Get game results

### Socket Events
- `join_lobby` - Join a game lobby
- `draw_start/move/end` - Drawing events
- `cursor_move` - Real-time cursor tracking
- `voice_*` - Voice chat signaling

See individual README files in `backend/` and `frontend/` for detailed documentation.

## 🚀 Deployment

### Backend Deployment (Railway/Heroku)
1. Set environment variables on your platform
2. Deploy the `backend/` directory
3. Ensure MongoDB and Redis are accessible

### Frontend Deployment (Vercel/Netlify)
1. Build the frontend: `cd frontend && npm run build`
2. Deploy the `frontend/dist/` directory
3. Set environment variables for API URLs

### Full Stack Deployment
The project includes configuration for various deployment platforms. Check the deployment guides in each directory.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [RetroUI](https://github.com/pixel-retroui/pixel-retroui) for the amazing retro UI components
- [OpenAI](https://openai.com/) for the AI analysis capabilities
- [Socket.IO](https://socket.io/) for real-time communication
- All the amazing open-source libraries that made this project possible

## 📞 Support

If you have any questions or run into issues, please:
1. Check the documentation in `backend/README.md` and `frontend/README.md`
2. Look through existing GitHub issues
3. Create a new issue with detailed information about your problem

---

**Happy Drawing! 🎨**