import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { PlayerList } from '../../components/PlayerList/PlayerList'
import { ConnectionStatus } from '../../components/ConnectionStatus/ConnectionStatus'
import { useGameStore } from '../../store/useGameStore'
import { sounds, resumeAudio } from '../../utils/sounds'
import './Lobby.scss'

const CATEGORIES = [
  { value: 'fun', label: '😄 Fun' },
  { value: 'spicy', label: '🌶️ Spicy' },
  { value: 'wtf', label: '🤯 WTF' },
  { value: 'deep', label: '🧠 Deep' },
  { value: 'amour', label: '❤️ Amour' },
  { value: 'voyage', label: '✈️ Voyage' },
  { value: 'musique', label: '🎵 Musique' },
  { value: 'cinema', label: '🎬 Cinéma' },
  { value: 'sport', label: '⚽ Sport' },
  { value: 'philosophie', label: '🤔 Philo' },
  { value: 'cuisine', label: '🍳 Cuisine' },
]

export function LobbyPage() {
  const navigate = useNavigate()

  const roomId     = useGameStore((s) => s.roomId)
  const playerName = useGameStore((s) => s.playerName)
  const players    = useGameStore((s) => s.players)
  const settings   = useGameStore((s) => s.settings)

  const setSettings = useGameStore((s) => s.setSettings)
  const addPlayer   = useGameStore((s) => s.addPlayer)
  const startGame   = useGameStore((s) => s.startGame)
  const reset       = useGameStore((s) => s.reset)
  const isHost      = useGameStore((s) => s.isHost)

  const [newName, setNewName]       = useState('')
  const [copied, setCopied]         = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  // 🔍 Joueur courant
  const me = useMemo(
    () => players.find((p) => p.name === playerName),
    [players, playerName]
  )

  // ✅ AUTO READY SOLO (SAFE - PAS DE TOGGLE)
  useEffect(() => {
    if (!settings.soloMode || !me || me.ready) return

    useGameStore.setState((s) => ({
      players: s.players.map((p) =>
        p.id === me.id ? { ...p, ready: true } : p
      ),
    }))
  }, [settings.soloMode, me])

  // 🎯 Derived state
  const activePlayers = useMemo(
    () => players.filter((p) => !p.isSpectator),
    [players]
  )

  const readyCount = activePlayers.filter((p) => p.ready).length

  const canStart =
    activePlayers.length > 0 &&
    readyCount === activePlayers.length &&
    isHost()

  // ➕ Ajouter joueur
  const onAddPlayer = () => {
    if (!newName.trim()) return
    addPlayer(newName.trim())
    setNewName('')
    sounds.click()
  }

  // 🚀 Start
  const onStart = () => {
    resumeAudio()
    sounds.click()
    startGame()
    navigate('/game')
  }

  // 📋 Copier code
  const onCopyRoom = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true)
      sounds.click()
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // 🔗 Copier lien
  const onCopyLink = () => {
    const link = `${window.location.origin}/?room=${roomId}`
    navigator.clipboard.writeText(link).then(() => {
      setLinkCopied(true)
      sounds.click()
      setTimeout(() => setLinkCopied(false), 2500)
    })
  }

  const amHost = isHost()

  return (
    <div className="si-page si-lobby">
      <ConnectionStatus />

      {/* HEADER */}
      <div className="si-lobby__header">
        <h1>{settings.soloMode ? '🎮 Mode Solo' : '🏠 Lobby'}</h1>

        <div className="si-lobby__meta">
          <button
            className="si-lobby__badge si-lobby__badge--copy"
            onClick={onCopyRoom}
          >
            Code: <strong>{roomId}</strong> {copied ? '✅' : '📋'}
          </button>

          <span className="si-lobby__badge">
            Joueurs: <strong>{activePlayers.length}</strong>
            {players.some((p) => p.isSpectator) &&
              ` + ${players.filter((p) => p.isSpectator).length} 👁️`}
          </span>

          {settings.soloMode && (
            <span className="si-lobby__badge si-lobby__badge--solo">
              Solo
            </span>
          )}

          {amHost && !settings.soloMode && (
            <span className="si-lobby__badge si-lobby__badge--host">
              👑 Host
            </span>
          )}
        </div>

        {!settings.soloMode && (
          <button className="si-lobby__invite-link" onClick={onCopyLink}>
            {linkCopied
              ? '✅ Lien copié !'
              : "🔗 Copier le lien d'invitation"}
          </button>
        )}
      </div>

      {/* CONTENT */}
      <div className="si-lobby__columns">
        {/* JOUEURS */}
        <Card className="si-lobby__card">
          <h2>Joueurs</h2>
          <PlayerList />

          {!settings.soloMode && (
            <div className="si-lobby__add">
              <Input
                value={newName}
                placeholder="Ajouter un joueur local..."
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && onAddPlayer()
                }
              />
              <Button
                variant="secondary"
                onClick={onAddPlayer}
                disabled={!newName.trim()}
              >
                +
              </Button>
            </div>
          )}
        </Card>

        {/* SETTINGS */}
        <Card className="si-lobby__card">
          <h2>Paramètres</h2>

          <div className="si-lobby__settings">
            {/* Questions */}
            <div className="si-lobby__slider-row">
              <label>
                Questions <strong>{settings.questionCount}</strong>
              </label>
              <input
                type="range"
                min={3}
                max={20}
                value={settings.questionCount}
                disabled={!amHost}
                onChange={(e) =>
                  setSettings({
                    questionCount: Number(e.target.value),
                  })
                }
              />
            </div>

            {/* Timer */}
            <div className="si-lobby__slider-row">
              <label>
                Temps <strong>{settings.secondsPerQuestion}s</strong>
              </label>
              <input
                type="range"
                min={6}
                max={60}
                step={2}
                value={settings.secondsPerQuestion}
                disabled={!amHost}
                onChange={(e) =>
                  setSettings({
                    secondsPerQuestion: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>

          {/* ACTIONS */}
          <div className="si-lobby__actions">
            {amHost ? (
              <Button
                onClick={onStart}
                disabled={!canStart || me?.isSpectator}
              >
                🚀 Démarrer
              </Button>
            ) : (
              <p className="si-lobby__hint">
                ⏳ En attente du host…
              </p>
            )}

            <Button
              variant="danger"
              onClick={() => {
                reset()
                navigate('/')
              }}
            >
              ← Retour
            </Button>
          </div>

          {!settings.soloMode && (
            <p className="si-lobby__hint">
              {readyCount}/{activePlayers.length} prêts
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}