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
    if (phase !== 'game') {
      navigate('/')
    }
  }, [phase, navigate])

  useEffect(() => {
    if (!currentQuestion) return
    setReveal(false)
    setTimerSeconds(settings.secondsPerQuestion)
  }, [currentQuestion, setReveal, setTimerSeconds, settings.secondsPerQuestion])

  useEffect(() => {
    if (reveal) return
    const interval = window.setInterval(() => {
      setTimerSeconds((t: number) => {
        const next = t - 1
        if (next <= 0) {
          setReveal(true)
          return 0
        }
        return next
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [reveal, setReveal, setTimerSeconds])

  const yesCount = players.filter((p) => p.answer === 'yes').length
  const noCount = players.filter((p) => p.answer === 'no').length

  const me = useMemo(() => players.find((p) => p.name === playerName), [players, playerName])

  const handleAnswer = (answer: 'yes' | 'no') => {
    if (reveal) return
    if (me) setAnswer(me.id, answer)
    setReveal(true)
  }

  const handleNext = () => {
    nextQuestion()
  }

  if (!currentQuestion) {
    return (
      <div className="si-page si-game">
        <Card>
          <h1>Plus de questions</h1>
          <p>La partie est terminée, on affiche les résultats.</p>
          <Button onClick={() => navigate('/results')}>Voir les résultats</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="si-page si-game">
      <div className="si-game__top">
        <div className="si-game__progress">
          <span>
            Question {questionIndex + 1} / {total}
          </span>
          <span>Joueurs: {players.length}</span>
        </div>
        <Timer seconds={timerSeconds} maxSeconds={settings.secondsPerQuestion} />
      </div>

      <Card className="si-game__card">
        <QuestionCard
          question={currentQuestion}
          onAnswer={handleAnswer}
          disabled={reveal || timerSeconds <= 0}
          reveal={reveal}
          yesCount={yesCount}
          noCount={noCount}
        />

        <div className="si-game__actions">
          {reveal ? (
            <Button onClick={handleNext}>Suivant</Button>
          ) : (
            <span className="si-game__hint">Réponds avant la fin du timer.</span>
          )}
        </div>
      </Card>
    </div>
  )
}
