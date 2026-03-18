import { useGameStore } from '../../store/useGameStore'
import './ConnectionStatus.scss'

export function ConnectionStatus() {
  const status = useGameStore((s) => s.connectionStatus)
  const reconnecting = useGameStore((s) => s.reconnecting)

  // Don't show when connected and stable
  if (status === 'connected' && !reconnecting) return null

  const label =
    status === 'connecting' || reconnecting ? '🔄 Connexion…' :
    status === 'disconnected'               ? '⚠️ Déconnecté' :
    status === 'error'                      ? '❌ Erreur réseau' : null

  if (!label) return null

  return (
    <div className={`si-conn si-conn--${status}`} role="status">
      {label}
    </div>
  )
}
