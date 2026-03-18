import { create } from 'zustand'
import type { GamePhase, GameSettings, Player, Question, RoundRecord, SavedGame } from '../types/game'
import quizz from '../quizz.json'

const makeId = () => Math.random().toString(36).slice(2, 10)
const SAVE_KEY = 'spillit_saved_game'

const allQuestions: Question[] = Object.entries(quizz.questions).flatMap(
  ([category, questions]) =>
    (questions as string[]).map((q) => ({ id: makeId(), text: q, category })),
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
  // Guess phase state
  guessTarget: Player | null   // the player being guessed about
  guessReveal: boolean

  reset: () => void
  setPlayerName: (name: string) => void
  setRoomId: (id: string) => void
  addPlayer: (name: string, isSpectator?: boolean) => void
  removePlayer: (id: string) => void
  togglePlayerReady: (id: string) => void
  setSettings: (settings: Partial<GameSettings>) => void
  startGame: () => void
  setAnswer: (playerId: string, answer: Player['answer']) => void
  nextQuestion: () => void
  finishGame: () => void
  setReveal: (reveal: boolean) => void
  setTimerSeconds: (seconds: number | ((prev: number) => number)) => void
  // Guess phase
  setGuessAnswer: (playerId: string, guessAnswer: string) => void
  revealGuesses: () => void
  exitGuessPhase: () => void
  // Persistence
  saveGame: () => void
  loadGame: () => boolean
  clearSave: () => void
}

const defaultSettings: GameSettings = {
  questionCount: 6,
  secondsPerQuestion: 12,
  category: 'fun',
  soloMode: false,
  randomAllCategories: false,
}

function computeMajority(players: Player[]): 'yes' | 'no' | 'tie' {
  const activePlayers = players.filter((p) => !p.isSpectator)
  const yes = activePlayers.filter((p) => p.answer === 'yes').length
  const no = activePlayers.filter((p) => p.answer === 'no').length
  if (yes > no) return 'yes'
  if (no > yes) return 'no'
  return 'tie'
}

const initialState = {
  phase: 'home' as GamePhase,
  playerName: '',
  roomId: '',
  players: [],
  settings: defaultSettings,
  questions: [],
  questionIndex: 0,
  reveal: false,
  timerSeconds: defaultSettings.secondsPerQuestion,
  history: [],
  guessTarget: null,
  guessReveal: false,
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  reset: () => set({ ...initialState, settings: { ...defaultSettings } }),

  setPlayerName: (name) => set({ playerName: name }),
  setRoomId: (id) => set({ roomId: id }),

  addPlayer: (name, isSpectator = false) =>
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
        streak: 0,
        ready: false,
        isSpectator,
      }
      return { players: [...state.players, player] }
    }),

  removePlayer: (id) =>
    set((state) => ({ players: state.players.filter((p) => p.id !== id) })),

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
      let pool: Question[]
      if (state.settings.randomAllCategories) {
        pool = [...allQuestions]
      } else {
        pool = allQuestions.filter((q) => q.category === state.settings.category)
      }
      const shuffled = [...pool].sort(() => Math.random() - 0.5)
      const questions = shuffled.slice(0, state.settings.questionCount)
      return {
        phase: 'game',
        questions,
        questionIndex: 0,
        reveal: false,
        timerSeconds: state.settings.secondsPerQuestion,
        history: [],
        guessTarget: null,
        guessReveal: false,
        players: state.players.map((p) => ({
          ...p,
          score: 0,
          streak: 0,
          answer: undefined,
          guessAnswer: undefined,
        })),
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
      const activePlayers = state.players.filter((p) => !p.isSpectator)

      // Award +1 for majority, +1 streak bonus if streak >= 2
      const updatedPlayers = state.players.map((p) => {
        if (p.isSpectator) return p
        const inMajority = majority === 'tie' || p.answer === majority
        const scored = inMajority && p.answer !== undefined
        const newStreak = scored ? p.streak + 1 : 0
        const streakBonus = scored && newStreak >= 2 ? 1 : 0
        return {
          ...p,
          score: p.score + (scored ? 1 : 0) + streakBonus,
          streak: newStreak,
        }
      })

      const streakBonuses = updatedPlayers
        .filter((p, i) => {
          const orig = state.players[i]
          return p.score > orig.score + 1
        })
        .map((p) => p.name)

      const scorers = updatedPlayers
        .filter((p, i) => p.score > state.players[i].score)
        .map((p) => p.name)

      const record: RoundRecord = {
        question: currentQuestion,
        answers: Object.fromEntries(activePlayers.map((p) => [p.name, p.answer])),
        majority,
        scorers,
        streakBonuses,
      }

      const nextIndex = state.questionIndex + 1
      const isEnd = nextIndex >= state.questions.length

      // Pick a random active player as guess target (only in multiplayer)
      const guessTarget =
        !state.settings.soloMode && activePlayers.length >= 2
          ? activePlayers[Math.floor(Math.random() * activePlayers.length)]
          : null

      return {
        history: [...state.history, record],
        players: updatedPlayers.map((p) => ({
          ...p,
          answer: undefined,
          guessAnswer: undefined,
        })),
        questionIndex: nextIndex,
        reveal: false,
        timerSeconds: state.settings.secondsPerQuestion,
        phase: isEnd ? 'results' : guessTarget ? 'guess' : 'game',
        guessTarget: guessTarget ?? null,
        guessReveal: false,
      }
    }),

  finishGame: () => set({ phase: 'results', reveal: false }),

  setReveal: (reveal) => set({ reveal }),

  setTimerSeconds: (seconds) =>
    set((state) => ({
      timerSeconds:
        typeof seconds === 'function' ? seconds(state.timerSeconds) : seconds,
    })),

  // Guess phase
  setGuessAnswer: (playerId, guessAnswer) =>
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, guessAnswer } : p,
      ),
    })),

  revealGuesses: () =>
    set((state) => {
      const { guessTarget } = state
      if (!guessTarget) return state

      // Award +1 to players who correctly guessed the target's last answer
      const lastRecord = state.history[state.history.length - 1]
      const targetAnswer = lastRecord?.answers[guessTarget.name]

      const updatedPlayers = state.players.map((p) => {
        if (p.id === guessTarget.id || p.isSpectator || !p.guessAnswer) return p
        const correct = p.guessAnswer === targetAnswer
        return correct ? { ...p, score: p.score + 1 } : p
      })

      return { players: updatedPlayers, guessReveal: true }
    }),

  exitGuessPhase: () =>
    set((state) => {
      const nextIndex = state.questionIndex
      const isEnd = nextIndex >= state.questions.length
      return {
        phase: isEnd ? 'results' : 'game',
        guessTarget: null,
        guessReveal: false,
      }
    }),

  // Persistence
  saveGame: () => {
    const state = get()
    if (state.phase === 'home') return
    const save: SavedGame = {
      phase: state.phase,
      playerName: state.playerName,
      roomId: state.roomId,
      players: state.players,
      settings: state.settings,
      questions: state.questions,
      questionIndex: state.questionIndex,
      history: state.history,
      savedAt: Date.now(),
    }
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save))
    } catch (_) {}
  },

  loadGame: () => {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) return false
      const save: SavedGame = JSON.parse(raw)
      // Discard saves older than 2 hours
      if (Date.now() - save.savedAt > 2 * 60 * 60 * 1000) {
        localStorage.removeItem(SAVE_KEY)
        return false
      }
      set({
        phase: save.phase,
        playerName: save.playerName,
        roomId: save.roomId,
        players: save.players,
        settings: save.settings,
        questions: save.questions,
        questionIndex: save.questionIndex,
        history: save.history,
        reveal: false,
        timerSeconds: save.settings.secondsPerQuestion,
        guessTarget: null,
        guessReveal: false,
      })
      return true
    } catch (_) {
      return false
    }
  },

  clearSave: () => {
    try { localStorage.removeItem(SAVE_KEY) } catch (_) {}
  },
}))