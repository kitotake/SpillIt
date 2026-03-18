import { useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../../store/useGameStore'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { QuestionCard } from '../../components/QuestionCard/QuestionCard'
import { Timer } from '../../components/Timer/Timer'
import { sounds, resumeAudio } from '../../utils/sounds'
import './Game.scss'

export function GamePage() {
  const navigate = useNavigate()
  const phase = useGameStore((s) => s.phase)
  const questions = useGameStore((s) => s.questions)
  const questionIndex = useGameStore((s) => s.questionIndex)
  const players = useGameStore((s) => s.players)
  const playerName = useGameStore((s) => s.playerName)
  const timerSeconds = useGameStore((s) => s.timerSeconds)
  const settings = useGameStore((s) => s.settings)
  const reveal = useGameStore((s) => s.reveal)
  const setReveal = useGameStore((s) => s.setReveal)
  const setTimerSeconds = useGameStore((s) => s.setTimerSeconds)
  const setAnswer = useGameStore((s) => s.setAnswer)
  const nextQuestion = useGameStore((s) => s.nextQuestion)
  const saveGame = useGameStore((s) => s.saveGame)

  const currentQuestion = questions[questionIndex]
  const total = questions.length
  const isDanger = timerSeconds <= 3

  useEffect(() => {
    if (phase === 'results') navigate('/results')
    if (phase === 'guess') navigate('/guess')
  }, [phase, navigate])

  useEffect(() => {
    if (phase !== 'game' && phase !== 'results' && phase !== 'guess') navigate('/')
  }, [])

  useEffect(() => {
    if (!currentQuestion) return
    setReveal(false)
    setTimerSeconds(settings.secondsPerQuestion)
  }, [questionIndex])

  // Auto-save on each question
  useEffect(() => {
    if (phase === 'game') saveGame()
  }, [questionIndex, phase])

  const handleTick = useCallback(() => {
    if (reveal) return
    if (timerSeconds <= 3) sounds.danger()
    else if (timerSeconds <= 6) sounds.tick()
  }, [timerSeconds, reveal])

  useEffect(() => {
    if (reveal) return
    const interval = window.setInterval(() => {
      setTimerSeconds((t: number) => {
        if (t <= 1) {
          setReveal(true)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [reveal, questionIndex])

  const yesCount = players.filter((p) => !p.isSpectator && p.answer === 'yes').length
  const noCount = players.filter((p) => !p.isSpectator && p.answer === 'no').length
  const majority = yesCount > noCount ? 'yes' : noCount > yesCount ? 'no' : 'tie'

  const me = useMemo(() => players.find((p) => p.name === playerName), [players, playerName])

  const handleAnswer = (answer: 'yes' | 'no') => {
    resumeAudio()
    if (reveal || me?.isSpectator) return
    if (me) setAnswer(me.id, answer)
    sounds.answer()
    if (!settings.soloMode) setReveal(true)
    else setReveal(true)
  }

  const handleNext = () => {
    resumeAudio()
    nextQuestion()
  }

  if (!currentQuestion) return null

  const activePlayers = players.filter((p) => !p.isSpectator)

  return (
    <div className="si-page si-game">
      <div className="si-game__top">
        <div className="si-game__progress">
          <span>
            Question <strong>{questionIndex + 1}</strong> / {total}
          </span>
          <div className="si-game__progress-right">
            {me && me.streak >= 2 && (
              <span className="si-game__streak">🔥 x{me.streak}</span>
            )}
            {!settings.soloMode && <span>👥 {activePlayers.length}</span>}
          </div>
        </div>
        <Timer
          seconds={timerSeconds}
          maxSeconds={settings.secondsPerQuestion}
          danger={isDanger}
          onTick={handleTick}
        />
      </div>

      <Card className="si-game__card">
        <QuestionCard
          question={currentQuestion}
          onAnswer={handleAnswer}
          disabled={reveal || !!me?.answer || timerSeconds <= 0 || me?.isSpectator}
          reveal={reveal}
          yesCount={yesCount}
          noCount={noCount}
          majority={majority}
          myAnswer={me?.answer}
        />

        <div className="si-game__actions">
          {reveal ? (
            <Button onClick={handleNext} className="si-game__next-btn">
              {questionIndex + 1 >= total ? '🏆 Voir les résultats' : 'Question suivante →'}
            </Button>
          ) : (
            <span className="si-game__hint">
              {me?.isSpectator
                ? '👁️ Mode spectateur'
                : me?.answer
                ? '✅ Répondu ! En attente...'
                : '⏳ Réponds avant la fin du timer.'}
            </span>
          )}
        </div>
      </Card>

      {!settings.soloMode && (
        <div className="si-game__players">
          {activePlayers.map((p) => (
            <span
              key={p.id}
              className={`si-game__player-dot ${p.answer ? 'answered' : ''}`}
              title={`${p.name}${p.streak >= 2 ? ` 🔥x${p.streak}` : ''} — ${p.score}pts`}
            >
              {p.answer ? '✅' : '⏳'} {p.name}
              {p.streak >= 2 && <span className="si-game__dot-streak">🔥{p.streak}</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}