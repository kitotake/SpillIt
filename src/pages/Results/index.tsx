import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useGameStore } from '../../store/useGameStore'
import './Results.scss'

export function ResultsPage() {
  const navigate = useNavigate()
  const players = useGameStore((s) => s.players)
  const history = useGameStore((s) => s.history)
  const playerName = useGameStore((s) => s.playerName)
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

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="si-page si-results">
      <div className="si-results__inner">
        <Card className="si-results__card">
          <h1 className="si-results__title">Résultats 🏆</h1>

          {winner && (
            <div className="si-results__winner">
              {winner.name === playerName
                ? `🎉 Tu remportes la partie avec ${winner.score} point${winner.score > 1 ? 's' : ''} !`
                : `🏆 ${winner.name} remporte la partie avec ${winner.score} point${winner.score > 1 ? 's' : ''} !`}
            </div>
          )}

          <div className="si-results__table">
            <div className="si-results__row si-results__row--header">
              <span>Rang</span>
              <span>Joueur</span>
              <span>Score</span>
            </div>
            {sorted.map((p, index) => (
              <div
                className={`si-results__row ${p.name === playerName ? 'si-results__row--me' : ''}`}
                key={p.id}
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <span>{medals[index] ?? index + 1}</span>
                <span>{p.name}{p.name === playerName && ' (toi)'}</span>
                <span className="si-results__score">{p.score} pt{p.score > 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>

          <div className="si-results__actions">
            <Button onClick={onRestart}>🔄 Rejouer</Button>
          </div>
        </Card>

        {history.length > 0 && (
          <Card className="si-results__history-card">
            <h2 className="si-results__history-title">📜 Historique des rounds</h2>
            <div className="si-results__history">
              {history.map((round, i) => (
                <div className="si-results__round" key={i}>
                  <div className="si-results__round-header">
                    <span className="si-results__round-num">Q{i + 1}</span>
                    <span className="si-results__round-q">{round.question.text}</span>
                  </div>
                  <div className="si-results__round-answers">
                    {Object.entries(round.answers).map(([name, ans]) => (
                      <span
                        key={name}
                        className={`si-results__ans ${
                          ans === round.majority || round.majority === 'tie'
                            ? 'si-results__ans--scored'
                            : 'si-results__ans--miss'
                        }`}
                        title={`${name}: ${ans}`}
                      >
                        {ans === 'yes' ? '✅' : ans === 'no' ? '❌' : '—'} {name}
                      </span>
                    ))}
                    <span className="si-results__majority">
                      Majorité: {round.majority === 'yes' ? '✅ Oui' : round.majority === 'no' ? '❌ Non' : '🤝 Égalité'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}