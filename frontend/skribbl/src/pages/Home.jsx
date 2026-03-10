import { useEffect, useState } from 'react'
import socket from '../socket/socket.js'

function Home({ onRoomReady }) {
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode]     = useState('')
  const [error, setError]           = useState('')
  const [mode, setMode]             = useState(null)
  const [loading, setLoading]       = useState(false)

  // Auto-fill room code from URL
  // e.g. if someone shares ?room=ABC123
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('room')
    if (code) {
      setRoomCode(code.toUpperCase())
      setMode('join')
    }
  }, [])

  useEffect(() => {
    socket.on('room_created', (data) => { setLoading(false); onRoomReady(data) })
    socket.on('room_joined',  (data) => { setLoading(false); onRoomReady(data) })
    socket.on('error', (data) => { setLoading(false); setError(data.message) })
    return () => {
      socket.off('room_created')
      socket.off('room_joined')
      socket.off('error')
    }
  }, [])

  const handleCreate = () => {
    if (!playerName.trim()) return setError('Enter your name first!')
    setError('')
    setLoading(true)
    socket.emit('create_room', {
      playerName: playerName.trim(),
      settings: { maxPlayers: 8, rounds: 3, drawTime: 80 }
    })
  }

  const handleJoin = () => {
    if (!playerName.trim()) return setError('Enter your name first!')
    if (!roomCode.trim())   return setError('Enter a room code!')
    setError('')
    setLoading(true)
    socket.emit('join_room', {
      playerName: playerName.trim(),
      roomId: roomCode.trim().toUpperCase()
    })
  }

  return (
    <div style={s.page}>
      <div style={s.card}>

        {/* Logo */}
        <div style={s.logo}>🎨</div>
        <h1 style={s.title}>Skribbl Clone</h1>
        <p style={s.subtitle}>Draw. Guess. Win.</p>

        {/* Name input */}
        <input
          style={s.input}
          placeholder="Enter your name..."
          value={playerName}
          maxLength={20}
          onChange={e => { setPlayerName(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && (mode === 'join' ? handleJoin() : handleCreate())}
        />

        {error && (
          <div style={s.error}>⚠️ {error}</div>
        )}

        {/* Mode buttons */}
        {!mode && (
          <div style={s.btnRow}>
            <button style={s.btnBlue} onClick={() => setMode('create')}>
              🏠 Create Room
            </button>
            <button style={s.btnGreen} onClick={() => setMode('join')}>
              🚪 Join Room
            </button>
          </div>
        )}

        {/* Create flow */}
        {mode === 'create' && (
          <div style={s.modeBox}>
            <button style={s.btnBlue} onClick={handleCreate} disabled={loading}>
              {loading ? '⏳ Creating...' : '🏠 Create & Enter Lobby'}
            </button>
            <button style={s.btnGhost} onClick={() => setMode(null)}>← Back</button>
          </div>
        )}

        {/* Join flow */}
        {mode === 'join' && (
          <div style={s.modeBox}>
            <input
              style={{ ...s.input, textTransform: 'uppercase', letterSpacing: 4, fontWeight: 800 }}
              placeholder="Room Code"
              value={roomCode}
              maxLength={6}
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
            <button style={s.btnGreen} onClick={handleJoin} disabled={loading}>
              {loading ? '⏳ Joining...' : '🚪 Join Room'}
            </button>
            <button style={s.btnGhost} onClick={() => setMode(null)}>← Back</button>
          </div>
        )}

      </div>
    </div>
  )
}

const s = {
  page:     { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  card:     { background: 'white', borderRadius: 24, padding: '2.5rem 2rem', width: '100%', maxWidth: 420, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  logo:     { fontSize: '4rem', marginBottom: '0.5rem' },
  title:    { fontSize: '2.2rem', fontWeight: 800, color: '#1e1e2e', marginBottom: 4 },
  subtitle: { color: '#888', marginBottom: '1.5rem', fontSize: '1rem' },
  input:    { width: '100%', padding: '12px 16px', fontSize: '1rem', borderRadius: 12, border: '2px solid #e5e7eb', outline: 'none', marginBottom: '1rem', transition: 'border 0.2s' },
  error:    { background: '#fef2f2', color: '#dc2626', padding: '10px', borderRadius: 8, marginBottom: '1rem', fontSize: '0.9rem' },
  btnRow:   { display: 'flex', gap: '1rem', justifyContent: 'center' },
  btnBlue:  { flex: 1, padding: '12px', fontSize: '1rem', borderRadius: 12, border: 'none', background: '#3b82f6', color: 'white' },
  btnGreen: { flex: 1, padding: '12px', fontSize: '1rem', borderRadius: 12, border: 'none', background: '#22c55e', color: 'white' },
  btnGhost: { background: 'none', border: 'none', color: '#888', marginTop: 8, fontSize: '0.9rem' },
  modeBox:  { display: 'flex', flexDirection: 'column', gap: 8 }
}

export default Home