// src/components/Avatar/AvatarGenerator.tsx
import { useMemo, useState, useCallback } from 'react'
import './AvatarGenerator.scss'

export type AvatarConfig = {
  seed: number
  bgColor: string
  faceColor: string
  eyeType: number
  mouthType: number
  hairType: number
  hairColor: string
  accessory: number
}

const BG_COLORS = [
  '#6c5ce7', '#00cec9', '#fd79a8', '#fdcb6e', '#e17055',
  '#74b9ff', '#a29bfe', '#55efc4', '#ff7675', '#81ecec',
]
const HAIR_COLORS = [
  '#2d3436', '#6c5ce7', '#fdcb6e', '#e17055', '#fd79a8',
  '#74b9ff', '#ffffff', '#b2bec3', '#00cec9', '#a29bfe',
]
const FACE_COLORS = ['#ffeaa7', '#fab1a0', '#fdcb6e', '#f8c8a0', '#ffe0bd', '#ffd7b5']

function hashSeed(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = Math.imul(31, h) + name.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

export function generateAvatarConfig(name: string, seed?: number): AvatarConfig {
  const s = seed ?? hashSeed(name)
  const r = (n: number) => (s >> n) & 0xff
  return {
    seed: s,
    bgColor: BG_COLORS[r(0) % BG_COLORS.length],
    faceColor: FACE_COLORS[r(8) % FACE_COLORS.length],
    eyeType: r(16) % 4,
    mouthType: r(24) % 5,
    hairType: r(4) % 6,
    hairColor: HAIR_COLORS[r(12) % HAIR_COLORS.length],
    accessory: r(20) % 4,
  }
}

export function randomAvatarConfig(): AvatarConfig {
  const seed = Math.floor(Math.random() * 0xffffff)
  return generateAvatarConfig('', seed)
}

function AvatarSVG({ config, size = 80 }: { config: AvatarConfig; size?: number }) {
  const { bgColor, faceColor, eyeType, mouthType, hairType, hairColor, accessory } = config

  // Hair shapes
  const hairPaths = [
    // Short
    `M 22 38 Q 40 20 58 38 Q 56 18 40 14 Q 24 18 22 38 Z`,
    // Long
    `M 18 38 Q 40 18 62 38 L 62 55 Q 55 72 40 75 Q 25 72 18 55 Z M 18 38 Q 40 20 62 38 Q 58 16 40 12 Q 22 16 18 38 Z`,
    // Curly
    `M 22 40 Q 28 20 40 18 Q 52 20 58 40 Q 54 15 48 14 Q 44 12 40 12 Q 36 12 32 14 Q 26 15 22 40 Z`,
    // Bun
    `M 22 38 Q 40 22 58 38 Q 56 20 40 16 Q 24 20 22 38 Z M 34 18 Q 40 8 46 18 Q 40 14 34 18 Z`,
    // Side part
    `M 20 36 Q 24 16 40 14 Q 54 16 62 36 Q 58 14 50 12 Q 40 10 28 14 Z`,
    // Mohawk
    `M 22 38 Q 40 24 58 38 Q 56 22 40 15 Q 24 22 22 38 Z M 37 20 L 37 10 L 43 10 L 43 20 Z`,
  ]

  // Eye shapes
  const renderEyes = () => {
    switch (eyeType) {
      case 0: return <> {/* Round */}
        <circle cx="31" cy="44" r="4" fill="#2d3436" />
        <circle cx="49" cy="44" r="4" fill="#2d3436" />
        <circle cx="32" cy="43" r="1.5" fill="white" />
        <circle cx="50" cy="43" r="1.5" fill="white" />
      </>
      case 1: return <> {/* Squint */}
        <path d="M 27 44 Q 31 40 35 44" stroke="#2d3436" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M 45 44 Q 49 40 53 44" stroke="#2d3436" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </>
      case 2: return <> {/* Stars */}
        <text x="27" y="48" fontSize="10" textAnchor="middle">★</text>
        <text x="53" y="48" fontSize="10" textAnchor="middle">★</text>
      </>
      case 3: return <> {/* Big */}
        <ellipse cx="31" cy="44" rx="5.5" ry="6" fill="#2d3436" />
        <ellipse cx="49" cy="44" rx="5.5" ry="6" fill="#2d3436" />
        <circle cx="32" cy="42" r="2" fill="white" />
        <circle cx="50" cy="42" r="2" fill="white" />
      </>
      default: return null
    }
  }

  // Mouth shapes
  const renderMouth = () => {
    switch (mouthType) {
      case 0: return <path d="M 33 57 Q 40 63 47 57" stroke="#2d3436" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      case 1: return <path d="M 33 60 Q 40 65 47 60 Q 40 70 33 60 Z" fill="#e17055" />
      case 2: return <path d="M 33 58 Q 40 55 47 58" stroke="#2d3436" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      case 3: return <>
        <path d="M 33 57 Q 40 65 47 57 Q 40 70 33 57 Z" fill="#e17055" />
        <path d="M 35 57 Q 40 59 45 57" stroke="white" strokeWidth="1.5" fill="none" />
      </>
      case 4: return <circle cx="40" cy="59" r="4" fill="#2d3436" />
      default: return null
    }
  }

  // Accessories
  const renderAccessory = () => {
    switch (accessory) {
      case 1: return <> {/* Glasses */}
        <rect x="24" y="40" width="14" height="9" rx="3" stroke="#2d3436" strokeWidth="2" fill="none" />
        <rect x="42" y="40" width="14" height="9" rx="3" stroke="#2d3436" strokeWidth="2" fill="none" />
        <line x1="38" y1="44" x2="42" y2="44" stroke="#2d3436" strokeWidth="2" />
      </>
      case 2: return <> {/* Earrings */}
        <circle cx="21" cy="50" r="3" fill="#fdcb6e" />
        <circle cx="59" cy="50" r="3" fill="#fdcb6e" />
      </>
      case 3: return <> {/* Crown */}
        <path d="M 28 28 L 28 20 L 34 25 L 40 18 L 46 25 L 52 20 L 52 28 Z" fill="#fdcb6e" />
        <circle cx="40" cy="20" r="2" fill="#e17055" />
      </>
      default: return null
    }
  }

  return (
    <svg width={size} height={size} viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      {/* Background */}
      <circle cx="40" cy="40" r="40" fill={bgColor} />
      {/* Hair back */}
      <path d={hairPaths[hairType]} fill={hairColor} opacity="0.9" />
      {/* Face */}
      <ellipse cx="40" cy="50" rx="20" ry="22" fill={faceColor} />
      {/* Ears */}
      <ellipse cx="20" cy="50" rx="4" ry="5" fill={faceColor} />
      <ellipse cx="60" cy="50" rx="4" ry="5" fill={faceColor} />
      {/* Hair front */}
      <path d={hairPaths[hairType]} fill={hairColor} clipPath="url(#faceClip)" opacity="0.6" />
      <defs>
        <clipPath id="faceClip">
          <ellipse cx="40" cy="50" rx="20" ry="22" />
        </clipPath>
      </defs>
      {/* Eyes */}
      {renderEyes()}
      {/* Nose */}
      <path d="M 38 50 Q 40 53 42 50" stroke={faceColor} strokeWidth="1.5" fill="none" style={{ filter: 'brightness(0.8)' }} />
      {/* Mouth */}
      {renderMouth()}
      {/* Accessory */}
      {renderAccessory()}
      {/* Cheeks */}
      <circle cx="27" cy="53" r="5" fill="#fd79a8" opacity="0.25" />
      <circle cx="53" cy="53" r="5" fill="#fd79a8" opacity="0.25" />
    </svg>
  )
}

// Cookie helpers
function saveToCookie(name: string, config: AvatarConfig) {
  const val = encodeURIComponent(JSON.stringify(config))
  document.cookie = `avatar_${name}=${val};path=/;max-age=${60 * 60 * 24 * 365}`
}

function loadFromCookie(name: string): AvatarConfig | null {
  const match = document.cookie.match(new RegExp(`avatar_${name}=([^;]+)`))
  if (!match) return null
  try { return JSON.parse(decodeURIComponent(match[1])) } catch { return null }
}

export type AvatarPickerProps = {
  playerName: string
  onSave: (config: AvatarConfig) => void
}

export function AvatarPicker({ playerName, onSave }: AvatarPickerProps) {
  const initial = useMemo(() => {
    return loadFromCookie(playerName) ?? generateAvatarConfig(playerName)
  }, [playerName])

  const [config, setConfig] = useState<AvatarConfig>(initial)
  const [saved, setSaved] = useState(false)

  const reroll = useCallback(() => {
    setConfig(randomAvatarConfig())
    setSaved(false)
  }, [])

  const handleSave = () => {
    saveToCookie(playerName, config)
    onSave(config)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="si-avatar-picker">
      <div className="si-avatar-picker__preview">
        <AvatarSVG config={config} size={100} />
      </div>
      <div className="si-avatar-picker__actions">
        <button className="si-avatar-picker__reroll" onClick={reroll} type="button">
          🎲 Générer
        </button>
        <button
          className={`si-avatar-picker__save ${saved ? 'saved' : ''}`}
          onClick={handleSave}
          type="button"
        >
          {saved ? '✅ Sauvegardé !' : '💾 Sauvegarder'}
        </button>
      </div>
    </div>
  )
}

// Small avatar display
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const config = useMemo(() => {
    return loadFromCookie(name) ?? generateAvatarConfig(name)
  }, [name])
  return <AvatarSVG config={config} size={size} />
}

export { AvatarSVG }
export { saveToCookie, loadFromCookie }