// In-memory storage for games when database is not available
class MemoryStorage {
  constructor() {
    this.games = new Map();
    this.players = new Map();
  }

  // Game management
  createGame(gameData) {
    this.games.set(gameData.lobbyCode, gameData);
    return gameData;
  }

  getGame(lobbyCode) {
    return this.games.get(lobbyCode) || null;
  }

  updateGame(lobbyCode, updates) {
    const game = this.games.get(lobbyCode);
    if (game) {
      const updatedGame = { ...game, ...updates };
      this.games.set(lobbyCode, updatedGame);
      return updatedGame;
    }
    return null;
  }

  deleteGame(lobbyCode) {
    return this.games.delete(lobbyCode);
  }

  getAllGames() {
    return Array.from(this.games.values());
  }

  // Player management
  addPlayerToGame(lobbyCode, player) {
    const game = this.games.get(lobbyCode);
    if (!game) return null;

    // Check if game is full
    if (game.players.length >= game.maxPlayers) {
      throw new Error('Game is full');
    }

    // Check if this socket ID is already in the game
    const existingPlayerIndex = game.players.findIndex(p => p.socketId === player.socketId);
    if (existingPlayerIndex !== -1) {
      // Update existing player's socket ID and return
      return game.players[existingPlayerIndex];
    }

    // Allow duplicate names - just add a number suffix if needed
    let playerName = player.name;
    let counter = 1;
    while (game.players.find(p => p.name === playerName)) {
      playerName = `${player.name} (${counter})`;
      counter++;
    }

    // Assign color based on player position
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
    const assignedColor = colors[game.players.length];
    
    const newPlayer = {
      ...player,
      name: playerName, // Use the potentially modified name
      color: assignedColor,
      isHost: game.players.length === 0 // First player is host
    };

    game.players.push(newPlayer);
    this.games.set(lobbyCode, game);
    
    return newPlayer;
  }

  // Update player socket ID (for reconnections)
  updatePlayerSocketId(lobbyCode, oldSocketId, newSocketId) {
    const game = this.games.get(lobbyCode);
    if (!game) return null;

    const player = game.players.find(p => p.socketId === oldSocketId);
    if (player) {
      player.socketId = newSocketId;
      this.games.set(lobbyCode, game);
      return player;
    }
    return null;
  }

  removePlayerFromGame(lobbyCode, socketId) {
    const game = this.games.get(lobbyCode);
    if (!game) return null;

    const playerIndex = game.players.findIndex(p => p.socketId === socketId);
    if (playerIndex === -1) return null;

    const removedPlayer = game.players[playerIndex];
    game.players.splice(playerIndex, 1);

    // If host left, assign new host
    if (removedPlayer.isHost && game.players.length > 0) {
      game.players[0].isHost = true;
    }

    // If no players left, delete game
    if (game.players.length === 0) {
      this.games.delete(lobbyCode);
    } else {
      this.games.set(lobbyCode, game);
    }

    return removedPlayer;
  }

  // Add drawing stroke to game
  addDrawingStroke(lobbyCode, strokeData) {
    const game = this.games.get(lobbyCode);
    if (!game) return null;

    if (!game.drawingData) {
      game.drawingData = [];
    }

    const stroke = {
      ...strokeData,
      timestamp: new Date().toISOString()
    };

    game.drawingData.push(stroke);
    this.games.set(lobbyCode, game);
    
    return stroke;
  }

  // Get drawing strokes for a game
  getDrawingStrokes(lobbyCode) {
    const game = this.games.get(lobbyCode);
    return game?.drawingData || [];
  }

  // Clear drawing data for a game
  clearDrawingData(lobbyCode) {
    const game = this.games.get(lobbyCode);
    if (game) {
      game.drawingData = [];
      this.games.set(lobbyCode, game);
    }
  }

  // Utility methods
  generateLobbyCode() {
    let code;
    do {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (this.games.has(code));
    return code;
  }

  getGameStats() {
    return {
      totalGames: this.games.size,
      activeGames: Array.from(this.games.values()).filter(g => g.status === 'active').length,
      waitingGames: Array.from(this.games.values()).filter(g => g.status === 'waiting').length
    };
  }

  // Cleanup old games (call periodically)
  cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [lobbyCode, game] of this.games.entries()) {
      if (now - new Date(game.createdAt).getTime() > maxAge) {
        this.games.delete(lobbyCode);
      }
    }
  }

  // Clean up all games (development only)
  clearAllGames() {
    this.games.clear();
    this.players.clear();
    console.log('All games cleared from memory storage');
  }
}

// Create singleton instance
const memoryStorage = new MemoryStorage();

// Cleanup old games every hour
setInterval(() => {
  memoryStorage.cleanup();
}, 60 * 60 * 1000);

module.exports = memoryStorage;