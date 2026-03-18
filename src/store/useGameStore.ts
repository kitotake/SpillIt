import { create } from 'zustand'
import type { GamePhase, GameSettings, Player, Question } from '../types/game'
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
  reset: () => void
  setPlayerName: (name: string) => void
  setRoomId: (id: string) => void
  addPlayer: (name: string) => void
  togglePlayerReady: (id: string) => void
  setSettings: (settings: Partial<GameSettings>) => void
  startGame: () => void
  setAnswer: (playerId: string, answer: Player['answer']) => void
  nextQuestion: () => void
  finishGame: () => void
  setReveal: (reveal: boolean) => void
  setTimerSeconds: (seconds: number | ((prev: number) => number)) => void
}

const defaultSettings: GameSettings = {
  questionCount: 6,
  secondsPerQuestion: 12,
  category: 'fun',
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
    }),

  setPlayerName: (name) => set({ playerName: name }),
  setRoomId: (id) => set({ roomId: id }),

  addPlayer: (name) =>
    set((state) => {
      if (!name.trim()) return state
      const existing = state.players.find((p) => p.name === name.trim())
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

  setSettings: (settings) => set((state) => ({ settings: { ...state.settings, ...settings } })),

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
        players: state.players.map((p) => ({ ...p, score: 0, answer: undefined })),
      }
    }),

  setAnswer: (playerId, answer) =>
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId
          ? {
              ...p,
              answer,
              score:
                answer === 'yes' ? p.score + 1 : p.score,
            }
          : p,
      ),
    })),

  nextQuestion: () =>
    set((state) => {
      const nextIndex = state.questionIndex + 1
      if (nextIndex >= state.questions.length) {
        return { phase: 'results', questionIndex: nextIndex, reveal: false }
      }
      return {
        questionIndex: nextIndex,
        reveal: false,
        timerSeconds: state.settings.secondsPerQuestion,
        players: state.players.map((p) => ({ ...p, answer: undefined })),
      }
    }),

  finishGame: () => set({ phase: 'results', reveal: false }),

  setReveal: (reveal) => set({ reveal }),

  setTimerSeconds: (seconds) =>
    set((state) => ({
      timerSeconds: typeof seconds === 'function' ? seconds(state.timerSeconds) : seconds,
    })),
}))
