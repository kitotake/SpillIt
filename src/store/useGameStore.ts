import { create } from 'zustand'
import type { GamePhase, GameSettings, Player, Question, RoundRecord } from '../types/game'
import { makeId, computeMajority, shuffle } from '../utils/game'
import { persistGame, loadPersistedGame, clearPersistedGame } from './persistence'
import quizz from '../quizz.json'

// ─── Questions pool ───────────────────────────────────────────────────────────

const allQuestions: Question[] = Object.entries(quizz.questions).flatMap(
  ([category, questions]) =>
    (questions as string[]).map((q) => ({ id: makeId(), text: q, category })),
)

// ─── Defaults ─────────────────────────────────────────────────────────────────

const defaultSettings: GameSettings = {
  questionCount: 6,
  secondsPerQuestion: 12,
  category: 'fun',
  soloMode: false,
  randomAllCategories: false,
}

const initialState = {
  phase: 'home' as GamePhase,
  playerName: '',
  roomId: '',
  hostId: '',           // ← who can start/control the game
  players: [] as Player[],
  settings: { ...defaultSettings },
  questions: [] as Question[],
  questionIndex: 0,
  reveal: false,
  timerSeconds: defaultSettings.secondsPerQuestion,
  history: [] as RoundRecord[],
  guessTarget: null as Player | null,
  guessReveal: false,
  // Connection state
  connectionStatus: 'disconnected' as 'disconnected' | 'connecting' | 'connected' | 'error',
  reconnecting: false,
}

// ─── Store type ───────────────────────────────────────────────────────────────

export type GameStore = typeof initialState & {
  // Identity
  setPlayerName: (name: string) => void
  setRoomId: (id: string) => void
  setHostId: (id: string) => void

  // Connection
  setConnectionStatus: (status: GameStore['connectionStatus']) => void
  setReconnecting: (v: boolean) => void

  // Players
  addPlayer: (name: string, isSpectator?: boolean) => Player | null
  removePlayer: (id: string) => void
  togglePlayerReady: (id: string) => void
  setPlayers: (players: Player[]) => void
  updatePlayer: (id: string, patch: Partial<Player>) => void

  // Settings
  setSettings: (settings: Partial<GameSettings>) => void

  // Game flow
  startGame: () => void
  setAnswer: (playerId: string, answer: Player['answer']) => void
  nextQuestion: () => void
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

  // Misc
  reset: () => void
  isHost: () => boolean
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  // ── Identity ──────────────────────────────────────────────────────────────

  setPlayerName: (name) => set({ playerName: name }),
  setRoomId: (id) => set({ roomId: id }),
  setHostId: (id) => set({ hostId: id }),

  // ── Connection ────────────────────────────────────────────────────────────

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setReconnecting: (reconnecting) => set({ reconnecting }),

  // ── Players ───────────────────────────────────────────────────────────────

  addPlayer: (name, isSpectator = false) => {
    const state = get()
    const trimmed = name.trim()
    if (!trimmed) return null
    const existing = state.players.find(
      (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
    )
    if (existing) return null
    const player: Player = {
      id: makeId(),
      name: trimmed,
      score: 0,
      streak: 0,
      ready: false,
      isSpectator,
    }
    set((s) => ({ players: [...s.players, player] }))
    return player
  },

  removePlayer: (id) =>
    set((s) => ({ players: s.players.filter((p) => p.id !== id) })),

  togglePlayerReady: (id) =>
    set((s) => ({
      players: s.players.map((p) => (p.id === id ? { ...p, ready: !p.ready } : p)),
    })),

  setPlayers: (players) => set({ players }),

  updatePlayer: (id, patch) =>
    set((s) => ({
      players: s.players.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),

  // ── Settings ──────────────────────────────────────────────────────────────

  setSettings: (settings) =>
    set((s) => ({ settings: { ...s.settings, ...settings } })),

  // ── Game flow ─────────────────────────────────────────────────────────────

  startGame: () =>
    set((s) => {
      const pool = s.settings.randomAllCategories
        ? allQuestions
        : allQuestions.filter((q) => q.category === s.settings.category)

      const questions = shuffle(pool).slice(0, s.settings.questionCount)

      return {
        phase: 'game',
        questions,
        questionIndex: 0,
        reveal: false,
        timerSeconds: s.settings.secondsPerQuestion,
        history: [],
        guessTarget: null,
        guessReveal: false,
        players: s.players.map((p) => ({
          ...p,
          score: 0,
          streak: 0,
          answer: undefined,
          guessAnswer: undefined,
        })),
      }
    }),

  setAnswer: (playerId, answer) =>
    set((s) => ({
      players: s.players.map((p) => (p.id === playerId ? { ...p, answer } : p)),
    })),

  nextQuestion: () =>
    set((s) => {
      const currentQuestion = s.questions[s.questionIndex]
      const majority = computeMajority(s.players)
      const activePlayers = s.players.filter((p) => !p.isSpectator)

      // Score computation
      const updatedPlayers = s.players.map((p) => {
        if (p.isSpectator) return p
        const inMajority = majority === 'tie' || p.answer === majority
        const scored = inMajority && p.answer !== undefined
        const newStreak = scored ? p.streak + 1 : 0
        const streakBonus = scored && newStreak >= 2 ? 1 : 0
        return {
          ...p,
          score: p.score + (scored ? 1 : 0) + streakBonus,
          streak: newStreak,
          answer: undefined,
          guessAnswer: undefined,
        }
      })

      const scorers = updatedPlayers
        .filter((p, i) => p.score > s.players[i].score)
        .map((p) => p.name)

      const streakBonuses = updatedPlayers
        .filter((p, i) => p.score > s.players[i].score + 1)
        .map((p) => p.name)

      const record: RoundRecord = {
        question: currentQuestion,
        answers: Object.fromEntries(activePlayers.map((p) => [p.name, p.answer])),
        majority,
        scorers,
        streakBonuses,
      }

      const nextIndex = s.questionIndex + 1
      const isEnd = nextIndex >= s.questions.length
      const canGuess = !s.settings.soloMode && activePlayers.length >= 2
      const guessTarget = !isEnd && canGuess
        ? activePlayers[Math.floor(Math.random() * activePlayers.length)]
        : null

      return {
        history: [...s.history, record],
        players: updatedPlayers,
        questionIndex: nextIndex,
        reveal: false,
        timerSeconds: s.settings.secondsPerQuestion,
        phase: isEnd ? 'results' : guessTarget ? 'guess' : 'game',
        guessTarget,
        guessReveal: false,
      }
    }),

  setReveal: (reveal) => set({ reveal }),

  setTimerSeconds: (seconds) =>
    set((s) => ({
      timerSeconds: typeof seconds === 'function' ? seconds(s.timerSeconds) : seconds,
    })),

  // ── Guess phase ───────────────────────────────────────────────────────────

  setGuessAnswer: (playerId, guessAnswer) =>
    set((s) => ({
      players: s.players.map((p) => (p.id === playerId ? { ...p, guessAnswer } : p)),
    })),

  revealGuesses: () =>
    set((s) => {
      const { guessTarget, history } = s
      if (!guessTarget) return s
      const targetAnswer = history[history.length - 1]?.answers[guessTarget.name]
      const players = s.players.map((p) => {
        if (p.id === guessTarget.id || p.isSpectator || !p.guessAnswer) return p
        return p.guessAnswer === targetAnswer ? { ...p, score: p.score + 1 } : p
      })
      return { players, guessReveal: true }
    }),

  exitGuessPhase: () =>
    set((s) => ({
      phase: s.questionIndex >= s.questions.length ? 'results' : 'game',
      guessTarget: null,
      guessReveal: false,
    })),

  // ── Persistence ───────────────────────────────────────────────────────────

  saveGame: () => {
    const s = get()
    persistGame({
      phase: s.phase,
      playerName: s.playerName,
      roomId: s.roomId,
      hostId: s.hostId,
      players: s.players,
      settings: s.settings,
      questions: s.questions,
      questionIndex: s.questionIndex,
      history: s.history,
    })
  },

  loadGame: () => {
    const save = loadPersistedGame()
    if (!save) return false
    set({
      phase: save.phase,
      playerName: save.playerName,
      roomId: save.roomId,
      hostId: save.hostId,
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
  },

  clearSave: () => clearPersistedGame(),

  // ── Misc ──────────────────────────────────────────────────────────────────

  reset: () => set({ ...initialState, settings: { ...defaultSettings } }),

  isHost: () => {
    const s = get()
    // In solo mode everyone is host. In multiplayer, match by hostId.
    if (s.settings.soloMode) return true
    const me = s.players.find((p) => p.name === s.playerName)
    return me?.id === s.hostId
  },
}))