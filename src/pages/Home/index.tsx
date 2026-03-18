import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { useGameStore } from '../../store/useGameStore'
import './Home.scss'

function makeRoomId() {
  return Math.random().toString(36).slice(2, 9).toUpperCase()
}

export function HomePage() {
  const navigate = useNavigate()
  const setPlayerName = useGameStore((s) => s.setPlayerName)
  const setRoomId = useGameStore((s) => s.setRoomId)
  const reset = useGameStore((s) => s.reset)
  const [name, setName] = useState('')
  const [room, setRoom] = useState('')

  const canJoin = name.trim().length > 0 && room.trim().length > 0
  const canCreate = name.trim().length > 0

  const onCreate = () => {
    const generated = makeRoomId()
    setPlayerName(name)
    setRoomId(generated)
    navigate('/lobby')
  }

  const onJoin = () => {
    setPlayerName(name)
    setRoomId(room.toUpperCase())
    navigate('/lobby')
  }

  const onReset = () => {
    reset()
    setName('')
    setRoom('')
  }

  const helpText = useMemo(() => {
    if (!name.trim()) return 'Choisis un pseudo pour démarrer.'
    if (!room.trim()) return 'Entre un code de salon ou crée-en un nouveau.'
    return ''
  }, [name, room])

  return (
    <div className="si-page si-home">
      <Card className="si-home__card">
        <h1 className="si-home__title">Spill It!</h1>
        <p className="si-home__subtitle">Joue avec des potes. Réponses rapides. Rires garantis.</p>

        <div className="si-home__form">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ton pseudo..."
            maxLength={16}
            autoFocus
          />
          <div className="si-home__join">
            <Input
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="Code de salon (ex: 1AB2C)"
              maxLength={8}
            />
            <Button variant="secondary" disabled={!canJoin} onClick={onJoin}>
              Rejoindre
            </Button>
          </div>

          <div className="si-home__create">
            <Button variant="primary" disabled={!canCreate} onClick={onCreate}>
              Créer une partie
            </Button>
            <Button variant="secondary" onClick={onReset}>
              Réinitialiser
            </Button>
          </div>

          {helpText && <p className="si-home__hint">{helpText}</p>}
        </div>
      </Card>
    </div>
  )
}
