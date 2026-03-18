// Lazy-init AudioContext — only created on first user interaction
let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    } catch (_) {
      return null
    }
  }
  return ctx
}

function beep(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.18) {
  const audioCtx = getCtx()
  if (!audioCtx) return
  try {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.type = type
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime)
    gain.gain.setValueAtTime(volume, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration)
    osc.start(audioCtx.currentTime)
    osc.stop(audioCtx.currentTime + duration)
  } catch (_) {}
}

export const sounds = {
  answer:  () => beep(440, 0.12, 'sine', 0.15),
  correct: () => {
    beep(523, 0.1, 'sine', 0.18)
    setTimeout(() => beep(659, 0.15, 'sine', 0.18), 100)
    setTimeout(() => beep(784, 0.2,  'sine', 0.18), 200)
  },
  wrong:   () => beep(220, 0.25, 'sawtooth', 0.1),
  tick:    () => beep(880, 0.04, 'square', 0.07),
  danger:  () => beep(330, 0.08, 'sawtooth', 0.12),
  victory: () => {
    const notes = [523, 659, 784, 1047]
    notes.forEach((n, i) => setTimeout(() => beep(n, 0.18, 'sine', 0.2), i * 120))
  },
  click:   () => beep(600, 0.06, 'sine', 0.1),
}

export function resumeAudio() {
  const audioCtx = getCtx()
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume()
}