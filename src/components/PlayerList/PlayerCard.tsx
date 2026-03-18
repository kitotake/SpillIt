import type { Player } from '../../types/game'
import './PlayerCard.scss'

export type PlayerCardProps = {
  player: Player
  isMe?: boolean
  onToggleReady?: () => void
}

export function PlayerCard({ player, isMe, onToggleReady }: PlayerCardProps) {
  return (
    <div className={`si-player-card ${player.ready ? 'ready' : ''}`}>
      <div className="si-player-card__header">
        <span className="si-player-card__name">{player.name}</span>
        {isMe && (
          <button
            className="si-player-card__ready"
            type="button"
            onClick={onToggleReady}
          >
            {player.ready ? '✅ Ready' : '🕒 Ready?'}
          </button>
        )}
      </div>
      <div className="si-player-card__meta">
        <span>Score: {player.score}</span>
        <span>{player.answer ? `Answer: ${player.answer.toUpperCase()}` : 'No answer yet'}</span>
      </div>
    </div>
  )
}
