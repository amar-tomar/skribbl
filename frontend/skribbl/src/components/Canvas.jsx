import { useRef, useEffect, useState, useCallback } from 'react'
import socket from '../socket/socket.js'

function Canvas({ roomId, isDrawer }) {
  const canvasRef = useRef(null)
  const isDrawing = useRef(false)
  const currentStroke = useRef([])   // points in current stroke
  const allStrokes = useRef([])      // all strokes (for undo)

  const [color, setColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState(4)

  const colors = [
    '#000000', '#ffffff', '#ef4444', '#f97316',
    '#eab308', '#22c55e', '#3b82f6', '#8b5cf6',
    '#ec4899', '#6b7280', '#92400e', '#0ea5e9'
  ]

  // ── Draw a single segment on canvas ──────────────────
  const drawSegment = useCallback((ctx, x1, y1, x2, y2, color, size) => {
    ctx.strokeStyle = color
    ctx.lineWidth = size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }, [])

  // ── Redraw everything from strokes array ─────────────
  const redrawAll = useCallback((strokes) => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    strokes.forEach(stroke => {
      for (let i = 1; i < stroke.points.length; i++) {
        drawSegment(
          ctx,
          stroke.points[i-1].x, stroke.points[i-1].y,
          stroke.points[i].x,   stroke.points[i].y,
          stroke.color,
          stroke.size
        )
      }
    })
  }, [drawSegment])

  // ── Socket listeners (receiving other players' drawing) ──
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    // Fill white background on mount
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    let remoteStroke = null  // track incoming stroke

    socket.on('draw_start', ({ x, y, color, size }) => {
      remoteStroke = { points: [{ x, y }], color, size }
    })

    socket.on('draw_move', ({ x, y }) => {
      if (!remoteStroke) return
      const prev = remoteStroke.points[remoteStroke.points.length - 1]
      drawSegment(ctx, prev.x, prev.y, x, y, remoteStroke.color, remoteStroke.size)
      remoteStroke.points.push({ x, y })
    })

    socket.on('draw_end', () => {
      if (remoteStroke) {
        allStrokes.current.push(remoteStroke)
        remoteStroke = null
      }
    })

    socket.on('canvas_clear', () => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      allStrokes.current = []
    })

    socket.on('canvas_redraw', ({ strokes }) => {
      allStrokes.current = strokes
      redrawAll(strokes)
    })

    return () => {
      socket.off('draw_start')
      socket.off('draw_move')
      socket.off('draw_end')
      socket.off('canvas_clear')
      socket.off('canvas_redraw')
    }
  }, [drawSegment, redrawAll])

  // ── Mouse event handlers (only active for drawer) ────
  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  const handleMouseDown = (e) => {
    if (!isDrawer) return
    isDrawing.current = true
    const { x, y } = getPos(e)
    currentStroke.current = { points: [{ x, y }], color, size: brushSize }

    // Draw locally
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(x, y)

    // Tell server
    socket.emit('draw_start', { roomId, x, y, color, size: brushSize })
  }

  const handleMouseMove = (e) => {
    if (!isDrawer || !isDrawing.current) return
    const { x, y } = getPos(e)
    const points = currentStroke.current.points
    const prev = points[points.length - 1]

    // Draw locally
    const ctx = canvasRef.current.getContext('2d')
    drawSegment(ctx, prev.x, prev.y, x, y, color, brushSize)
    points.push({ x, y })

    // Tell server
    socket.emit('draw_move', { roomId, x, y })
  }

  const handleMouseUp = () => {
    if (!isDrawer || !isDrawing.current) return
    isDrawing.current = false
    allStrokes.current.push({ ...currentStroke.current })
    currentStroke.current = []
    socket.emit('draw_end', { roomId })
  }

  // ── Tools ─────────────────────────────────────────────
  const handleClear = () => {
    if (!isDrawer) return
    const ctx = canvasRef.current.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    allStrokes.current = []
    socket.emit('canvas_clear', { roomId })
  }

  const handleUndo = () => {
    if (!isDrawer) return
    allStrokes.current.pop()
    redrawAll(allStrokes.current)
    socket.emit('draw_undo', { roomId, strokes: allStrokes.current })
  }

  return (
    <div style={styles.wrapper}>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        style={{
          ...styles.canvas,
          cursor: isDrawer ? 'crosshair' : 'default'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Tools (only shown to drawer) */}
      {isDrawer && (
        <div style={styles.toolbar}>

          {/* Color palette */}
          <div style={styles.colors}>
            {colors.map(c => (
              <div
                key={c}
                onClick={() => setColor(c)}
                style={{
                  ...styles.colorSwatch,
                  background: c,
                  border: color === c ? '3px solid #333' : '2px solid #ccc'
                }}
              />
            ))}
          </div>

          {/* Brush size */}
          <div style={styles.toolRow}>
            <label>Brush: {brushSize}px</label>
            <input
              type="range" min="1" max="40"
              value={brushSize}
              onChange={e => setBrushSize(Number(e.target.value))}
            />
          </div>

          {/* Buttons */}
          <div style={styles.toolRow}>
            <button style={styles.toolBtn} onClick={handleUndo}>↩ Undo</button>
            <button style={{...styles.toolBtn, background: '#ef4444'}} onClick={handleClear}>
              🗑 Clear
            </button>
          </div>

        </div>
      )}

    </div>
  )
}

const styles = {
  wrapper:     { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' },
  canvas:      { border: '3px solid #333', borderRadius: 8, background: '#fff', touchAction: 'none' },
  toolbar:     { display: 'flex', flexDirection: 'column', gap: '10px', width: 800 },
  colors:      { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  colorSwatch: { width: 28, height: 28, borderRadius: '50%', cursor: 'pointer' },
  toolRow:     { display: 'flex', gap: '10px', alignItems: 'center' },
  toolBtn:     { padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#6b7280', color: 'white', fontSize: '0.9rem' }
}

export default Canvas