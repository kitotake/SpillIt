import { useMemo, useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Confetti } from '../../components/Confetti/Confetti'
import { useGameStore } from '../../store/useGameStore'
import { sounds, resumeAudio } from '../../utils/sounds'
import './Results.scss'

export function ResultsPage() {
  const navigate = useNavigate()
  const players = useGameStore((s) => s.players)
  const history = useGameStore((s) => s.history)
  const playerName = useGameStore((s) => s.playerName)
  const roomId = useGameStore((s) => s.roomId)
  const reset = useGameStore((s) => s.reset)
  const clearSave = useGameStore((s) => s.clearSave)
  const [confetti, setConfetti] = useState(false)
  const [copied, setCopied] = useState(false)
  const [exported, setExported] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)

  const activePlayers = players.filter((p) => !p.isSpectator)
  const sorted = useMemo(
    () => [...activePlayers].sort((a, b) => b.score - a.score),
    [activePlayers],
  )
  const winner = sorted[0]
  const iWon = winner?.name === playerName

  useEffect(() => {
    resumeAudio()
    setTimeout(() => {
      setConfetti(true)
      if (iWon) sounds.victory()
      else sounds.correct()
    }, 300)
    setTimeout(() => setConfetti(false), 4000)
  }, [])

  const onRestart = () => {
    clearSave()
    reset()
    navigate('/')
  }

  const onCopyRoom = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true)
      sounds.click()
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const onShare = () => {
    const text = sorted
      .map((p, i) => `${['🥇','🥈','🥉'][i] ?? `${i+1}.`} ${p.name} — ${p.score} pt${p.score !== 1 ? 's' : ''}`)
      .join('\n')
    const shareText = `🌶️ Spill It! — Room ${roomId}\n${text}\n\nJoue sur SpillIt!`
    if (navigator.share) {
      navigator.share({ title: 'Spill It! Résultats', text: shareText })
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        sounds.click()
        alert('Résultats copiés dans le presse-papier !')
      })
    }
  }

  const onExport = () => {
    const lines = [
      `🌶️ Spill It! — Résultats — Room ${roomId}`,
      `Date: ${new Date().toLocaleDateString('fr-FR')}`,
      '',
      '=== CLASSEMENT ===',
      ...sorted.map((p, i) => `${i + 1}. ${p.name} — ${p.score} pts${p.streak >= 2 ? ` (🔥 streak x${p.streak})` : ''}`),
      '',
      '=== HISTORIQUE ===',
      ...history.map((r, i) =>
        [
          `Q${i + 1}: ${r.question.text}`,
          `  Majorité: ${r.majority === 'yes' ? 'Oui' : r.majority === 'no' ? 'Non' : 'Égalité'}`,
          ...Object.entries(r.answers).map(([name, ans]) => `  ${name}: ${ans === 'yes' ? 'Oui' : ans === 'no' ? 'Non' : '—'}`),
        ].join('\n'),
      ),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `spillit-${roomId}-${Date.now()}.txt`
    a.click()
    setExported(true)
    sounds.click()
    setTimeout(() => setExported(false), 2000)
  }

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="si-page si-results">
      <Confetti active={confetti} />
      <div className="si-results__inner" ref={resultsRef}>
        <Card className="si-results__card">
          <h1 className="si-results__title">Résultats 🏆</h1>

          {winner && (
            <div className={`si-results__winner ${iWon ? 'si-results__winner--me' : ''}`}>
              {iWon
                ? `🎉 Tu remportes la partie avec ${winner.score} point${winner.score !== 1 ? 's' : ''} !`
                : `🏆 ${winner.name} remporte la partie avec ${winner.score} point${winner.score !== 1 ? 's' : ''} !`}
            </div>
          )}

          <div className="si-results__table">
            <div className="si-results__row si-results__row--header">
              <span>Rang</span>
              <span>Joueur</span>
              <span>Streak</span>
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
                <span>{p.streak >= 2 ? `🔥 x${p.streak}` : '—'}</span>
                <span className="si-results__score">{p.score} pt{p.score !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>

          <div className="si-results__actions">
            <Button onClick={onRestart}>🔄 Rejouer</Button>
            <Button variant="secondary" onClick={onShare}>📤 Partager</Button>
            <Button variant="secondary" onClick={onExport}>
              {exported ? '✅ Exporté !' : '📥 Exporter'}
            </Button>
          </div>

          <div className="si-results__room">
            <span>Room : <strong>{roomId}</strong></span>
            <button className="si-results__copy" onClick={onCopyRoom}>
              {copied ? '✅ Copié !' : '📋 Copier'}
            </button>
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
                      >
                        {ans === 'yes' ? '✅' : ans === 'no' ? '❌' : '—'} {name}
                        {round.streakBonuses?.includes(name) && ' 🔥+1'}
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
