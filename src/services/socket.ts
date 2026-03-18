    /**
 * socket.ts — WebSocket service (scaffold)
 *
 * Pour activer le vrai multijoueur en ligne :
 * 1. Lance un serveur Node.js/ws (voir server/index.ts)
 * 2. Mets l'URL dans VITE_WS_URL dans ton .env
 * 3. Appelle `socketService.connect()` au démarrage
 *
 * En attendant, toutes les méthodes sont des no-ops sûres.
 */

type MessageHandler = (data: any) => void

class SocketService {
  private ws: WebSocket | null = null
  private handlers: Map<string, MessageHandler[]> = new Map()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private roomId: string | null = null
  private playerName: string | null = null

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN
  }

  connect(wsUrl: string = import.meta.env.VITE_WS_URL || '') {
    if (!wsUrl) {
      console.info('[Socket] Pas d\'URL WebSocket configurée — mode local uniquement')
      return
    }
    if (this.ws) this.ws.close()

    try {
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.info('[Socket] Connecté ✅')
        this.emit('ping', {})
      }

      this.ws.onmessage = (event) => {
        try {
          const { type, payload } = JSON.parse(event.data)
          const list = this.handlers.get(type) || []
          list.forEach((fn) => fn(payload))
        } catch (e) {
          console.warn('[Socket] Message invalide', e)
        }
      }

      this.ws.onclose = () => {
        console.info('[Socket] Déconnecté — reconnexion dans 3s')
        this.scheduleReconnect(wsUrl)
      }

      this.ws.onerror = (err) => {
        console.warn('[Socket] Erreur', err)
      }
    } catch (e) {
      console.warn('[Socket] Impossible de se connecter', e)
    }
  }

  private scheduleReconnect(wsUrl: string) {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = setTimeout(() => {
      if (this.roomId && this.playerName) {
        this.connect(wsUrl)
        // Re-join after reconnect
        this.ws!.onopen = () => {
          this.joinRoom(this.roomId!, this.playerName!)
        }
      }
    }, 3000)
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
    this.ws = null
  }

  on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) this.handlers.set(type, [])
    this.handlers.get(type)!.push(handler)
  }

  off(type: string, handler: MessageHandler) {
    const list = this.handlers.get(type) || []
    this.handlers.set(type, list.filter((h) => h !== handler))
  }

  emit(type: string, payload: any) {
    if (!this.isConnected) return
    this.ws!.send(JSON.stringify({ type, payload }))
  }

  // ─── Game actions ────────────────────────────────────────────────────────

  joinRoom(roomId: string, playerName: string, isSpectator = false) {
    this.roomId = roomId
    this.playerName = playerName
    this.emit('join_room', { roomId, playerName, isSpectator })
  }

  sendAnswer(roomId: string, playerId: string, answer: 'yes' | 'no') {
    this.emit('player_answer', { roomId, playerId, answer })
  }

  sendReady(roomId: string, playerId: string, ready: boolean) {
    this.emit('player_ready', { roomId, playerId, ready })
  }

  sendNextQuestion(roomId: string) {
    this.emit('next_question', { roomId })
  }

  sendGuess(roomId: string, playerId: string, guessAnswer: string) {
    this.emit('player_guess', { roomId, playerId, guessAnswer })
  }

  sendStartGame(roomId: string, settings: any, questions: any[]) {
    this.emit('start_game', { roomId, settings, questions })
  }
}

export const socketService = new SocketService()

/**
 * Types des messages WebSocket attendus du serveur :
 *
 * server → client:
 *   'room_state'    { players, phase, questionIndex, ... }
 *   'player_joined' { player }
 *   'player_left'   { playerId }
 *   'game_started'  { questions, settings }
 *   'answer_update' { playerId, answer }
 *   'reveal'        { yesCount, noCount, majority }
 *   'next_question' { questionIndex }
 *   'game_over'     { players }
 *
 * client → server:
 *   'join_room'     { roomId, playerName, isSpectator }
 *   'player_ready'  { roomId, playerId, ready }
 *   'start_game'    { roomId, settings, questions }
 *   'player_answer' { roomId, playerId, answer }
 *   'next_question' { roomId }
 *   'player_guess'  { roomId, playerId, guessAnswer }
 *   'ping'          {}
 */