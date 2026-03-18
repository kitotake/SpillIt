import type { GamePhase, GameSettings, Player, Question, RoundRecord, SavedGame } from '../types/game'

const SAVE_KEY = 'spillit_saved_game'
const MAX_AGE_MS = 2 * 60 * 60 * 1000 // 2 hours

export function persistGame(data: {
  phase: GamePhase
  playerName: string
  roomId: string
  hostId: string
  players: Player[]
  settings: GameSettings
  questions: Question[]
  questionIndex: number
  history: RoundRecord[]
}) {
  if (data.phase === 'home') return
  const save: SavedGame = { ...data, savedAt: Date.now() }
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save))
  } catch (_) {}
}

export function loadPersistedGame(): SavedGame | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const save: SavedGame = JSON.parse(raw)
    if (Date.now() - save.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(SAVE_KEY)
      return null
    }
    return save
  } catch (_) {
    return null
  }
}

export function clearPersistedGame() {
  try { localStorage.removeItem(SAVE_KEY) } catch (_) {}
}

export function hasSavedGame(): boolean {
  return loadPersistedGame() !== null
}