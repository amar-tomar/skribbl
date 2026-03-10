class Game {
  constructor(room, io) {
    this.room = room;
    this.io = io;
    this.round = 1;
    this.drawerIndex = 0;
    this.currentWord = null;
    this.timer = null;
    this.timeLeft = 0;
    this.phase = 'waiting'; // waiting | word_selection | drawing | round_end | game_over

    // Word list
    this.words = [
      'apple',
      'banana',
      'guitar',
      'elephant',
      'pizza',
      'rocket',
      'umbrella',
      'dragon',
      'castle',
      'penguin',
      'volcano',
      'bicycle',
      'rainbow',
      'submarine',
      'cactus',
      'butterfly',
      'telescope',
      'tornado',
      'dinosaur',
      'lighthouse',
    ];
  }

  // Get current drawer
  getDrawer() {
    return this.room.players[this.drawerIndex];
  }

  // Pick N random words
  getRandomWords(n = 3) {
    const shuffled = [...this.words].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  }

  // Build hint from word  // 'elephant' → '_ _ _ _ _ _ _ _'
  getHint(word, revealCount = 0) {
    const letters = word.split('');
    const revealed = new Set();

    // Always reveal spaces
    letters.forEach((l, i) => {
      if (l === ' ') revealed.add(i);
    });

    // Randomly reveal extra letters
    let attempts = 0;
    while (revealed.size < revealCount && attempts < 100) {
      const i = Math.floor(Math.random() * letters.length);
      if (letters[i] !== ' ') revealed.add(i);
      attempts++;
    }

    return letters
      .map((l, i) =>
        revealed.has(i) ? l
        : l === ' ' ? ' '
        : '_',
      )
      .join(' ');
  }

  // Start the whole game
  startGame() {
    this.room.gameStarted = true;
    this.phase = 'word_selection';

    // Reset all scores
    this.room.players.forEach((p) => {
      p.score = 0;
    });

    this.startRound();
  }

  // Start a single round
  startRound() {
    const drawer = this.getDrawer();

    // Reset guessed state for all players
    this.room.players.forEach((p) => {
      p.hasGuessed = false;
      p.isDrawing = p.id === drawer.id;
    });

    this.phase = 'word_selection';

    const wordOptions = this.getRandomWords(3);

    // Tell EVERYONE a new round started
    this.io.to(this.room.id).emit('round_start', {
      round: this.round,
      totalRounds: this.room.settings.rounds,
      drawerId: drawer.id,
      drawerName: drawer.name,
      players: this.room.getPlayersJSON(),
    });

    // Send word choices ONLY to drawer
    const drawerSocket = this.io.sockets.sockets.get(drawer.id);
    if (drawerSocket) {
      drawerSocket.emit('choose_word', { words: wordOptions });
    }
  }

  // Drawer picked a word → start timer ──────────────
  wordChosen(word) {
    this.currentWord = word;
    this.phase = 'drawing';
    this.timeLeft = this.room.settings.drawTime;

    const hint = this.getHint(word); // all blanks at start

    // Tell everyone drawing has begun (word hidden)
    this.io.to(this.room.id).emit('drawing_started', {
      wordLength: word.length,
      hint,
      timeLeft: this.timeLeft,
    });

    // Start countdown
    this.timer = setInterval(() => {
      this.timeLeft--;

      // Reveal a letter every 20 seconds
      if (this.timeLeft % 20 === 0 && this.timeLeft > 0) {
        const revealCount = Math.floor(
          (this.room.settings.drawTime - this.timeLeft) / 20,
        );
        const newHint = this.getHint(word, revealCount);
        this.io.to(this.room.id).emit('hint_update', { hint: newHint });
      }

      // Broadcast time
      this.io
        .to(this.room.id)
        .emit('timer_update', { timeLeft: this.timeLeft });

      // Time ran out
      if (this.timeLeft <= 0) {
        this.endRound();
      }
    }, 1000);
  }

  // Check a guess ──────
  checkGuess(playerId, guess) {
    const player = this.room.getPlayer(playerId);
    if (!player || player.hasGuessed || player.isDrawing) return false;
    if (this.phase !== 'drawing') return false;

    const isCorrect =
      guess.trim().toLowerCase() === this.currentWord.toLowerCase();

    if (isCorrect) {
      player.hasGuessed = true;

      // Points based on time left
      const points = Math.max(50, this.timeLeft * 10);
      player.addScore(points);

      // Also give drawer points
      const drawer = this.getDrawer();
      drawer.addScore(20);

      this.io.to(this.room.id).emit('guess_correct', {
        playerId,
        playerName: player.name,
        points,
        players: this.room.getPlayersJSON(),
      });

      // Did everyone guess?
      const nonDrawers = this.room.players.filter((p) => !p.isDrawing);
      const allGuessed = nonDrawers.every((p) => p.hasGuessed);
      if (allGuessed) this.endRound();
    }

    return isCorrect;
  }

  // End round ──────────
  endRound() {
    clearInterval(this.timer);
    this.phase = 'round_end';

    this.io.to(this.room.id).emit('round_end', {
      word: this.currentWord,
      players: this.room.getPlayersJSON(),
    });

    // Wait 4 seconds then go to next round
    setTimeout(() => {
      this.nextRound();
    }, 4000);
  }

  // Move to next round or end game ───────────────────
  nextRound() {
    this.drawerIndex++;

    // Went through all players = 1 full round
    if (this.drawerIndex >= this.room.players.length) {
      this.drawerIndex = 0;
      this.round++;
    }

    // All rounds done?
    if (this.round > this.room.settings.rounds) {
      this.endGame();
      return;
    }

    // Clear canvas for new round
    this.io.to(this.room.id).emit('canvas_clear', {});
    this.currentWord = null;
    this.startRound();
  }

  // End game ───────────
  endGame() {
    this.phase = 'game_over';

    const sorted = [...this.room.players].sort((a, b) => b.score - a.score);
    const winner = sorted[0];

    this.io.to(this.room.id).emit('game_over', {
      winner: winner.toJSON(),
      leaderboard: sorted.map((p) => p.toJSON()),
    });
  }
}

module.exports = Game;
