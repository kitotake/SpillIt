import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useGameStore } from '../../store/useGameStore'
import './Results.scss'

export function ResultsPage() {
  const navigate = useNavigate()
  const players = useGameStore((s) => s.players)
  const reset = useGameStore((s) => s.reset)

  const sorted = useMemo(
    () => [...players].sort((a, b) => b.score - a.score),
    [players],
  )

  const winner = sorted[0]

  const onRestart = () => {
    reset()
    navigate('/')
  }

  return (
    <div className="si-page si-results">
      <Card className="si-results__card">
        <h1>Résultats</h1>
        {winner && (
          <div className="si-results__winner">
            🏆 {winner.name} remporte la partie avec {winner.score} points !
          </div>
        )}

        <div className="si-results__table">
          <div className="si-results__row si-results__row--header">
            <span>Rang</span>
            <span>Joueur</span>
            <span>Score</span>
          </div>
          {sorted.map((p, index) => (
            <div className="si-results__row" key={p.id}>
              <span>{index + 1}</span>
              <span>{p.name}</span>
              <span>{p.score}</span>
            </div>
          ))}
        </div>

        <div className="si-results__actions">
          <Button onClick={onRestart}>Rejouer</Button>
        </div>
      </Card>
    </div>
  )
}
