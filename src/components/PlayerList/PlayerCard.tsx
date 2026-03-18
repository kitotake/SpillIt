import { memo } from 'react'
import { Avatar } from '../Avatar/AvatarGenerator'
import type { Player } from '../../types/game'
import './PlayerCard.scss'

export type PlayerCardProps = {
  player: Player
  isMe?: boolean
  isHost?: boolean
  onToggleReady?: () => void
}

export const PlayerCard = memo(function PlayerCard({ player, isMe, isHost, onToggleReady }: PlayerCardProps) {
  return (
    <div className={`si-player-card ${player.ready ? 'ready' : ''} ${player.isSpectator ? 'spectator' : ''}`}>
      <div className="si-player-card__header">
        <div className="si-player-card__left">
          <Avatar name={player.name} size={36} />
          <span className="si-player-card__name">
            {player.name}
            {isHost && <span className="si-player-card__host-tag">👑</span>}
            {player.isSpectator && <span className="si-player-card__spectator-tag">👁️</span>}
            {player.streak >= 2 && <span className="si-player-card__streak">🔥{player.streak}</span>}
          </span>
        </div>

        {isMe && !player.isSpectator && (
          <button className="si-player-card__ready" type="button" onClick={onToggleReady}>
            {player.ready ? '✅ Ready' : '🕒 Ready?'}
          </button>
        )}
        {isMe && player.isSpectator && (
          <span className="si-player-card__spectator-label">Spectateur</span>
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
})