import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../../store/useGameStore'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
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

  const allGuessed = activePlayers
    .filter((p) => p.id !== guessTarget.id && !p.isSpectator)
    .every((p) => p.guessAnswer)

  return (
    <div className="si-page si-guess">
      <div className="si-guess__header">
        <span className="si-guess__tag">🔍 Qui a dit quoi ?</span>
        <p className="si-guess__sub">
          Devinez comment <strong>{guessTarget.name}</strong> a répondu à la dernière question
        </p>
      </div>

      <Card className="si-guess__card">
        <p className="si-guess__question">
          « {lastRecord?.question.text} »
        </p>

        {!guessReveal && !isTarget && (
          <>
            <p className="si-guess__prompt">
              {me?.guessAnswer
                ? `Tu as répondu : ${me.guessAnswer === 'yes' ? '✅ Oui' : '❌ Non'} — attends les autres…`
                : `Tu penses que ${guessTarget.name} a répondu…`
              }
            </p>
            {!me?.guessAnswer && (
              <div className="si-guess__btns">
                <button
                  className="si-guess__btn si-guess__btn--yes"
                  onClick={() => handleGuess('yes')}
                >
                  ✅ Oui
                </button>
                <button
                  className="si-guess__btn si-guess__btn--no"
                  onClick={() => handleGuess('no')}
                >
                  ❌ Non
                </button>
              </div>
            )}
          </>
        )}

        {!guessReveal && isTarget && (
          <p className="si-guess__prompt si-guess__prompt--target">
            🎯 C'est toi ! Les autres devinent ta réponse…
          </p>
        )}

        {guessReveal && (
          <div className="si-guess__results">
            <div className="si-guess__answer-reveal">
              <span className="si-guess__answer-label">Réponse de {guessTarget.name} :</span>
              <span className={`si-guess__answer-val ${targetAnswer === 'yes' ? 'yes' : 'no'}`}>
                {targetAnswer === 'yes' ? '✅ Oui' : '❌ Non'}
              </span>
            </div>
            <div className="si-guess__guesses">
              {activePlayers
                .filter((p) => p.id !== guessTarget.id)
                .map((p) => {
                  const correct = p.guessAnswer === targetAnswer
                  return (
                    <div key={p.id} className={`si-guess__guess-row ${correct ? 'correct' : 'wrong'}`}>
                      <span>{p.name}</span>
                      <span>{p.guessAnswer === 'yes' ? '✅' : '❌'}</span>
                      <span>{correct ? '+1 🎉' : '—'}</span>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        <div className="si-guess__actions">
          {!guessReveal ? (
            <Button onClick={handleReveal} disabled={!allGuessed && !isTarget}>
              Révéler les réponses
            </Button>
          ) : (
            <Button onClick={handleContinue}>
              Continuer →
            </Button>
          )}
        </div>
      </Card>

      {!guessReveal && !isTarget && (
        <div className="si-guess__waiting">
          {activePlayers
            .filter((p) => p.id !== guessTarget.id)
            .map((p) => (
              <span
                key={p.id}
                className={`si-guess__wait-dot ${p.guessAnswer ? 'done' : ''}`}
              >
                {p.guessAnswer ? '✅' : '⏳'} {p.name}
              </span>
            ))}
        </div>
      )}
    </div>
  )
}
