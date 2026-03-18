import { memo } from 'react'
import { useGameStore } from '../../store/useGameStore'
import { PlayerCard } from './PlayerCard'
import './PlayerList.scss'

export const PlayerList = memo(function PlayerList() {
  const players  = useGameStore((s) => s.players)
  const myName   = useGameStore((s) => s.playerName)
  const hostId   = useGameStore((s) => s.hostId)
  const toggleReady = useGameStore((s) => s.togglePlayerReady)

  const active     = players.filter((p) => !p.isSpectator)
  const spectators = players.filter((p) => p.isSpectator)

  return (
    <div className="si-player-list">
      <h3>Joueurs ({active.length})</h3>
      {active.length === 0 ? (
        <p className="si-player-list__empty">Aucun joueur pour le moment.</p>
      ) : (
        <div className="si-player-list__grid">
          {active.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              isMe={player.name === myName}
              isHost={player.id === hostId}
              onToggleReady={() => toggleReady(player.id)}
            />
          ))}
        </div>
      )}

      {spectators.length > 0 && (
        <>
          <h3 className="si-player-list__spectator-title">Spectateurs ({spectators.length})</h3>
          <div className="si-player-list__grid">
            {spectators.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                isMe={player.name === myName}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
})