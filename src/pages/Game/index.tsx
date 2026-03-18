import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../../store/useGameStore'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { QuestionCard } from '../../components/QuestionCard/QuestionCard'
import { Timer } from '../../components/Timer/Timer'
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

  const currentQuestion = questions[questionIndex]
  const total = questions.length

  useEffect(() => {
    if (phase === 'results') navigate('/results')
  }, [phase, navigate])

  useEffect(() => {
    if (phase !== 'game' && phase !== 'results') navigate('/')
  }, [])

  useEffect(() => {
    if (!currentQuestion) return
    setReveal(false)
    setTimerSeconds(settings.secondsPerQuestion)
  }, [questionIndex])

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

  const yesCount = players.filter((p) => p.answer === 'yes').length
  const noCount = players.filter((p) => p.answer === 'no').length
  const majority = yesCount > noCount ? 'yes' : noCount > yesCount ? 'no' : 'tie'

  const me = useMemo(() => players.find((p) => p.name === playerName), [players, playerName])

  const handleAnswer = (answer: 'yes' | 'no') => {
    if (reveal) return
    if (me) setAnswer(me.id, answer)
    setReveal(true)
  }

  if (!currentQuestion) return null

  return (
    <div className="si-page si-game">
      <div className="si-game__top">
        <div className="si-game__progress">
          <span>
            Question <strong>{questionIndex + 1}</strong> / {total}
          </span>
          {!settings.soloMode && <span>👥 {players.length} joueurs</span>}
        </div>
        <Timer
          seconds={timerSeconds}
          maxSeconds={settings.secondsPerQuestion}
          danger={timerSeconds <= 3}
        />
      </div>

      <Card className="si-game__card">
        <QuestionCard
          question={currentQuestion}
          onAnswer={handleAnswer}
          disabled={reveal || !!me?.answer || timerSeconds <= 0}
          reveal={reveal}
          yesCount={yesCount}
          noCount={noCount}
          majority={majority}
          myAnswer={me?.answer}
        />

        <div className="si-game__actions">
          {reveal ? (
            <Button onClick={nextQuestion} className="si-game__next-btn">
              {questionIndex + 1 >= total ? '🏆 Voir les résultats' : 'Question suivante →'}
            </Button>
          ) : (
            <span className="si-game__hint">
              {me?.answer
                ? `✅ Répondu ! En attente des autres...`
                : `⏳ Réponds avant la fin du timer.`}
            </span>
          )}
        </div>
      </Card>

      {!settings.soloMode && (
        <div className="si-game__players">
          {players.map((p) => (
            <span
              key={p.id}
              className={`si-game__player-dot ${p.answer ? 'answered' : ''}`}
              title={p.name}
            >
              {p.answer ? '✅' : '⏳'} {p.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}