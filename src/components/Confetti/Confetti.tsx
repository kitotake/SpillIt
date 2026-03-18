import { useEffect, useMemo, useState } from 'react'
import './Confetti.scss'

export type ConfettiProps = {
  active: boolean
}

type Piece = {
  id: string
  style: React.CSSProperties
}

export function Confetti({ active }: ConfettiProps) {
  const pieces = useMemo(() => {
    const count = 35
    return Array.from({ length: count }).map((_, i) => {
      const x = Math.random() * 100
      const delay = Math.random() * 0.5
      const rotation = Math.random() * 360
      const scale = 0.6 + Math.random() * 0.8
      const hue = Math.floor(Math.random() * 360)
      return {
        id: `confetti-${i}`,
        style: {
          left: `${x}%`,
          animationDelay: `${delay}s`,
          transform: `rotate(${rotation}deg) scale(${scale})`,
          background: `hsl(${hue}, 88%, 65%)`,
        },
      }
    })
  }, [])

  const [activePieces, setActivePieces] = useState<Piece[]>([])

  useEffect(() => {
    if (!active) {
      setActivePieces([])
      return
    }
    setActivePieces(pieces)
    const timer = window.setTimeout(() => setActivePieces([]), 2800)
    return () => window.clearTimeout(timer)
  }, [active, pieces])

  if (!active || activePieces.length === 0) return null

  return (
    <div className="si-confetti" aria-hidden="true">
      {activePieces.map((p) => (
        <span key={p.id} className="si-confetti__piece" style={p.style} />
      ))}
    </div>
  )
}
