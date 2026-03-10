import { useState, useEffect } from 'react'
import socket from '../socket/socket.js'

function Toast() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    socket.on('guess_correct', ({ playerName, points }) => {
      const id = Date.now()
      setToasts(prev => [...prev, { id, playerName, points }])
      // Auto remove after 3s
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 3000)
    })

    return () => socket.off('guess_correct')
  }, [])

  return (
    <div style={s.container}>
      {toasts.map(toast => (
        <div key={toast.id} style={s.toast}>
          🎉 <strong>{toast.playerName}</strong> guessed it!
          <span style={s.points}>+{toast.points} pts</span>
        </div>
      ))}
    </div>
  )
}

const s = {
  container: { position: 'fixed', top: 20, right: 20, display: 'flex', flexDirection: 'column', gap: 10, zIndex: 999 },
  toast:     { background: '#22c55e', color: 'white', padding: '12px 20px', borderRadius: 12, fontSize: '1rem', fontWeight: 700, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', animation: 'slideIn 0.3s ease' },
  points:    { marginLeft: 10, background: 'rgba(255,255,255,0.3)', padding: '2px 8px', borderRadius: 8 }
}

export default Toast