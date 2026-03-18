// src/pages/Guess/index.tsx
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../../store/useGameStore'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Avatar } from '../../components/Avatar/AvatarGenerator'
import { sounds, resumeAudio } from '../../utils/sounds'
import './Guess.scss'

export function GuessPage() {
  const navigate = useNavigate()
  const players = useGameStore((s) => s.players)
  const playerName = useGameStore((s) => s.playerName)
  const guessTarget = useGameStore((s) => s.guessTarget)
  const guessReveal = useGameStore((s) => s.guessReveal)
  const setGuessAnswer = useGameStore((s) => s.setGuessAnswer)
  const revealGuesses = useGameStore((s) => s.revealGuesses)
  const exitGuessPhase = useGameStore((s) => s.exitGuessPhase)
  const history = useGameStore((s) => s.history)

  const me = useMemo(() => players.find((p) => p.name === playerName), [players, playerName])
  const activePlayers = players.filter((p) => !p.isSpectator)

  const lastRecord = history[history.length - 1]
  const targetAnswer = lastRecord?.answers[guessTarget?.name ?? '']

  if (!guessTarget) {
    exitGuessPhase()
    return null
  }

  const isTarget = me?.id === guessTarget.id

  const handleGuess = (answer: string) => {
    resumeAudio()
    if (!me) return
    setGuessAnswer(me.id, answer)
    sounds.click()
  }

  const handleReveal = () => {
    resumeAudio()
    revealGuesses()
    const correctGuessers = activePlayers.filter(
      (p) => p.guessAnswer === targetAnswer && p.id !== guessTarget.id,
    )
    if (correctGuessers.length > 0) sounds.correct()
    else sounds.wrong()
  }

  const handleContinue = () => {
    exitGuessPhase()
    navigate('/game')
  }

  const guessers = activePlayers.filter((p) => p.id !== guessTarget.id && !p.isSpectator)
  const allGuessed = guessers.every((p) => p.guessAnswer)

  return (
    <div className="si-page si-guess-v2">
      {/* Header */}
      <div className="si-guess-v2__header">
        <div className="si-guess-v2__badge">🔍 Devine !</div>
        <h2 className="si-guess-v2__title">
          Comment a répondu
        </h2>
        <div className="si-guess-v2__target-hero">
          <div className="si-guess-v2__target-avatar">
            <Avatar name={guessTarget.name} size={72} />
            <div className="si-guess-v2__target-ring" />
          </div>
          <div className="si-guess-v2__target-name">{guessTarget.name}</div>
          <div className="si-guess-v2__target-score">{guessTarget.score} pts</div>
        </div>
      </div>

      <Card className="si-guess-v2__card">
        {/* Question recap */}
        <p className="si-guess-v2__question">
          « {lastRecord?.question.text} »
        </p>

        {/* Not yet revealed */}
        {!guessReveal && (
          <>
            {!isTarget ? (
              <>
                {!me?.guessAnswer ? (
                  <div className="si-guess-v2__btns">
                    <button
                      className="si-guess-v2__btn si-guess-v2__btn--yes"
                      onClick={() => handleGuess('yes')}
                    >
                      <span className="si-guess-v2__btn-emoji">✅</span>
                      <span>Oui</span>
                    </button>
                    <button
                      className="si-guess-v2__btn si-guess-v2__btn--no"
                      onClick={() => handleGuess('no')}
                    >
                      <span className="si-guess-v2__btn-emoji">❌</span>
                      <span>Non</span>
                    </button>
                  </div>
                ) : (
                  <p className="si-guess-v2__waiting-msg">
                    Tu as dit <strong>{me?.guessAnswer === 'yes' ? 'Oui ✅' : 'Non ❌'}</strong> — en attente des autres…
                  </p>
                )}

                {/* Mini waiting dots */}
                <div className="si-guess-v2__waiters">
                  {guessers.map((p) => (
                    <div key={p.id} className={`si-guess-v2__waiter ${p.guessAnswer ? 'done' : ''}`}>
                      <Avatar name={p.name} size={32} />
                      <span>{p.guessAnswer ? '✅' : '⏳'}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="si-guess-v2__target-wait">
                <div className="si-guess-v2__target-wait-emoji">🎯</div>
                <p>C'est toi qu'on devine ! Attends…</p>
                <div className="si-guess-v2__waiters">
                  {guessers.map((p) => (
                    <div key={p.id} className={`si-guess-v2__waiter ${p.guessAnswer ? 'done' : ''}`}>
                      <Avatar name={p.name} size={32} />
                      <span>{p.guessAnswer ? '✅' : '⏳'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="si-guess-v2__actions">
              <Button
                onClick={handleReveal}
                disabled={!allGuessed && !isTarget}
              >
                Révéler les réponses
              </Button>
            </div>
          </>
        )}

        {/* Revealed */}
        {guessReveal && (
          <div className="si-guess-v2__results">
            <div className="si-guess-v2__reveal-answer">
              <span className="si-guess-v2__reveal-label">La vraie réponse de {guessTarget.name} :</span>
              <span className={`si-guess-v2__reveal-val ${targetAnswer}`}>
                {targetAnswer === 'yes' ? '✅ Oui' : '❌ Non'}
              </span>
            </div>

            <div className="si-guess-v2__scores-grid">
              {guessers.map((p) => {
                const correct = p.guessAnswer === targetAnswer
                return (
                  <div key={p.id} className={`si-guess-v2__score-row ${correct ? 'correct' : 'wrong'}`}>
                    <Avatar name={p.name} size={36} />
                    <span className="si-guess-v2__score-name">{p.name}</span>
                    <span className="si-guess-v2__score-guess">
                      {p.guessAnswer === 'yes' ? '✅' : '❌'}
                    </span>
                    <span className="si-guess-v2__score-result">
                      {correct ? '🎉 +1' : '😬 0'}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="si-guess-v2__actions">
              <Button onClick={handleContinue}>Continuer →</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}