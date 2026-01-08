const express = require('express');
const gameController = require('../controllers/gameController');

const router = express.Router();

// Create a new game
router.post('/create', gameController.createGame);

// Join an existing game
router.post('/join', gameController.joinGame);

// Get game status
router.get('/:lobbyCode/status', gameController.getGameStatus);

// Start game (host only)
router.post('/:lobbyCode/start', gameController.startGame);

// Submit final drawing
router.post('/:lobbyCode/submit', gameController.submitDrawing);

// Get game results
router.get('/:lobbyCode/results', gameController.getGameResults);

// Leave game
router.post('/:lobbyCode/leave', gameController.leaveGame);

// Get active games (admin/monitoring)
router.get('/', gameController.getActiveGames);

module.exports = router;