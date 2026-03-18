// Lightweight Web Audio API sound effects — no external deps
const ctx = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null

function beep(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.18) {
  if (!ctx) return
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = type
    osc.frequency.setValueAtTime(freq, ctx.currentTime)
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
  } catch (_) {}
}

export const sounds = {
  answer: () => beep(440, 0.12, 'sine', 0.15),
  correct: () => {
    beep(523, 0.1, 'sine', 0.18)
    setTimeout(() => beep(659, 0.15, 'sine', 0.18), 100)
    setTimeout(() => beep(784, 0.2, 'sine', 0.18), 200)
  },
  wrong: () => beep(220, 0.25, 'sawtooth', 0.1),
  tick: () => beep(880, 0.04, 'square', 0.07),
  danger: () => beep(330, 0.08, 'sawtooth', 0.12),
  victory: () => {
    const notes = [523, 659, 784, 1047]
    notes.forEach((n, i) => setTimeout(() => beep(n, 0.18, 'sine', 0.2), i * 120))
  },
  click: () => beep(600, 0.06, 'sine', 0.1),
}

export function resumeAudio() {
  if (ctx && ctx.state === 'suspended') ctx.resume()
}