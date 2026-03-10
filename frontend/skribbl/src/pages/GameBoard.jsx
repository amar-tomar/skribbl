import { useState, useEffect } from 'react'
import Canvas from '../components/Canvas'
import Chat from '../components/Chat'
import Toast from '../components/Toast'
import socket from '../socket/socket.js'

const AVATAR_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#14b8a6']
function getAvatarColor(name) {
  let hash = 0
  for (let c of name) hash += c.charCodeAt(0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function Avatar({ name, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: getAvatarColor(name),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontWeight: 800, fontSize: size * 0.4, flexShrink: 0
    }}>
      {name[0].toUpperCase()}
    </div>
  )
}

// Big spaced out hint letters  e.g.  _ P _ _ _ _
function HintDisplay({ hint }) {
  if (!hint) return null
  return (
    <div style={s.hintRow}>
      {hint.split(' ').map((ch, i) => (
        <span key={i} style={ch === '_' ? s.blank : s.letter}>
          {ch === '_' ? '' : ch}
        </span>
      ))}
    </div>
  )
}

export default function GameBoard({ roomData }) {
  const { roomId } = roomData

  const [phase, setPhase]             = useState('word_selection')
  const [players, setPlayers]         = useState(roomData.players)
  const [drawerId, setDrawerId]       = useState(null)
  const [drawerName, setDrawerName]   = useState('')
  const [wordOptions, setWordOptions] = useState([])
  const [hint, setHint]               = useState('')
  const [timeLeft, setTimeLeft]       = useState(0)
  const [round, setRound]             = useState(1)
  const [totalRounds]                 = useState(roomData.settings.rounds)
  const [roundWord, setRoundWord]     = useState('')
  const [gameOver, setGameOver]       = useState(null)

  const isDrawer = drawerId === socket.id

  // Timer color
  const timerColor = timeLeft <= 10 ? '#ef4444' : timeLeft <= 30 ? '#f97316' : '#22c55e'

  useEffect(() => {
    socket.on('round_start', (data) => {
      setPhase('word_selection')
      setDrawerId(data.drawerId)
      setDrawerName(data.drawerName)
      setRound(data.round)
      setPlayers(data.players)
      setHint('')
      setRoundWord('')
    })

    socket.on('choose_word',     ({ words })        => setWordOptions(words))
    socket.on('drawing_started', ({ hint, timeLeft }) => { setPhase('drawing'); setHint(hint); setTimeLeft(timeLeft); setWordOptions([]) })
    socket.on('timer_update',    ({ timeLeft })      => setTimeLeft(timeLeft))
    socket.on('hint_update',     ({ hint })          => setHint(hint))
    socket.on('guess_correct',   ({ players })       => setPlayers(players))
    socket.on('round_end',       ({ word, players }) => { setPhase('round_end'); setRoundWord(word); setPlayers(players) })
    socket.on('game_over',       (data)              => { setGameOver(data); setPhase('game_over') })

    return () => {
      ['round_start','choose_word','drawing_started','timer_update',
       'hint_update','guess_correct','round_end','game_over']
        .forEach(e => socket.off(e))
    }
  }, [])

  // ── Game Over ────────────────────────────────────────
  if (phase === 'game_over' && gameOver) {
    return (
      <div style={s.gameOverPage}>
        <div style={s.gameOverCard}>
          <div style={{ fontSize: '5rem' }}>🏆</div>
          <h1 style={s.gameOverTitle}>Game Over!</h1>
          <div style={s.winnerBox}>
            <Avatar name={gameOver.winner.name} size={60} />
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{gameOver.winner.name}</div>
              <div style={{ color: '#f97316', fontWeight: 700 }}>🥇 Winner with {gameOver.winner.score} pts</div>
            </div>
          </div>
          <div style={s.leaderboard}>
            {gameOver.leaderboard.map((p, i) => (
              <div key={p.id} style={s.leaderRow}>
                <span style={s.leaderRank}>{['🥇','🥈','🥉'][i] || `${i+1}.`}</span>
                <Avatar name={p.name} size={32} />
                <span style={{ flex: 1, fontWeight: 700 }}>{p.name}</span>
                <span style={s.leaderScore}>{p.score} pts</span>
              </div>
            ))}
          </div>
          <button style={s.playAgainBtn} onClick={() => window.location.reload()}>
            🔄 Play Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <Toast />

      {/* Header */}
      <div style={s.header}>
        <div style={s.roundBadge}>Round {round}/{totalRounds}</div>
        <HintDisplay hint={hint} />
        <div style={{ ...s.timer, color: timerColor, borderColor: timerColor }}>
          {timeLeft}s
        </div>
      </div>

      {/* Drawer label */}
      <div style={s.drawerLabel}>
        {isDrawer
          ? '🖊️ You are drawing! Others are guessing...'
          : `👀 ${drawerName} is drawing`
        }
      </div>

      {/* Main area */}
      <div style={s.main}>

        {/* Players sidebar */}
        <div style={s.sidebar}>
          {players.map(p => (
            <div key={p.id} style={{
              ...s.playerCard,
              boxShadow: p.id === drawerId ? '0 0 0 2px #f97316' : 'none'
            }}>
              <Avatar name={p.name} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.pName}>
                  {p.name}
                  {p.id === socket.id && <span style={s.youTag}>You</span>}
                </div>
                <div style={s.pScore}>{p.score} pts</div>
              </div>
              <span style={{ fontSize: '1.1rem' }}>
                {p.id === drawerId  ? '✏️'
                : p.hasGuessed      ? '✅'
                : ''}
              </span>
            </div>
          ))}
        </div>

        {/* Canvas area */}
        <div style={{ position: 'relative' }}>
          <Canvas roomId={roomId} isDrawer={isDrawer} />

          {/* Word selection overlay */}
          {phase === 'word_selection' && isDrawer && wordOptions.length > 0 && (
            <div style={s.overlay}>
              <div style={s.overlayCard}>
                <div style={{ fontSize: '2rem' }}>🤔</div>
                <h3 style={s.overlayTitle}>Choose a word to draw</h3>
                <div style={s.wordOptions}>
                  {wordOptions.map(word => (
                    <button
                      key={word}
                      style={s.wordBtn}
                      onClick={() => socket.emit('word_chosen', { roomId, word })}
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Waiting overlay (guessers during word selection) */}
          {phase === 'word_selection' && !isDrawer && (
            <div style={s.overlay}>
              <div style={s.overlayCard}>
                <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>⏳</div>
                <h3>{drawerName} is choosing a word...</h3>
              </div>
            </div>
          )}

          {/* Round end overlay */}
          {phase === 'round_end' && (
            <div style={s.overlay}>
              <div style={s.overlayCard}>
                <div style={{ fontSize: '2.5rem' }}>🎨</div>
                <h3 style={s.overlayTitle}>Round Over!</h3>
                <p style={{ color: '#555', marginBottom: 8 }}>The word was:</p>
                <div style={s.revealedWord}>{roundWord}</div>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Next round starting...</p>
              </div>
            </div>
          )}
        </div>

        {/* Chat */}
        <Chat roomId={roomId} isDrawer={isDrawer} />

      </div>
    </div>
  )
}

const s = {
  page:          { minHeight: '100vh', background: '#f0f4ff', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  header:        { display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: 10, flexWrap: 'wrap', justifyContent: 'center' },
  roundBadge:    { background: '#3b82f6', color: 'white', padding: '6px 16px', borderRadius: 20, fontWeight: 800, fontSize: '0.9rem' },
  timer:         { fontSize: '1.5rem', fontWeight: 800, border: '3px solid', borderRadius: 10, padding: '4px 14px', minWidth: 70, textAlign: 'center', transition: 'color 0.5s' },
  drawerLabel:   { color: '#64748b', marginBottom: 12, fontWeight: 600 },
  hintRow:       { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
  blank:         { width: 28, height: 36, borderBottom: '3px solid #1e1e2e', display: 'inline-block' },
  letter:        { width: 28, height: 36, borderBottom: '3px solid #3b82f6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem', color: '#3b82f6', textTransform: 'uppercase' },
  main:          { display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center' },
  sidebar:       { width: 170, display: 'flex', flexDirection: 'column', gap: 8 },
  playerCard:    { display: 'flex', alignItems: 'center', gap: 8, background: 'white', padding: '8px 10px', borderRadius: 12 },
  pName:         { fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  pScore:        { color: '#64748b', fontSize: '0.8rem' },
  youTag:        { background: '#3b82f6', color: 'white', fontSize: '0.65rem', borderRadius: 4, padding: '1px 5px', marginLeft: 4 },
  overlay:       { position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, zIndex: 50 },
  overlayCard:   { background: 'white', borderRadius: 20, padding: '2rem', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' },
  overlayTitle:  { fontSize: '1.3rem', fontWeight: 800, margin: '8px 0 16px' },
  wordOptions:   { display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' },
  wordBtn:       { padding: '12px 22px', fontSize: '1rem', borderRadius: 12, border: '2px solid #e5e7eb', background: 'white', fontWeight: 700, transition: 'all 0.15s', cursor: 'pointer' },
  revealedWord:  { fontSize: '2rem', fontWeight: 800, color: '#3b82f6', letterSpacing: 2, margin: '8px 0 12px', textTransform: 'capitalize' },
  gameOverPage:  { minHeight: '100vh', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  gameOverCard:  { background: 'white', borderRadius: 24, padding: '2.5rem', textAlign: 'center', maxWidth: 480, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' },
  gameOverTitle: { fontSize: '2.5rem', fontWeight: 800, margin: '8px 0 1.5rem' },
  winnerBox:     { display: 'flex', alignItems: 'center', gap: 16, background: '#fef9c3', borderRadius: 16, padding: '1rem 1.5rem', marginBottom: '1.5rem', textAlign: 'left' },
  leaderboard:   { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1.5rem' },
  leaderRow:     { display: 'flex', alignItems: 'center', gap: 12, background: '#f8fafc', padding: '10px 14px', borderRadius: 12 },
  leaderRank:    { fontSize: '1.3rem', width: 30 },
  leaderScore:   { fontWeight: 800, color: '#3b82f6' },
  playAgainBtn:  { width: '100%', padding: '14px', fontSize: '1.1rem', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #f97316, #ef4444)', color: 'white', fontWeight: 800 }
}
