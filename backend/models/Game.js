const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  socketId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20
  },
  color: {
    type: String,
    required: true,
    enum: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'] // Fixed player colors
  },
  isHost: {
    type: Boolean,
    default: false
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const drawingStrokeSchema = new mongoose.Schema({
  playerId: String,
  color: String,
  points: [{
    x: Number,
    y: Number,
    pressure: { type: Number, default: 1 }
  }],
  strokeWidth: { type: Number, default: 2 },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const gameSchema = new mongoose.Schema({
  lobbyCode: {
    type: String,
    required: true,
    unique: true,
    length: 6,
    uppercase: true
  },
  prompt: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prompt'
  },
  promptText: String, // Denormalized for performance
  players: [playerSchema],
  maxPlayers: {
    type: Number,
    default: 4,
    min: 2,
    max: 4
  },
  status: {
    type: String,
    enum: ['waiting', 'starting', 'active', 'finished', 'abandoned'],
    default: 'waiting'
  },
  gameSettings: {
    duration: { type: Number, default: 300 }, // 5 minutes in seconds
    canvasWidth: { type: Number, default: 800 },
    canvasHeight: { type: Number, default: 600 }
  },
  gameTimer: {
    startTime: Date,
    endTime: Date,
    remainingTime: Number
  },
  drawingData: [drawingStrokeSchema],
  finalCanvas: {
    dataUrl: String, // Base64 encoded canvas image
    metadata: {
      totalStrokes: Number,
      playerContributions: [{
        playerId: String,
        strokeCount: Number,
        colorUsed: String
      }]
    }
  },
  aiResult: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AIResult'
  }
}, {
  timestamps: true
});

// Indexes for performance
gameSchema.index({ status: 1, createdAt: -1 });
gameSchema.index({ 'players.socketId': 1 });

// Virtual for active players count
gameSchema.virtual('activePlayersCount').get(function() {
  return this.players.length;
});

// Virtual for available slots
gameSchema.virtual('availableSlots').get(function() {
  return this.maxPlayers - this.players.length;
});

// Method to add player
gameSchema.methods.addPlayer = function(socketId, name) {
  if (this.players.length >= this.maxPlayers) {
    throw new Error('Game is full');
  }
  
  if (this.status !== 'waiting') {
    throw new Error('Game has already started');
  }

  // Use the name as provided (duplicate handling is done in the service layer)
  const playerName = name;

  // Assign color based on player position
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
  const assignedColor = colors[this.players.length];
  
  const newPlayer = {
    socketId,
    name: playerName,
    color: assignedColor,
    isHost: this.players.length === 0 // First player is host
  };
  
  this.players.push(newPlayer);
  return newPlayer;
};

// Method to remove player
gameSchema.methods.removePlayer = function(socketId) {
  const playerIndex = this.players.findIndex(p => p.socketId === socketId);
  if (playerIndex === -1) return null;
  
  const removedPlayer = this.players[playerIndex];
  this.players.splice(playerIndex, 1);
  
  // If host left, assign new host
  if (removedPlayer.isHost && this.players.length > 0) {
    this.players[0].isHost = true;
  }
  
  return removedPlayer;
};

// Method to start game
gameSchema.methods.startGame = function(prompt) {
  if (this.players.length < 2) {
    throw new Error('Need at least 2 players to start');
  }
  
  this.status = 'active';
  this.prompt = prompt._id;
  this.promptText = prompt.text;
  this.gameTimer.startTime = new Date();
  this.gameTimer.endTime = new Date(Date.now() + this.gameSettings.duration * 1000);
  this.gameTimer.remainingTime = this.gameSettings.duration;
};

// Method to add drawing stroke
gameSchema.methods.addDrawingStroke = function(playerId, strokeData) {
  const player = this.players.find(p => p.socketId === playerId);
  if (!player) {
    throw new Error('Player not found in game');
  }
  
  const stroke = {
    playerId,
    color: player.color, // Enforce player's assigned color
    points: strokeData.points,
    strokeWidth: strokeData.strokeWidth || 2,
    timestamp: new Date()
  };
  
  this.drawingData.push(stroke);
  return stroke;
};

// Method to finish game
gameSchema.methods.finishGame = function(canvasDataUrl) {
  this.status = 'finished';
  this.gameTimer.endTime = new Date();
  
  if (canvasDataUrl) {
    this.finalCanvas.dataUrl = canvasDataUrl;
    
    // Calculate metadata
    const playerContributions = {};
    this.drawingData.forEach(stroke => {
      if (!playerContributions[stroke.playerId]) {
        playerContributions[stroke.playerId] = {
          playerId: stroke.playerId,
          strokeCount: 0,
          colorUsed: stroke.color
        };
      }
      playerContributions[stroke.playerId].strokeCount++;
    });
    
    this.finalCanvas.metadata = {
      totalStrokes: this.drawingData.length,
      playerContributions: Object.values(playerContributions)
    };
  }
};

module.exports = mongoose.model('Game', gameSchema);