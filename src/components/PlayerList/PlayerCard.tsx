import type { Player } from '../../types/game'
import './PlayerCard.scss'

export type PlayerCardProps = {
  player: Player
  isMe?: boolean
  onToggleReady?: () => void
}

export function PlayerCard({ player, isMe, onToggleReady }: PlayerCardProps) {
  return (
    <div className={`si-player-card ${player.ready ? 'ready' : ''} ${player.isSpectator ? 'spectator' : ''}`}>
      <div className="si-player-card__header">
        <span className="si-player-card__name">
          {player.name}
          {player.isSpectator && <span className="si-player-card__spectator-tag">👁️ Spectateur</span>}
          {player.streak >= 2 && <span className="si-player-card__streak">🔥{player.streak}</span>}
        </span>
        {isMe && !player.isSpectator && (
          <button
            className="si-player-card__ready"
            type="button"
            onClick={onToggleReady}
          >
            {player.ready ? '✅ Ready' : '🕒 Ready?'}
          </button>
        )}
        {isMe && player.isSpectator && (
          <span className="si-player-card__spectator-label">Mode spectateur</span>
        )}
      </div>
      <div className="si-player-card__meta">
        <span>Score : {player.score}</span>
        {!player.isSpectator && (
          <span>{player.answer ? `Répondu : ${player.answer === 'yes' ? 'Oui ✅' : 'Non ❌'}` : 'En attente…'}</span>
        )}
      </div>
    </div>
  )
}