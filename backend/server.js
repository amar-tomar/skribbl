const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const Room = require('./classes/Room');
const Player = require('./classes/Player');
const Game = require('./classes/Game');

// 1. Create express app
const app = express();

// 2. Allow React app to connect
app.use(cors({ origin: 'https://skribbl-frontend-5af0.onrender.com/' || '*' }));
app.use(express.json());

// 3. Wrap express in an HTTP server (Socket.IO needs this)
const server = http.createServer(app);

// 4. Attach Socket.IO to the HTTP server
const io = new Server(server, {
  cors: {
    origin: 'https://skribbl-frontend-5af0.onrender.com/' || '*',
    methods: ['GET', 'POST'],
  },
});

// All active rooms stored in memory
// Key = roomId, Value = Room object
// Example: { "ABC123": Room {...}, "XYZ789": Room {...} }
const rooms = {};
const games = {};

// Generate a random 6-character room code
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// 5. A simple test route
app.get('/', (req, res) => {
  res.json({ message: 'Skribbl server is running!' });
});

// 6. Socket.IO — runs when a client connects
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Test event
  socket.on('hello', (data) => {
    console.log('Received:', data);
    socket.emit('hello_back', { message: 'Server says hi!' });
  });

  //   Create Room
  socket.on('create_room', ({ playerName, settings }) => {
    const roomId = generateRoomId();

    // Create the room and store it
    const room = new Room(roomId, socket.id, settings || {});
    rooms[roomId] = room;

    // Add the host as first player
    const player = room.addPlayer(socket.id, playerName);

    // Join the Socket.IO room (like a group chat)
    socket.join(roomId);

    // Tell the creator their room is ready
    socket.emit('room_created', {
      roomId,
      hostId: socket.id,
      player: player.toJSON(),
      players: room.getPlayersJSON(),
      settings: room.settings,
    });

    console.log(`Room ${roomId} created by ${playerName}`);
  });

  // JOIN ROOM ─────────────
  socket.on('join_room', ({ roomId, playerName }) => {
    const room = rooms[roomId];

    // Validate: does room exist?
    if (!room) {
      socket.emit('error', { message: 'Room not found!' });
      return;
    }

    // Validate: is room full?
    if (room.isFull()) {
      socket.emit('error', { message: 'Room is full!' });
      return;
    }

    // Validate: game already started?
    if (room.gameStarted) {
      socket.emit('error', { message: 'Game already in progress!' });
      return;
    }

    // Add player to room
    const player = room.addPlayer(socket.id, playerName);
    socket.join(roomId);

    // Tell the new player their info + everyone in the room
    socket.emit('room_joined', {
      roomId,
      hostId: room.hostId, // ← added
      player: player.toJSON(),
      players: room.getPlayersJSON(),
      settings: room.settings,
    });

    // Tell EVERYONE ELSE a new player arrived
    socket.to(roomId).emit('player_joined', {
      player: player.toJSON(),
      players: room.getPlayersJSON(),
    });

    console.log(`👤 ${playerName} joined room ${roomId}`);
  });

  // DRAWING EVENTS ────────

  socket.on('draw_start', ({ roomId, x, y, color, size }) => {
    // Broadcast to everyone EXCEPT the drawer
    socket.to(roomId).emit('draw_start', { x, y, color, size });
  });

  socket.on('draw_move', ({ roomId, x, y }) => {
    socket.to(roomId).emit('draw_move', { x, y });
  });

  socket.on('draw_end', ({ roomId }) => {
    socket.to(roomId).emit('draw_end', {});
  });

  socket.on('canvas_clear', ({ roomId }) => {
    socket.to(roomId).emit('canvas_clear', {});
  });

  socket.on('draw_undo', ({ roomId, strokes }) => {
    // Send the full strokes array so others can redraw from scratch
    socket.to(roomId).emit('canvas_redraw', { strokes });
  });

  // START GAME (host only) 
  socket.on('start_game', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;
    if (room.hostId !== socket.id) return; // only host

    const game = new Game(room, io);
    games[roomId] = game;
    game.startGame();
    // ← ADD THIS LINE — tells ALL players to switch to game screen
    io.to(roomId).emit('game_started', {});
  });

  // DRAWER CHOOSES WORD 
  socket.on('word_chosen', ({ roomId, word }) => {
    const game = games[roomId];
    if (!game) return;
    game.wordChosen(word);
  });

  // PLAYER SENDS GUESS ────
  socket.on('guess', ({ roomId, text }) => {
    const game = games[roomId];
    if (!game) return;

    const isCorrect = game.checkGuess(socket.id, text);

    if (!isCorrect) {
      // Broadcast as chat message
      const player = rooms[roomId]?.getPlayer(socket.id);
      if (player) {
        io.to(roomId).emit('chat_message', {
          playerId: socket.id,
          playerName: player.name,
          text,
        });
      }
    }
  });
  //   Disconnect

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    // Find which room this player was in
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const player = room.getPlayer(socket.id);

      if (player) {
        room.removePlayer(socket.id);

        // Tell others this player left
        io.to(roomId).emit('player_left', {
          playerId: socket.id,
          playerName: player.name,
          players: room.getPlayersJSON(),
        });

        // Clean up empty rooms
        if (room.players.length === 0) {
          delete rooms[roomId];
          console.log(`Room ${roomId} deleted (empty)`);
        }

        break;
      }
    }
  });
});

// 7. Start the server
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port http://localhost:${PORT}`);
});
