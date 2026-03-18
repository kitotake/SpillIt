import { useGameStore } from '../../store/useGameStore'
import { PlayerCard } from './PlayerCard'
import './PlayerList.scss'

export function PlayerList() {
  const players = useGameStore((state) => state.players)
  const myName = useGameStore((state) => state.playerName)
  const toggleReady = useGameStore((state) => state.togglePlayerReady)

  return (
    <div className="si-player-list">
      <h3>Players</h3>
      {players.length === 0 ? (
        <p className="si-player-list__empty">Aucun joueur pour le moment.</p>
      ) : (
        <div className="si-player-list__grid">
          {players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              isMe={player.name === myName}
              onToggleReady={() => toggleReady(player.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
