import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { PlayerList } from '../../components/PlayerList/PlayerList'
import { useGameStore } from '../../store/useGameStore'
import './Lobby.scss'

export function LobbyPage() {
  const navigate = useNavigate()
  const roomId = useGameStore((s) => s.roomId)
  const playerName = useGameStore((s) => s.playerName)
  const players = useGameStore((s) => s.players)
  const settings = useGameStore((s) => s.settings)
  const setSettings = useGameStore((s) => s.setSettings)
  const addPlayer = useGameStore((s) => s.addPlayer)
  const startGame = useGameStore((s) => s.startGame)
  const reset = useGameStore((s) => s.reset)

  const [newName, setNewName] = useState('')

  useEffect(() => {
    if (!roomId || !playerName) {
      navigate('/')
    }
  }, [navigate, playerName, roomId])

  const me = useMemo(() => players.find((p) => p.name === playerName), [players, playerName])

  const readyCount = players.filter((p) => p.ready).length
  const canStart = players.length > 0 && readyCount === players.length

  const onAddPlayer = () => {
    if (!newName.trim()) return
    addPlayer(newName)
    setNewName('')
  }

  const onStart = () => {
    startGame()
    navigate('/game')
  }

  const onReset = () => {
    reset()
    navigate('/')
  }

  return (
    <div className="si-page si-lobby">
      <div className="si-lobby__header">
        <h1>Lobby</h1>
        <div className="si-lobby__meta">
          <span>Room: <strong>{roomId}</strong></span>
          <span>Joueurs: <strong>{players.length}</strong></span>
        </div>
      </div>

      <div className="si-lobby__columns">
        <Card className="si-lobby__card">
          <h2>Joueurs</h2>
          <PlayerList />
          <div className="si-lobby__add">
            <Input
              value={newName}
              placeholder="Ajouter un joueur..."
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAddPlayer()}
            />
            <Button variant="secondary" onClick={onAddPlayer} disabled={!newName.trim()}>
              +
            </Button>
          </div>
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
                max={30}
                value={settings.secondsPerQuestion}
                onChange={(e) => setSettings({ secondsPerQuestion: Number(e.target.value) })}
              />
            </label>
            <label>
              Catégorie
              <select
                value={settings.category}
                onChange={(e) => setSettings({ category: e.target.value })}
              >
                <option value="fun">Fun</option>
                <option value="spicy">Spicy</option>
                <option value="wtf">WTF</option>
                <option value="deep">Deep</option>
              </select>
            </label>
          </div>

          <div className="si-lobby__actions">
            <Button onClick={onStart} disabled={!canStart || !me}>
              Démarrer la partie
            </Button>
            <Button variant="danger" onClick={onReset}>
              Retour menu
            </Button>
          </div>

          <p className="si-lobby__hint">
            Les joueurs doivent être prêts pour démarrer. (Clique sur "Ready" à côté de ton nom)
          </p>
        </Card>
      </div>
    </div>
  )
}
