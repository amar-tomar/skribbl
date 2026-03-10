const Player = require('./Player');

class Room {
  constructor(roomId, hostId, settings) {
    this.id = roomId;
    this.hostId = hostId; // who created the room
    this.players = []; // array of Player objects
    this.settings = {
      maxPlayers: settings.maxPlayers || 8,
      rounds: settings.rounds || 3,
      drawTime: settings.drawTime || 80,
    };
    this.gameStarted = false;
  }

  // Add a new player to the room
  addPlayer(socketId, playerName) {
    const isHost = this.players.length === 0; // first player = host
    const player = new Player(socketId, playerName, isHost);
    this.players.push(player);
    return player;
  }

  // Remove player (when they disconnect)
  removePlayer(socketId) {
    this.players = this.players.filter((p) => p.id !== socketId);
  }

  // Find a player by their socket ID
  getPlayer(socketId) {
    return this.players.find((p) => p.id === socketId);
  }

  // Is the room full?
  isFull() {
    return this.players.length >= this.settings.maxPlayers;
  }

  // Get all players as plain objects (safe to send over socket)
  getPlayersJSON() {
    return this.players.map((p) => p.toJSON());
  }
}

module.exports = Room;
