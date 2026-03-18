export type GamePhase = 'home' | 'lobby' | 'game' | 'results'

export type Player = {
  id: string
  name: string
  score: number
  ready: boolean
  answer?: 'yes' | 'no'
}

export type Question = {
  id: string
  text: string
  category?: string
}

export type GameSettings = {
  questionCount: number
  secondsPerQuestion: number
  category: string
}
