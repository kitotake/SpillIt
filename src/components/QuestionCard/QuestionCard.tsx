import type { Question } from '../../types/game'
import './QuestionCard.scss'

export type QuestionCardProps = {
  question: Question
  onAnswer: (answer: 'yes' | 'no') => void
  onSkip?: () => void
  disabled?: boolean
  reveal?: boolean
  yesCount?: number
  noCount?: number
  majority?: 'yes' | 'no' | 'tie'
  myAnswer?: 'yes' | 'no'
}

export function QuestionCard({
  question,
  onAnswer,
  onSkip,
  disabled,
  reveal,
  yesCount = 0,
  noCount = 0,
  majority,
  myAnswer,
}: QuestionCardProps) {
  const total = yesCount + noCount

  const getResultMsg = () => {
    if (!reveal || !majority) return null
    if (majority === 'tie') return '🤝 Égalité — tout le monde marque un point !'
    if (!myAnswer) return `La majorité a répondu ${majority === 'yes' ? '✅ Oui' : '❌ Non'}`
    const scored = myAnswer === majority
    return scored
      ? `🎉 Tu es dans la majorité ! +1 point`
      : `😬 Tu étais dans la minorité. 0 point`
  }

  const resultMsg = getResultMsg()

  return (
    <div className="si-question-card">
      <div className="si-question-card__category">
        {question.category && (
          <span className="si-question-card__tag">#{question.category}</span>
        )}
      </div>
      <p className="si-question-card__text">{question.text}</p>

      <div className="si-question-card__actions">
        <button
          className={`si-question-card__btn si-question-card__btn--yes ${
            myAnswer === 'yes' ? 'selected' : ''
          } ${reveal && majority === 'yes' ? 'winner' : ''}`}
          disabled={disabled}
          onClick={() => onAnswer('yes')}
          type="button"
        >
          <span className="si-question-card__btn-emoji">✅</span>
          <span>Oui</span>
          {reveal && (
            <span className="si-question-card__count">{yesCount}</span>
          )}
        </button>
        <button
          className={`si-question-card__btn si-question-card__btn--no ${
            myAnswer === 'no' ? 'selected' : ''
          } ${reveal && majority === 'no' ? 'winner' : ''}`}
          disabled={disabled}
          onClick={() => onAnswer('no')}
          type="button"
        >
          <span className="si-question-card__btn-emoji">❌</span>
          <span>Non</span>
          {reveal && (
            <span className="si-question-card__count">{noCount}</span>
          )}
        </button>
      </div>

      {reveal && total > 0 && (
        <div className="si-question-card__bar-wrap">
          <div
            className="si-question-card__bar si-question-card__bar--yes"
            style={{ width: `${(yesCount / total) * 100}%` }}
          />
          <div
            className="si-question-card__bar si-question-card__bar--no"
            style={{ width: `${(noCount / total) * 100}%` }}
          />
        </div>
      )}

      {resultMsg && (
        <div className="si-question-card__result">{resultMsg}</div>
      )}

      {onSkip && !reveal && (
        <button className="si-question-card__skip" type="button" onClick={onSkip}>
          Passer
        </button>
      )}
    </div>
  )
}