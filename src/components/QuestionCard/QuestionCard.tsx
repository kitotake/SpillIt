import type { Question } from '../../types/game'
import { Button } from '../ui/Button'
import './QuestionCard.scss'

export type QuestionCardProps = {
  question: Question
  onAnswer: (answer: 'yes' | 'no') => void
  onSkip?: () => void
  disabled?: boolean
  reveal?: boolean
  yesCount?: number
  noCount?: number
}

export function QuestionCard({
  question,
  onAnswer,
  onSkip,
  disabled,
  reveal,
  yesCount = 0,
  noCount = 0,
}: QuestionCardProps) {
  return (
    <div className="si-question-card">
      <div className="si-question-card__title">Question</div>
      <p className="si-question-card__text">{question.text}</p>

      <div className="si-question-card__actions">
        <Button
          variant="secondary"
          disabled={disabled}
          onClick={() => onAnswer('yes')}
        >
          Oui
        </Button>
        <Button
          variant="danger"
          disabled={disabled}
          onClick={() => onAnswer('no')}
        >
          Non
        </Button>
      </div>

      {reveal && (
        <div className="si-question-card__reveal">
          <span>✅ Oui: {yesCount}</span>
          <span>❌ Non: {noCount}</span>
        </div>
      )}

      {onSkip && (
        <button className="si-question-card__skip" type="button" onClick={onSkip}>
          Passer
        </button>
      )}
    </div>
  )
}
