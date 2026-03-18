export type GamePhase = 'home' | 'lobby' | 'game' | 'guess' | 'results'

export type Player = {
  id: string
  name: string
  score: number
  streak: number
  ready: boolean
  answer?: 'yes' | 'no'
  guessTarget?: string   // who they're trying to guess
  guessAnswer?: string   // their guess for that player's answer
  isSpectator?: boolean
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
  soloMode: boolean
  randomAllCategories: boolean
}

export type RoundRecord = {
  question: Question
  answers: Record<string, 'yes' | 'no' | undefined>
  majority: 'yes' | 'no' | 'tie'
  scorers: string[]
  streakBonuses: string[]
}

export type SavedGame = {
  phase: GamePhase
  playerName: string
  roomId: string
  players: Player[]
  settings: GameSettings
  questions: Question[]
  questionIndex: number
  history: RoundRecord[]
  savedAt: number
}