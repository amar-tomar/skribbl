class Player {
  constructor(socketId, name, isHost = false) {
    this.id = socketId
    this.name = name
    this.score = 0
    this.isDrawing = false
    this.hasGuessed = false
    this.isHost = isHost
  }

  addScore(points) {
    this.score += points
  }

  resetRound() {
    this.isDrawing = false
    this.hasGuessed = false
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      score: this.score,
      isDrawing: this.isDrawing,
      hasGuessed: this.hasGuessed,
      isHost: this.isHost
    }
  }
}

module.exports = Player