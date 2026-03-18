/**
 * socket.ts — service Socket.IO
 *
 * Installation : npm install socket.io-client
 * Config .env  : VITE_WS_URL=http://localhost:3000
 *
 * Brancher dans App.tsx :
 *   import { socketService } from './services/socket'
 *   useEffect(() => { socketService.connect() }, [])
 */

import { io, Socket } from 'socket.io-client'

const WS_URL = import.meta.env.VITE_WS_URL || ''

class SocketService {
  private socket: Socket | null = null

  get isConnected() {
    return this.socket?.connected ?? false
  }

  connect(url = WS_URL) {
    if (!url) {
      console.info('[Socket] VITE_WS_URL non configuré — mode local uniquement')
      return
    }
    if (this.socket?.connected) return

    this.socket = io(url, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1500,
    })

    this.socket.on('connect', () => console.info('[Socket] Connecté ✅'))
    this.socket.on('disconnect', (reason) => console.info('[Socket] Déconnecté:', reason))
    this.socket.on('connect_error', (err) => console.warn('[Socket] Erreur:', err.message))
  }

  disconnect() {
    this.socket?.disconnect()
    this.socket = null
  }

  on(event: string, handler: (...args: any[]) => void) {
    this.socket?.on(event, handler)
  }

  off(event: string, handler?: (...args: any[]) => void) {
    if (handler) this.socket?.off(event, handler)
    else this.socket?.removeAllListeners(event)
  }

  emit(event: string, data?: any) {
    if (!this.isConnected) return
    this.socket!.emit(event, data)
  }

  joinRoom(roomId: string, playerName: string, isSpectator = false) {
    this.emit('join_room', { roomId, playerName, isSpectator })
  }
  sendReady(roomId: string, playerId: string, ready: boolean) {
    this.emit('player_ready', { roomId, playerId, ready })
  }
  sendStartGame(roomId: string, settings: any, questions: any[]) {
    this.emit('start_game', { roomId, settings, questions })
  }
  sendAnswer(roomId: string, playerId: string, answer: 'yes' | 'no') {
    this.emit('player_answer', { roomId, playerId, answer })
  }
  sendNextQuestion(roomId: string) {
    this.emit('next_question', { roomId })
  }
  sendGuess(roomId: string, playerId: string, guessAnswer: string) {
    this.emit('player_guess', { roomId, playerId, guessAnswer })
  }
  sendRevealGuesses(roomId: string) {
    this.emit('reveal_guesses', { roomId })
  }
  sendExitGuess(roomId: string) {
    this.emit('exit_guess', { roomId })
  }
}

export const socketService = new SocketService()