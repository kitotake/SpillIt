// src/pages/Game/index.tsx
import { useEffect, useMemo, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../../store/useGameStore'
import { Button } from '../../components/ui/Button'
import { QuestionCard } from '../../components/QuestionCard/QuestionCard'
import { Timer } from '../../components/Timer/Timer'
import { Avatar } from '../../components/Avatar/AvatarGenerator'
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

  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null)

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
    setAutoNextCountdown(null)
  }, [questionIndex])

  useEffect(() => {
    if (phase === 'game') saveGame()
  }, [questionIndex, phase])

  const handleTick = useCallback(() => {
    if (reveal) return
    if (timerSeconds <= 3) sounds.danger()
    else if (timerSeconds <= 6) sounds.tick()
  }, [timerSeconds, reveal])

  // Timer countdown
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

  const activePlayers = players.filter((p) => !p.isSpectator)
  const yesCount = activePlayers.filter((p) => p.answer === 'yes').length
  const noCount = activePlayers.filter((p) => p.answer === 'no').length
  const majority = yesCount > noCount ? 'yes' : noCount > yesCount ? 'no' : 'tie'
  const allAnswered = activePlayers.length > 0 && activePlayers.every((p) => p.answer)

  // Auto-reveal when all answered
  useEffect(() => {
    if (allAnswered && !reveal && activePlayers.length > 1) {
      setReveal(true)
      sounds.correct()
    }
  }, [allAnswered])

  // Auto-next countdown after reveal (solo mode)
  useEffect(() => {
    if (!reveal || !settings.soloMode) return
    setAutoNextCountdown(3)
    const interval = window.setInterval(() => {
      setAutoNextCountdown((c) => {
        if (c === null || c <= 1) {
          clearInterval(interval)
          handleNext()
          return null
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [reveal, settings.soloMode])

  const me = useMemo(() => players.find((p) => p.name === playerName), [players, playerName])

  const handleAnswer = (answer: 'yes' | 'no') => {
    resumeAudio()
    if (reveal || me?.isSpectator) return
    if (me) setAnswer(me.id, answer)
    sounds.answer()
    if (settings.soloMode) setReveal(true)
  }

  const handleNext = () => {
    resumeAudio()
    nextQuestion()
  }

  if (!currentQuestion) return null

  // Distribute players to corners
  const nonSpectators = activePlayers
  const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
  const spectators = players.filter((p) => p.isSpectator)

  return (
    <div className="si-game-arena">
      {/* TOP BAR */}
      <div className="si-game-arena__topbar">
        <div className="si-game-arena__progress">
          Q<strong>{questionIndex + 1}</strong>/{total}
        </div>
        <div className="si-game-arena__timer-wrap">
          <Timer
            seconds={timerSeconds}
            maxSeconds={settings.secondsPerQuestion}
            danger={isDanger}
            onTick={handleTick}
          />
        </div>
        {me && me.streak >= 2 && (
          <div className="si-game-arena__streak">🔥 x{me.streak}</div>
        )}
      </div>

      {/* CORNER PLAYERS */}
      {nonSpectators.map((player, i) => {
        const corner = corners[i % 4]
        const isMe = player.name === playerName
        return (
          <div
            key={player.id}
            className={`si-game-arena__player si-game-arena__player--${corner} ${player.answer ? 'answered' : ''} ${isMe ? 'me' : ''}`}
          >
            <div className="si-game-arena__player-avatar">
              <Avatar name={player.name} size={48} />
              {player.answer && reveal && (
                <span className={`si-game-arena__player-answer ${player.answer}`}>
                  {player.answer === 'yes' ? '✅' : '❌'}
                </span>
              )}
              {player.answer && !reveal && (
                <span className="si-game-arena__player-answer waiting">💭</span>
              )}
            </div>
            <div className="si-game-arena__player-info">
              <span className="si-game-arena__player-name">{player.name}{isMe ? ' (toi)' : ''}</span>
              <span className="si-game-arena__player-score">{player.score}pt{player.score !== 1 ? 's' : ''}</span>
              {player.streak >= 2 && (
                <span className="si-game-arena__player-streak">🔥{player.streak}</span>
              )}
            </div>
          </div>
        )
      })}

      {/* CENTER QUESTION */}
      <div className="si-game-arena__center">
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

        <div className="si-game-arena__next">
          {reveal ? (
            <Button onClick={handleNext} className="si-game-arena__next-btn">
              {questionIndex + 1 >= total
                ? '🏆 Résultats'
                : autoNextCountdown !== null
                ? `Prochain dans ${autoNextCountdown}s…`
                : 'Question suivante →'}
            </Button>
          ) : (
            <p className="si-game-arena__hint">
              {me?.isSpectator
                ? '👁️ Mode spectateur'
                : me?.answer
                ? `✅ Répondu — ${activePlayers.filter(p => p.answer).length}/${activePlayers.length} ont répondu`
                : '⏳ Réponds !'}
            </p>
          )}
        </div>
      </div>

      {/* Spectators bottom strip */}
      {spectators.length > 0 && (
        <div className="si-game-arena__spectators">
          {spectators.map((s) => (
            <span key={s.id} className="si-game-arena__spectator-dot">
              <Avatar name={s.name} size={24} /> {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}