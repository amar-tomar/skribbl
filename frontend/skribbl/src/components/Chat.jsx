import { useState, useEffect, useRef } from 'react'
import socket from '../socket/socket.js'

function Chat({ roomId, isDrawer, currentWord }) {
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    socket.on('chat_message', ({ playerName, text }) => {
      setMessages(prev => [...prev, {
        type: 'chat', playerName, text
      }])
    })

    socket.on('guess_correct', ({ playerName, points }) => {
      setMessages(prev => [...prev, {
        type: 'correct',
        text: `🎉 ${playerName} guessed the word! (+${points} pts)`
      }])
    })

    socket.on('round_end', ({ word }) => {
      setMessages(prev => [...prev, {
        type: 'info',
        text: `The word was: "${word}"`
      }])
    })

    return () => {
      socket.off('chat_message')
      socket.off('guess_correct')
      socket.off('round_end')
    }
  }, [])

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!input.trim() || isDrawer) return
    socket.emit('guess', { roomId, text: input.trim() })
    setInput('')
  }

  return (
    <div style={styles.container}>
      <div style={styles.messages}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            ...styles.message,
            background: msg.type === 'correct' ? '#dcfce7'
                      : msg.type === 'info'    ? '#fef9c3'
                      : '#f3f4f6'
          }}>
            {msg.type === 'chat'
              ? <><strong>{msg.playerName}:</strong> {msg.text}</>
              : msg.text
            }
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={styles.inputRow}>
        <input
          style={styles.input}
          placeholder={isDrawer ? "You're drawing..." : 'Type your guess...'}
          value={input}
          disabled={isDrawer}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button
          style={styles.btn}
          onClick={handleSend}
          disabled={isDrawer}
        >
          Send
        </button>
      </div>
    </div>
  )
}

const styles = {
  container:  { display: 'flex', flexDirection: 'column', width: 280, height: 560, border: '2px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', fontFamily: 'sans-serif' },
  messages:   { flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: 6 },
  message:    { padding: '6px 10px', borderRadius: 6, fontSize: '0.9rem', wordBreak: 'break-word' },
  inputRow:   { display: 'flex', borderTop: '2px solid #e5e7eb' },
  input:      { flex: 1, padding: '8px', border: 'none', outline: 'none', fontSize: '0.9rem' },
  btn:        { padding: '8px 12px', background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer' }
}

export default Chat