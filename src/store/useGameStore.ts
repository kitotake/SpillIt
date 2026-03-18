import { create } from 'zustand'
import type { GamePhase, GameSettings, Player, Question, RoundRecord } from '../types/game'
import quizz from '../quizz.json'

const makeId = () => Math.random().toString(36).slice(2, 10)

const allQuestions: Question[] = Object.entries(quizz.questions).flatMap(
  ([category, questions]) =>
    questions.map((q) => ({ id: makeId(), text: q, category })),
)

export type GameStore = {
  phase: GamePhase
  playerName: string
  roomId: string
  players: Player[]
  settings: GameSettings
  questions: Question[]
  questionIndex: number
  reveal: boolean
  timerSeconds: number
  history: RoundRecord[]

  reset: () => void
  setPlayerName: (name: string) => void
  setRoomId: (id: string) => void
  addPlayer: (name: string) => void
  togglePlayerReady: (id: string) => void
  setSettings: (settings: Partial<GameSettings>) => void
  startGame: () => void
  setAnswer: (playerId: string, answer: Player['answer']) => void
  /** Commits the current round to history and advances (or ends) the game */
  nextQuestion: () => void
  finishGame: () => void
  setReveal: (reveal: boolean) => void
  setTimerSeconds: (seconds: number | ((prev: number) => number)) => void
}

const defaultSettings: GameSettings = {
  questionCount: 6,
  secondsPerQuestion: 12,
  category: 'fun',
  soloMode: false,
}

function computeMajority(players: Player[]): 'yes' | 'no' | 'tie' {
  const yes = players.filter((p) => p.answer === 'yes').length
  const no = players.filter((p) => p.answer === 'no').length
  if (yes > no) return 'yes'
  if (no > yes) return 'no'
  return 'tie'
}

export const useGameStore = create<GameStore>((set) => ({
  phase: 'home',
  playerName: '',
  roomId: '',
  players: [],
  settings: defaultSettings,
  questions: [],
  questionIndex: 0,
  reveal: false,
  timerSeconds: defaultSettings.secondsPerQuestion,
  history: [],

  reset: () =>
    set({
      phase: 'home',
      playerName: '',
      roomId: '',
      players: [],
      settings: defaultSettings,
      questions: [],
      questionIndex: 0,
      reveal: false,
      timerSeconds: defaultSettings.secondsPerQuestion,
      history: [],
    }),

  setPlayerName: (name) => set({ playerName: name }),
  setRoomId: (id) => set({ roomId: id }),

  addPlayer: (name) =>
    set((state) => {
      if (!name.trim()) return state
      const existing = state.players.find(
        (p) => p.name.toLowerCase() === name.trim().toLowerCase(),
      )
      if (existing) return state
      const player: Player = {
        id: makeId(),
        name: name.trim(),
        score: 0,
        ready: false,
      }
      return { players: [...state.players, player] }
    }),

  togglePlayerReady: (id) =>
    set((state) => ({
      players: state.players.map((p) =>
        p.id === id ? { ...p, ready: !p.ready } : p,
      ),
    })),

  setSettings: (settings) =>
    set((state) => ({ settings: { ...state.settings, ...settings } })),

  startGame: () =>
    set((state) => {
      const pool = allQuestions.filter((q) => q.category === state.settings.category)
      const shuffled = [...pool].sort(() => Math.random() - 0.5)
      const questions = shuffled.slice(0, state.settings.questionCount)
      return {
        phase: 'game',
        questions,
        questionIndex: 0,
        reveal: false,
        timerSeconds: state.settings.secondsPerQuestion,
        history: [],
        players: state.players.map((p) => ({ ...p, score: 0, answer: undefined })),
      }
    }),

  setAnswer: (playerId, answer) =>
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, answer } : p,
      ),
    })),

  nextQuestion: () =>
    set((state) => {
      const currentQuestion = state.questions[state.questionIndex]
      const majority = computeMajority(state.players)

      // Award +1 to players who voted with the majority (or everyone on tie)
      const updatedPlayers = state.players.map((p) => {
        const scored =
          majority === 'tie' || p.answer === majority
        return scored && p.answer !== undefined
          ? { ...p, score: p.score + 1 }
          : p
      })

      const record: RoundRecord = {
        question: currentQuestion,
        answers: Object.fromEntries(
          state.players.map((p) => [p.name, p.answer]),
        ),
        majority,
        scorers: updatedPlayers
          .filter(
            (p, i) => p.score > state.players[i].score,
          )
          .map((p) => p.name),
      }

      const nextIndex = state.questionIndex + 1
      const isEnd = nextIndex >= state.questions.length

      return {
        history: [...state.history, record],
        players: updatedPlayers.map((p) => ({ ...p, answer: undefined })),
        questionIndex: nextIndex,
        reveal: false,
        timerSeconds: state.settings.secondsPerQuestion,
        phase: isEnd ? 'results' : 'game',
      }
    }),

  finishGame: () => set({ phase: 'results', reveal: false }),

  setReveal: (reveal) => set({ reveal }),

  setTimerSeconds: (seconds) =>
    set((state) => ({
      timerSeconds:
        typeof seconds === 'function' ? seconds(state.timerSeconds) : seconds,
    })),
}))