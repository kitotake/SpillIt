import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { HomePage }    from './pages/Home'
import { LobbyPage }   from './pages/Lobby'
import { GamePage }    from './pages/Game'
import { GuessPage }   from './pages/Guess'
import { ResultsPage } from './pages/Results'
import { ConnectionStatus } from './components/ConnectionStatus/ConnectionStatus'
import { useSocket }   from './hooks/useSocket'
import './App.css'

// Init socket connection at app root
function SocketInit() {
  useSocket() // registers connect/disconnect listeners + sets store status
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <SocketInit />
      <ConnectionStatus />
      <Routes>
        <Route path="/"        element={<HomePage />}    />
        <Route path="/lobby"   element={<LobbyPage />}   />
        <Route path="/game"    element={<GamePage />}    />
        <Route path="/guess"   element={<GuessPage />}   />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="*"        element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}