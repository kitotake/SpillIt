import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { PlayerList } from '../../components/PlayerList/PlayerList'
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
  const roomId = useGameStore((s) => s.roomId)
  const playerName = useGameStore((s) => s.playerName)
  const players = useGameStore((s) => s.players)
  const settings = useGameStore((s) => s.settings)
  const setSettings = useGameStore((s) => s.setSettings)
  const addPlayer = useGameStore((s) => s.addPlayer)
  const togglePlayerReady = useGameStore((s) => s.togglePlayerReady)
  const startGame = useGameStore((s) => s.startGame)
  const reset = useGameStore((s) => s.reset)

  const [newName, setNewName] = useState('')
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    if (!roomId || !playerName) navigate('/')
  }, [navigate, playerName, roomId])

  const me = useMemo(() => players.find((p) => p.name === playerName), [players, playerName])

  useEffect(() => {
    if (settings.soloMode && me && !me.ready) togglePlayerReady(me.id)
  }, [settings.soloMode, me?.id])

  const activePlayers = players.filter((p) => !p.isSpectator)
  const readyCount = activePlayers.filter((p) => p.ready).length
  const canStart = activePlayers.length > 0 && readyCount === activePlayers.length

  const onAddPlayer = () => {
    if (!newName.trim()) return
    addPlayer(newName.trim())
    setNewName('')
    sounds.click()
  }

  const onStart = () => {
    resumeAudio()
    sounds.click()
    startGame()
    navigate('/game')
  }

  const onReset = () => {
    reset()
    navigate('/')
  }

  const onCopyRoom = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true)
      sounds.click()
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // 🔗 Copy invite link
  const onCopyLink = () => {
    const link = `${window.location.origin}/?room=${roomId}`
    navigator.clipboard.writeText(link).then(() => {
      setLinkCopied(true)
      sounds.click()
      setTimeout(() => setLinkCopied(false), 2500)
    })
  }

  return (
    <div className="si-page si-lobby">
      <div className="si-lobby__header">
        <h1>{settings.soloMode ? '🎮 Mode Solo' : '🏠 Lobby'}</h1>
        <div className="si-lobby__meta">
          <button className="si-lobby__badge si-lobby__badge--copy" onClick={onCopyRoom}>
            Code: <strong>{roomId}</strong> {copied ? '✅' : '📋'}
          </button>
          <span className="si-lobby__badge">
            Joueurs: <strong>{activePlayers.length}</strong>
            {players.filter((p) => p.isSpectator).length > 0 &&
              ` + ${players.filter((p) => p.isSpectator).length} 👁️`}
          </span>
          {settings.soloMode && (
            <span className="si-lobby__badge si-lobby__badge--solo">Solo</span>
          )}
        </div>

        {/* 🔗 Invite link */}
        {!settings.soloMode && (
          <button className="si-lobby__invite-link" onClick={onCopyLink}>
            {linkCopied
              ? '✅ Lien copié ! Envoie-le à tes amis'
              : '🔗 Copier le lien d\'invitation'}
          </button>
        )}
      </div>

      <div className="si-lobby__columns">
        <Card className="si-lobby__card">
          <h2>Joueurs</h2>
          <PlayerList />
          {!settings.soloMode && (
            <div className="si-lobby__add">
              <Input
                value={newName}
                placeholder="Ajouter un joueur local..."
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onAddPlayer()}
              />
              <Button variant="secondary" onClick={onAddPlayer} disabled={!newName.trim()}>
                +
              </Button>
            </div>
          )}
        </Card>

        <Card className="si-lobby__card">
          <h2>Paramètres</h2>
          <div className="si-lobby__settings">
            <label>
              Nombre de questions
              <input
                type="number"
                min={3}
                max={20}
                value={settings.questionCount}
                onChange={(e) => setSettings({ questionCount: Number(e.target.value) })}
              />
            </label>
            <label>
              Temps par question (s)
              <input
                type="number"
                min={6}
                max={60}
                value={settings.secondsPerQuestion}
                onChange={(e) => setSettings({ secondsPerQuestion: Number(e.target.value) })}
              />
            </label>

            <div className="si-lobby__toggle-row">
              <span>🎲 Toutes catégories</span>
              <button
                className={`si-lobby__toggle ${settings.randomAllCategories ? 'on' : ''}`}
                onClick={() => setSettings({ randomAllCategories: !settings.randomAllCategories })}
                type="button"
              >
                {settings.randomAllCategories ? 'ON' : 'OFF'}
              </button>
            </div>

            {!settings.randomAllCategories && (
              <label>
                Catégorie
                <select
                  value={settings.category}
                  onChange={(e) => setSettings({ category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="si-lobby__actions">
            <Button onClick={onStart} disabled={!canStart || !me || me.isSpectator}>
              🚀 Démarrer
            </Button>
            <Button variant="danger" onClick={onReset}>← Retour</Button>
          </div>

          {!settings.soloMode && (
            <p className="si-lobby__hint">
              {readyCount}/{activePlayers.length} joueurs prêts
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}