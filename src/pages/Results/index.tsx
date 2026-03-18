import { useMemo, useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card }     from '../../components/ui/Card'
import { Button }   from '../../components/ui/Button'
import { Confetti } from '../../components/Confetti/Confetti'
import { Avatar }   from '../../components/Avatar/AvatarGenerator'
import { ConnectionStatus } from '../../components/ConnectionStatus/ConnectionStatus'
import { useGameStore }     from '../../store/useGameStore'
import { sounds, resumeAudio } from '../../utils/sounds'
import './Results.scss'

type SortedPlayer = { id: string; name: string; score: number; streak: number }

function getPlayerTitle(player: SortedPlayer, sorted: SortedPlayer[], history: any[]): string {
  const rank = sorted.findIndex((p) => p.name === player.name)
  const total = sorted.length
  const maxScore = sorted[0]?.score ?? 0
  const allAns = history.flatMap((r) => Object.entries(r.answers))
  const yesCount = allAns.filter(([n, a]) => n === player.name && a === 'yes').length
  const noCount  = allAns.filter(([n, a]) => n === player.name && a === 'no').length

  if (rank === 0 && maxScore === 0) return '🏳️ Abstentionniste en chef'
  if (rank === 0) {
    if (player.streak >= 4) return '🔥 Génie absolu'
    if (player.score >= total * 3) return '🧠 Le Cerveau'
    return '👑 Le Grand Gagnant'
  }
  if (rank === sorted.length - 1) {
    if (player.score === 0) return '💀 Score négatif de l\'existence'
    const titles = ['🐢 La Tortue Perdue', '🍄 Dernier et Fier', '🎭 L\'Anti-Conformiste', '🌈 L\'Original Incompris']
    return titles[player.name.length % titles.length]
  }
  if (yesCount > noCount * 2) return '✅ Éternel Optimiste'
  if (noCount > yesCount * 2) return '❌ Le Grand Pessimiste'
  if (player.streak >= 3) return '🔥 En Feu'
  if (rank === 1) return '🥈 L\'Éternel Second'
  if (rank === 2) return '🥉 Le Troisième Mousquetaire'
  const mid = ['🎯 Stratège Moyen', '🌊 Dans la Moyenne', '🦆 Ni Chaud Ni Froid']
  return mid[rank % mid.length]
}

export function ResultsPage() {
  const navigate = useNavigate()

  const players    = useGameStore((s) => s.players)
  const history    = useGameStore((s) => s.history)
  const playerName = useGameStore((s) => s.playerName)
  const roomId     = useGameStore((s) => s.roomId)
  const reset      = useGameStore((s) => s.reset)
  const clearSave  = useGameStore((s) => s.clearSave)

  const [confetti, setConfetti]       = useState(false)
  const [copied, setCopied]           = useState(false)
  const [exported, setExported]       = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  // Animated podium — reveal one card per 200ms
  const [visibleCount, setVisibleCount] = useState(0)
  const resultsRef = useRef<HTMLDivElement>(null)

  const activePlayers = useMemo(() => players.filter((p) => !p.isSpectator), [players])
  const sorted = useMemo(
    () => [...activePlayers].sort((a, b) => b.score - a.score),
    [activePlayers],
  )
  const winner = sorted[0]
  const iWon = winner?.name === playerName

  // Staggered podium reveal
  useEffect(() => {
    resumeAudio()
    const timers: ReturnType<typeof setTimeout>[] = []
    sorted.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleCount(i + 1), 300 + i * 220))
    })
    // Confetti + sound after last card
    timers.push(setTimeout(() => {
      setConfetti(true)
      if (iWon) sounds.victory(); else sounds.correct()
    }, 300 + sorted.length * 220))
    timers.push(setTimeout(() => setConfetti(false), 4500))
    return () => timers.forEach(clearTimeout)
  }, []) // eslint-disable-line

  const onRestart = () => { clearSave(); reset(); navigate('/') }

  const onCopyRoom = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true); sounds.click()
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const onShare = () => {
    const text = sorted
      .map((p, i) => `${['🥇','🥈','🥉'][i] ?? `${i+1}.`} ${p.name} — ${p.score}pts ${getPlayerTitle(p, sorted, history)}`)
      .join('\n')
    const shareText = `🌶️ Spill It! — Room ${roomId}\n${text}\n\nJoue sur SpillIt!`
    if (navigator.share) {
      navigator.share({ title: 'Spill It! Résultats', text: shareText })
    } else {
      navigator.clipboard.writeText(shareText).then(() => { sounds.click(); alert('Résultats copiés !') })
    }
  }

  const onExport = () => {
    const lines = [
      `🌶️ Spill It! — Résultats — Room ${roomId}`,
      `Date: ${new Date().toLocaleDateString('fr-FR')}`,
      '',
      '=== CLASSEMENT ===',
      ...sorted.map((p, i) => `${i + 1}. ${p.name} — ${p.score} pts ${getPlayerTitle(p, sorted, history)}`),
      '',
      '=== HISTORIQUE ===',
      ...history.map((r, i) => [
        `Q${i + 1}: ${r.question.text}`,
        `  Majorité: ${r.majority === 'yes' ? 'Oui' : r.majority === 'no' ? 'Non' : 'Égalité'}`,
        ...Object.entries(r.answers).map(([n, a]) => `  ${n}: ${a === 'yes' ? 'Oui' : a === 'no' ? 'Non' : '—'}`),
      ].join('\n')),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `spillit-${roomId}-${Date.now()}.txt`
    a.click()
    setExported(true); sounds.click()
    setTimeout(() => setExported(false), 2000)
  }

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="si-page si-results-v2">
      <Confetti active={confetti} />
      <ConnectionStatus />

      <div className="si-results-v2__inner" ref={resultsRef}>

        {/* WIN BANNER */}
        <div className={`si-results-v2__banner ${iWon ? 'si-results-v2__banner--win' : ''}`}>
          <div className="si-results-v2__banner-emoji">{iWon ? '🏆' : '🎮'}</div>
          <div className="si-results-v2__banner-text">
            {iWon
              ? `Tu remportes la partie, ${winner.name} !`
              : winner ? `${winner.name} remporte la partie !` : 'Partie terminée !'}
          </div>
          {iWon && (
            <div className="si-results-v2__banner-sub">
              avec {winner.score} point{winner.score !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* PODIUM — staggered reveal */}
        <div className="si-results-v2__podium-wrap">
          {sorted.map((player, index) => {
            const isMe  = player.name === playerName
            const title = getPlayerTitle(player, sorted, history)
            const visible = index < visibleCount
            return (
              <div
                key={player.id}
                className={`si-results-v2__player-card ${isMe ? 'me' : ''} rank-${index} ${visible ? 'visible' : 'hidden'}`}
              >
                <div className="si-results-v2__player-rank">
                  {medals[index] ?? <span className="si-results-v2__rank-num">{index + 1}</span>}
                </div>
                <div className="si-results-v2__player-avatar">
                  <Avatar name={player.name} size={index === 0 ? 64 : 48} />
                  {player.streak >= 2 && (
                    <span className="si-results-v2__player-streak-badge">🔥{player.streak}</span>
                  )}
                </div>
                <div className="si-results-v2__player-details">
                  <div className="si-results-v2__player-name">
                    {player.name}
                    {isMe && <span className="si-results-v2__me-tag">toi</span>}
                  </div>
                  <div className="si-results-v2__player-title">{title}</div>
                  <div className="si-results-v2__player-score">
                    {player.score} pt{player.score !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ACTIONS */}
        <div className="si-results-v2__actions">
          <Button onClick={onRestart}>🔄 Rejouer</Button>
          <Button variant="secondary" onClick={onShare}>📤 Partager</Button>
          <Button variant="secondary" onClick={onExport}>{exported ? '✅ Exporté !' : '📥 Exporter'}</Button>
        </div>

        <div className="si-results-v2__room">
          <span>Room : <strong>{roomId}</strong></span>
          <button className="si-results-v2__copy" onClick={onCopyRoom}>
            {copied ? '✅ Copié !' : '📋 Copier'}
          </button>
        </div>

        {/* HISTORY */}
        {history.length > 0 && (
          <Card className="si-results-v2__history-card">
            <button
              className="si-results-v2__history-toggle"
              onClick={() => setShowHistory((v) => !v)}
            >
              {showHistory ? '▲' : '▼'} 📜 Historique des rounds ({history.length})
            </button>
            {showHistory && (
              <div className="si-results-v2__history">
                {history.map((round, i) => (
                  <div className="si-results-v2__round" key={i}>
                    <div className="si-results-v2__round-header">
                      <span className="si-results-v2__round-num">Q{i + 1}</span>
                      <span className="si-results-v2__round-q">{round.question.text}</span>
                    </div>
                    <div className="si-results-v2__round-answers">
                      {Object.entries(round.answers).map(([name, ans]) => (
                        <span
                          key={name}
                          className={`si-results-v2__ans ${
                            ans === round.majority || round.majority === 'tie' ? 'scored' : 'miss'
                          }`}
                        >
                          {ans === 'yes' ? '✅' : ans === 'no' ? '❌' : '—'} {name}
                          {round.streakBonuses?.includes(name) && ' 🔥+1'}
                        </span>
                      ))}
                      <span className="si-results-v2__majority">
                        {round.majority === 'yes' ? '✅ Majorité Oui'
                          : round.majority === 'no' ? '❌ Majorité Non'
                          : '🤝 Égalité'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}