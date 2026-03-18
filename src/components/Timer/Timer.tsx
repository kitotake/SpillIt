import { useEffect, useRef } from 'react'
import './Timer.scss'

export type TimerProps = {
  seconds: number
  maxSeconds: number
  danger?: boolean
  onTick?: () => void
}

export function Timer({ seconds, maxSeconds, danger, onTick }: TimerProps) {
  const prevSeconds = useRef(seconds)

  useEffect(() => {
    if (!onTick) return
    if (seconds !== prevSeconds.current) {
      onTick()
    }
    prevSeconds.current = seconds
  }, [seconds, onTick])

  const pct = Math.max(0, Math.min(1, seconds / maxSeconds))
  return (
    <div
      className={`si-timer ${danger ? 'si-timer--danger' : ''}`}
      aria-label={`Time remaining ${seconds} seconds`}
    >
      <div className="si-timer__bar" style={{ width: `${pct * 100}%` }} />
      <span className="si-timer__label">{seconds}s</span>
    </div>
  )
}