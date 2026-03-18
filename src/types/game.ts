export type GamePhase = 'home' | 'lobby' | 'game' | 'guess' | 'results'

export type Player = {
  id: string
  name: string
  score: number
  streak: number
  ready: boolean
  answer?: 'yes' | 'no'
  guessAnswer?: string
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
  hostId: string
  players: Player[]
  settings: GameSettings
  questions: Question[]
  questionIndex: number
  history: RoundRecord[]
  savedAt: number
}

// Socket event payloads (shared between client hooks and server)
export type SocketEvents = {
  join_room: { roomId: string; playerName: string; isSpectator?: boolean }
  player_ready: { roomId: string; playerId: string; ready: boolean }
  start_game: { roomId: string; settings: GameSettings; questions: Question[] }
  player_answer: { roomId: string; playerId: string; answer: 'yes' | 'no' }
  next_question: { roomId: string; playerId: string }
  player_guess: { roomId: string; playerId: string; guessAnswer: string }
  reveal_guesses: { roomId: string; playerId: string }
  exit_guess: { roomId: string; playerId: string }
}