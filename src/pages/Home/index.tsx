// src/pages/Home/index.tsx
import { useMemo, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { SplashScreen } from '../../components/SplashScreen/SplashScreen'
import { AvatarPicker, Avatar } from '../../components/Avatar/AvatarGenerator'
import { useGameStore } from '../../store/useGameStore'
import { sounds, resumeAudio } from '../../utils/sounds'
import './Home.scss'

function makeRoomId() {
  return Math.random().toString(36).slice(2, 7).toUpperCase()
}

export function HomePage() {
  const navigate = useNavigate()
  const setPlayerName = useGameStore((s) => s.setPlayerName)
  const setRoomId = useGameStore((s) => s.setRoomId)
  const addPlayer = useGameStore((s) => s.addPlayer)
  const setSettings = useGameStore((s) => s.setSettings)
  const loadGame = useGameStore((s) => s.loadGame)
  const clearSave = useGameStore((s) => s.clearSave)
  const reset = useGameStore((s) => s.reset)

  const [name, setName] = useState('')
  const [room, setRoom] = useState('')
  const [showSplash, setShowSplash] = useState(true)
  const [savedGame, setSavedGame] = useState<{ exists: boolean; savedAt?: number }>({ exists: false })
  const [linkCopied, setLinkCopied] = useState(false)
  const [inviteRoomId, setInviteRoomId] = useState('')
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [avatarSaved, setAvatarSaved] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const roomParam = params.get('room')
    if (roomParam) {
      setRoom(roomParam.toUpperCase())
      window.history.replaceState({}, '', '/')
    }
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('spillit_saved_game')
      if (raw) {
        const s = JSON.parse(raw)
        if (Date.now() - s.savedAt < 2 * 60 * 60 * 1000) {
          setSavedGame({ exists: true, savedAt: s.savedAt })
        }
      }
    } catch (_) {}
  }, [])

  const canJoin = name.trim().length > 0 && room.trim().length > 0
  const canCreate = name.trim().length > 0

  const go = useCallback((fn: () => void) => {
    resumeAudio()
    sounds.click()
    fn()
  }, [])

  const onCreate = () => go(() => {
    const generated = makeRoomId()
    setPlayerName(name.trim())
    setRoomId(generated)
    setSettings({ soloMode: false, randomAllCategories: false })
    addPlayer(name.trim())
    navigate('/lobby')
  })

  const onJoin = () => go(() => {
    setPlayerName(name.trim())
    setRoomId(room.toUpperCase())
    setSettings({ soloMode: false, randomAllCategories: false })
    addPlayer(name.trim())
    navigate('/lobby')
  })

  const onJoinSpectator = () => go(() => {
    setPlayerName(name.trim())
    setRoomId(room.toUpperCase())
    setSettings({ soloMode: false, randomAllCategories: false })
    addPlayer(name.trim(), true)
    navigate('/lobby')
  })

  const onSolo = () => go(() => {
    const generated = makeRoomId()
    setPlayerName(name.trim())
    setRoomId(generated)
    setSettings({ soloMode: true, randomAllCategories: false })
    addPlayer(name.trim())
    navigate('/lobby')
  })

  const onResume = () => go(() => {
    const loaded = loadGame()
    if (loaded) navigate('/game')
  })

  const onDiscardSave = () => {
    clearSave()
    reset()
    setSavedGame({ exists: false })
  }

  const onReset = () => {
    reset()
    setName('')
    setRoom('')
    setSavedGame({ exists: false })
  }

  const onGenerateLink = () => {
    const id = room.trim().toUpperCase() || makeRoomId()
    if (!room.trim()) setRoom(id)
    setInviteRoomId(id)
    const link = `${window.location.origin}/?room=${id}`
    navigator.clipboard.writeText(link).then(() => {
      setLinkCopied(true)
      sounds.click()
      setTimeout(() => setLinkCopied(false), 2500)
    })
  }

  const helpText = useMemo(() => {
    if (!name.trim()) return 'Choisis un pseudo pour démarrer.'
    if (!room.trim()) return 'Entre un code de salon ou crée une partie.'
    return ''
  }, [name, room])

  if (showSplash) return <SplashScreen onDone={() => setShowSplash(false)} />

  return (
    <div className="si-page si-home">
      <Card className="si-home__card">
        <div className="si-home__hero">
          <span className="si-home__emoji">🌶️</span>
          <h1 className="si-home__title">Spill It!</h1>
        </div>
        <p className="si-home__subtitle">
          Joue avec des potes. Réponses rapides. Rires garantis.
        </p>

        {savedGame.exists && (
          <div className="si-home__save-banner">
            <span>💾 Partie sauvegardée disponible</span>
            <div className="si-home__save-actions">
              <button className="si-home__save-btn si-home__save-btn--resume" onClick={onResume}>
                ▶ Reprendre
              </button>
              <button className="si-home__save-btn si-home__save-btn--discard" onClick={onDiscardSave}>
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="si-home__form">
          {/* Pseudo + Avatar row */}
          <div className="si-home__pseudo-row">
            <Input
              value={name}
              onChange={(e) => { setName(e.target.value); setShowAvatarPicker(false) }}
              placeholder="Ton pseudo..."
              maxLength={16}
              autoFocus
            />
            {name.trim().length > 0 && (
              <button
                className={`si-home__avatar-btn ${avatarSaved ? 'saved' : ''}`}
                type="button"
                onClick={() => setShowAvatarPicker((v) => !v)}
                title="Personnaliser mon avatar"
              >
                <Avatar name={name.trim()} size={36} />
              </button>
            )}
          </div>

          {/* Avatar picker */}
          {showAvatarPicker && name.trim().length > 0 && (
            <div className="si-home__avatar-picker-wrap">
              <AvatarPicker
                playerName={name.trim()}
                onSave={() => {
                  setAvatarSaved(true)
                  setShowAvatarPicker(false)
                  setTimeout(() => setAvatarSaved(false), 2000)
                }}
              />
            </div>
          )}

          {avatarSaved && (
            <p className="si-home__avatar-saved-msg">✅ Avatar sauvegardé en cookie !</p>
          )}

          {/* JOIN SECTION */}
          <div className="si-home__section-label">Rejoindre une partie</div>
          <div className="si-home__join">
            <Input
              value={room}
              onChange={(e) => setRoom(e.target.value.toUpperCase())}
              placeholder="Code du salon (ex: AB12C)"
              maxLength={8}
              onKeyDown={(e) => e.key === 'Enter' && canJoin && onJoin()}
            />
            <Button variant="secondary" disabled={!canJoin} onClick={onJoin}>
              Rejoindre
            </Button>
          </div>

          {canJoin && (
            <button className="si-home__spectator-btn" onClick={onJoinSpectator} type="button">
              👁️ Rejoindre en spectateur
            </button>
          )}

          <button
            className={`si-home__invite-btn ${linkCopied ? 'copied' : ''}`}
            onClick={onGenerateLink}
            type="button"
            disabled={!room.trim() && !canCreate}
          >
            {linkCopied
              ? `✅ Lien copié ! (${inviteRoomId})`
              : '🔗 Copier le lien d\'invitation'}
          </button>

          {/* CREATE SECTION */}
          <div className="si-home__section-label">Nouvelle partie</div>
          <div className="si-home__create">
            <Button variant="primary" disabled={!canCreate} onClick={onCreate}>
              ✨ Créer une partie
            </Button>
            <Button
              variant="secondary"
              disabled={!canCreate}
              onClick={onSolo}
              className="si-home__solo-btn"
            >
              🎮 Solo
            </Button>
          </div>

          <button className="si-home__reset" onClick={onReset} type="button">
            Réinitialiser
          </button>

          {helpText && <p className="si-home__hint">{helpText}</p>}
        </div>
      </Card>
    </div>
  )
}