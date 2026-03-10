import { useState } from 'react'
import Home from './pages/Home'
import Lobby from './pages/Lobby'
import GameBoard from './pages/GameBoard'

function App() {
  const [screen, setScreen]     = useState('home')
  const [roomData, setRoomData] = useState(null)

  const handleRoomReady = (data) => {
    setRoomData(data)
    setScreen('lobby')
  }

  const handleUpdatePlayers = (players) => {
    setRoomData(prev => ({ ...prev, players }))
  }

  // Temporary: go to game when host clicks Start
  const handleStartGame = () => {
    setScreen('game')
  }

  if (screen === 'home')  return <Home onRoomReady={handleRoomReady} />
  if (screen === 'lobby') return (
    <Lobby
      roomData={roomData}
      onUpdatePlayers={handleUpdatePlayers}
      onStartGame={handleStartGame}
    />
  )
  if (screen === 'game')  return <GameBoard roomData={roomData} />
}

export default App