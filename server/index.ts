/**
 * server/index.ts — Serveur WebSocket pour Spill It! (multijoueur en ligne)
 *
 * Installation :
 *   npm install ws
 *   npx ts-node server/index.ts
 *   (ou compile avec tsc et lance node dist/server/index.js)
 *
 * Variables d'environnement :
 *   PORT=8080 (défaut)
 *
 * Déploiement gratuit : Railway, Render, Fly.io
 *   - Crée un service Web, pointe vers ce fichier
 *   - Ajoute VITE_WS_URL=wss://ton-serveur.railway.app dans ton .env Vite
 */

import { WebSocketServer, WebSocket } from 'ws'

const PORT = Number(process.env.PORT) || 8080

const wss = new WebSocketServer({ port: PORT })
console.log(`🌶️  Spill It! WebSocket server listening on port ${PORT}`)

// ─── State ────────────────────────────────────────────────────────────────────

type Player = {
  id: string
  name: string
  score: number
  streak: number
  ready: boolean
  answer?: string
  guessAnswer?: string
  isSpectator?: boolean
  ws: WebSocket
}

type Room = {
  id: string
  players: Map<string, Player>
  phase: 'lobby' | 'game' | 'guess' | 'results'
  questions: any[]
  questionIndex: number
  settings: any
  guessTarget: string | null
  history: any[]
}

const rooms = new Map<string, Room>()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function send(ws: WebSocket, type: string, payload: any) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload }))
  }
}

function broadcast(room: Room, type: string, payload: any, exclude?: WebSocket) {
  room.players.forEach((p) => {
    if (p.ws !== exclude) send(p.ws, type, payload)
  })
}

function broadcastRoomState(room: Room) {
  const state = serializeRoom(room)
  broadcast(room, 'room_state', state)
}

function serializeRoom(room: Room) {
  return {
    phase: room.phase,
    questionIndex: room.questionIndex,
    questions: room.questions,
    settings: room.settings,
    guessTarget: room.guessTarget,
    history: room.history,
    players: [...room.players.values()].map(({ ws, ...p }) => p),
  }
}

function getOrCreateRoom(id: string): Room {
  if (!rooms.has(id)) {
    rooms.set(id, {
      id,
      players: new Map(),
      phase: 'lobby',
      questions: [],
      questionIndex: 0,
      settings: {},
      guessTarget: null,
      history: [],
    })
  }
  return rooms.get(id)!
}

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

// ─── Message handlers ─────────────────────────────────────────────────────────

function handleJoinRoom(ws: WebSocket, payload: any) {
  const { roomId, playerName, isSpectator } = payload
  const room = getOrCreateRoom(roomId)

  // Prevent duplicates
  const existing = [...room.players.values()].find((p) => p.name === playerName)
  if (existing) {
    // Reconnect — update ws
    existing.ws = ws
    send(ws, 'room_state', serializeRoom(room))
    broadcast(room, 'player_joined', { player: { ...existing, ws: undefined } }, ws)
    return
  }

  const player: Player = {
    id: makeId(),
    name: playerName,
    score: 0,
    streak: 0,
    ready: false,
    isSpectator: isSpectator || false,
    ws,
  }

  room.players.set(player.id, player)

  // Send current state to new player
  send(ws, 'room_state', serializeRoom(room))

  // Notify others
  broadcast(room, 'player_joined', { player: { ...player, ws: undefined } }, ws)

  console.log(`[${roomId}] ${playerName} a rejoint (${room.players.size} joueurs)`)
}

function handlePlayerReady(ws: WebSocket, payload: any) {
  const { roomId, playerId, ready } = payload
  const room = rooms.get(roomId)
  if (!room) return

  const player = room.players.get(playerId)
  if (player) player.ready = ready

  broadcastRoomState(room)
}

function handleStartGame(ws: WebSocket, payload: any) {
  const { roomId, settings, questions } = payload
  const room = rooms.get(roomId)
  if (!room) return

  room.phase = 'game'
  room.questions = questions
  room.questionIndex = 0
  room.settings = settings
  room.history = []
  room.guessTarget = null

  // Reset players
  room.players.forEach((p) => {
    p.score = 0
    p.streak = 0
    p.answer = undefined
    p.guessAnswer = undefined
    p.ready = false
  })

  broadcastRoomState(room)
  console.log(`[${roomId}] Partie démarrée (${questions.length} questions)`)
}

function handlePlayerAnswer(ws: WebSocket, payload: any) {
  const { roomId, playerId, answer } = payload
  const room = rooms.get(roomId)
  if (!room) return

  const player = room.players.get(playerId)
  if (player) player.answer = answer

  broadcast(room, 'answer_update', { playerId, answer })
}

function handleNextQuestion(ws: WebSocket, payload: any) {
  const { roomId } = payload
  const room = rooms.get(roomId)
  if (!room) return

  // Compute majority & scores
  const activePlayers = [...room.players.values()].filter((p) => !p.isSpectator)
  const yes = activePlayers.filter((p) => p.answer === 'yes').length
  const no = activePlayers.filter((p) => p.answer === 'no').length
  const majority = yes > no ? 'yes' : no > yes ? 'no' : 'tie'

  const scorers: string[] = []
  const streakBonuses: string[] = []

  activePlayers.forEach((p) => {
    const inMajority = majority === 'tie' || p.answer === majority
    const scored = inMajority && p.answer !== undefined
    const newStreak = scored ? p.streak + 1 : 0
    const streakBonus = scored && newStreak >= 2 ? 1 : 0
    if (scored) {
      p.score += 1 + streakBonus
      scorers.push(p.name)
      if (streakBonus) streakBonuses.push(p.name)
    }
    p.streak = newStreak
  })

  const record = {
    question: room.questions[room.questionIndex],
    answers: Object.fromEntries(activePlayers.map((p) => [p.name, p.answer])),
    majority,
    scorers,
    streakBonuses,
  }

  room.history.push(record)

  // Reset answers
  room.players.forEach((p) => {
    p.answer = undefined
    p.guessAnswer = undefined
  })

  room.questionIndex++
  const isEnd = room.questionIndex >= room.questions.length

  if (isEnd) {
    room.phase = 'results'
    room.guessTarget = null
  } else {
    // Guess phase in multiplayer ?
    const canGuess = !room.settings?.soloMode && activePlayers.length >= 2
    if (canGuess) {
      const target = activePlayers[Math.floor(Math.random() * activePlayers.length)]
      room.guessTarget = target.id
      room.phase = 'guess'
    } else {
      room.phase = 'game'
      room.guessTarget = null
    }
  }

  broadcastRoomState(room)
}

function handlePlayerGuess(ws: WebSocket, payload: any) {
  const { roomId, playerId, guessAnswer } = payload
  const room = rooms.get(roomId)
  if (!room) return

  const player = room.players.get(playerId)
  if (player) player.guessAnswer = guessAnswer

  broadcastRoomState(room)
}

function handleDisconnect(ws: WebSocket) {
  rooms.forEach((room, roomId) => {
    room.players.forEach((player, playerId) => {
      if (player.ws === ws) {
        room.players.delete(playerId)
        broadcast(room, 'player_left', { playerId })
        console.log(`[${roomId}] ${player.name} a quitté`)
        if (room.players.size === 0) {
          rooms.delete(roomId)
          console.log(`[${roomId}] Room supprimée (vide)`)
        }
      }
    })
  })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

wss.on('connection', (ws) => {
  console.log('Nouvelle connexion WebSocket')

  ws.on('message', (data) => {
    try {
      const { type, payload } = JSON.parse(data.toString())
      switch (type) {
        case 'join_room':     handleJoinRoom(ws, payload); break
        case 'player_ready':  handlePlayerReady(ws, payload); break
        case 'start_game':    handleStartGame(ws, payload); break
        case 'player_answer': handlePlayerAnswer(ws, payload); break
        case 'next_question': handleNextQuestion(ws, payload); break
        case 'player_guess':  handlePlayerGuess(ws, payload); break
        case 'ping':          send(ws, 'pong', {}); break
        default:
          console.warn('[Server] Type inconnu :', type)
      }
    } catch (e) {
      console.warn('[Server] Message invalide', e)
    }
  })

  ws.on('close', () => handleDisconnect(ws))
  ws.on('error', (e) => console.warn('[Server] Erreur WS', e))
})