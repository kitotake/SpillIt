// Single source of truth for ID generation
export function makeId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function computeMajority(
  players: { answer?: string; isSpectator?: boolean }[]
): 'yes' | 'no' | 'tie' {
  const active = players.filter((p) => !p.isSpectator)
  const yes = active.filter((p) => p.answer === 'yes').length
  const no = active.filter((p) => p.answer === 'no').length
  if (yes > no) return 'yes'
  if (no > yes) return 'no'
  return 'tie'
}

export function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}