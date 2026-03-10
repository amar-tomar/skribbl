import { useEffect } from 'react';
import socket from '../socket/socket.js';

// Give each player a consistent color based on their name
const AVATAR_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
];

function getAvatarColor(name) {
  let hash = 0;
  for (let c of name) hash += c.charCodeAt(0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function Avatar({ name, size = 40 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: getAvatarColor(name),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 800,
        fontSize: size * 0.4,
        flexShrink: 0,
      }}
    >
      {name[0].toUpperCase()}
    </div>
  );
}

function Lobby({ roomData, onUpdatePlayers, onStartGame }) {
  const { roomId, hostId, player, players, settings } = roomData;
  const isHost = player.isHost;

  const shareUrl = `${window.location.origin}?room=${roomId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    alert('Link copied! Share it with friends 🎉');
  };

  useEffect(() => {
    socket.on('player_joined', ({ players }) => onUpdatePlayers(players));
    socket.on('player_left', ({ players }) => onUpdatePlayers(players));

    // ← ADD THIS — switches all players to game screen
    socket.on('game_started', () => {
      onStartGame();
    });

    return () => {
      socket.off('player_joined');
      socket.off('player_left');
      socket.off('game_started'); // ← cleanup too
    };
  }, []);

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h2 style={s.title}>🎮 Game Lobby</h2>

        {/* Room code box */}
        <div style={s.codeBox}>
          <div>
            <div style={s.codeLabel}>Room Code</div>
            <div style={s.code}>{roomId}</div>
          </div>
          <button style={s.copyBtn} onClick={handleCopyLink}>
            🔗 Copy Link
          </button>
        </div>

        {/* Settings pills */}
        <div style={s.pills}>
          <span style={s.pill}>👥 {settings.maxPlayers} players</span>
          <span style={s.pill}>🔄 {settings.rounds} rounds</span>
          <span style={s.pill}>⏱️ {settings.drawTime}s</span>
        </div>

        {/* Player list */}
        <div style={s.playerList}>
          {players.map((p) => (
            <div key={p.id} style={s.playerRow}>
              <Avatar name={p.name} />
              <span style={s.playerName}>
                {p.name}
                {p.id === socket.id && <span style={s.youTag}> You</span>}
              </span>
              {p.id === hostId && <span style={s.crown}>👑</span>}
            </div>
          ))}
        </div>

        {/* Waiting dots if not enough players */}
        {players.length < 2 && (
          <p style={s.waiting}>Waiting for more players to join...</p>
        )}

        {/* Start button */}
        {isHost ?
          <button
            style={{ ...s.startBtn, opacity: players.length < 2 ? 0.5 : 1 }}
            disabled={players.length < 2}
            onClick={() => {
              socket.emit('start_game', { roomId });
              onStartGame();
            }}
          >
            🚀 Start Game
          </button>
        : <div style={s.hostWaiting}>
            <div style={s.spinner} />
            Waiting for host to start...
          </div>
        }
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  card: {
    background: 'white',
    borderRadius: 24,
    padding: '2rem',
    width: '100%',
    maxWidth: 480,
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  title: {
    textAlign: 'center',
    fontSize: '1.8rem',
    fontWeight: 800,
    marginBottom: '1.5rem',
  },
  codeBox: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#f8fafc',
    border: '2px dashed #cbd5e1',
    borderRadius: 12,
    padding: '12px 16px',
    marginBottom: '1rem',
  },
  codeLabel: {
    fontSize: '0.75rem',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  code: {
    fontSize: '2rem',
    fontWeight: 800,
    letterSpacing: 6,
    color: '#3b82f6',
  },
  copyBtn: {
    padding: '10px 16px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    fontSize: '0.9rem',
  },
  pills: { display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' },
  pill: {
    background: '#f0f4ff',
    color: '#3b82f6',
    padding: '6px 14px',
    borderRadius: 20,
    fontSize: '0.85rem',
    fontWeight: 700,
  },
  playerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginBottom: '1.5rem',
  },
  playerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 14px',
    background: '#f8fafc',
    borderRadius: 12,
  },
  playerName: { flex: 1, fontWeight: 700, fontSize: '1rem' },
  youTag: {
    background: '#3b82f6',
    color: 'white',
    borderRadius: 6,
    padding: '2px 8px',
    fontSize: '0.75rem',
    marginLeft: 6,
  },
  crown: { fontSize: '1.2rem' },
  waiting: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '0.9rem',
    marginBottom: '1rem',
  },
  startBtn: {
    width: '100%',
    padding: '14px',
    fontSize: '1.1rem',
    borderRadius: 14,
    border: 'none',
    background: 'linear-gradient(135deg, #f97316, #ef4444)',
    color: 'white',
    fontWeight: 800,
  },
  hostWaiting: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    color: '#888',
    padding: '12px',
  },
  spinner: {
    width: 18,
    height: 18,
    border: '3px solid #e5e7eb',
    borderTop: '3px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

export default Lobby;
