/**
 * server/index.ts — Version TypeScript du serveur Spill It!
 *
 * Usage :
 *   npx ts-node server/index.ts
 *   (ou : tsc && node dist/server/index.js)
 *
 * Identique à index.js avec typage complet + même logique host/timer.
 */

import { WebSocketServer, WebSocket } from 'ws'

const PORT = Number(process.env.PORT) || 8080

// ─── Types ────────────────────────────────────────────────────────────────────

type Player = {
  id: string; name: string; score: number; streak: number
  ready: boolean; answer?: string; guessAnswer?: string
  isSpectator?: boolean; ws: WebSocket
}

type Room = {
  id: string; players: Map<string, Player>
  phase: 'lobby' | 'game' | 'guess' | 'results'
  questions: unknown[]; questionIndex: number
  settings: Record<string, unknown>; guessTarget: string | null
  history: unknown[]; hostId: string
  serverTimer: ReturnType<typeof setTimeout> | null
}

// ─── State ────────────────────────────────────────────────────────────────────

const rooms = new Map<string, Room>()

// ─── Helpers ──────────────────────────────────────────────────────────────────

const send  = (ws: WebSocket, type: string, payload: unknown) =>
  ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ type, payload }))

const broadcast = (room: Room, type: string, payload: unknown, exclude?: WebSocket) =>
  room.players.forEach(p => p.ws !== exclude && send(p.ws, type, payload))

const broadcastState = (room: Room) => broadcast(room, 'room_state', serialize(room))

function serialize(room: Room) {
  return {
    phase: room.phase, questionIndex: room.questionIndex,
    questions: room.questions, settings: room.settings,
    guessTarget: room.guessTarget, history: room.history,
    hostId: room.hostId,
    players: [...room.players.values()].map(({ ws: _ws, ...p }) => p),
  }
}

function makeId() { return Math.random().toString(36).slice(2, 10) }

function getOrCreate(id: string): Room {
  if (!rooms.has(id)) {
    rooms.set(id, {
      id, players: new Map(), phase: 'lobby',
      questions: [], questionIndex: 0, settings: {},
      guessTarget: null, history: [], hostId: '',
      serverTimer: null,
    })
  }
  return rooms.get(id)!
}

function computeMajority(players: Map<string, Player>): 'yes' | 'no' | 'tie' {
  const active = [...players.values()].filter(p => !p.isSpectator)
  const yes = active.filter(p => p.answer === 'yes').length
  const no  = active.filter(p => p.answer === 'no').length
  return yes > no ? 'yes' : no > yes ? 'no' : 'tie'
}

// ─── Server timer ─────────────────────────────────────────────────────────────

function clearTimer(room: Room) {
  if (room.serverTimer) { clearTimeout(room.serverTimer); room.serverTimer = null }
}

function startTimer(roomId: string) {
  const room = rooms.get(roomId)
  if (!room) return
  clearTimer(room)
  const grace = ((room.settings.secondsPerQuestion as number) || 12) + 3
  room.serverTimer = setTimeout(() => {
    const r = rooms.get(roomId)
    if (r?.phase === 'game') advanceQuestion(roomId)
  }, grace * 1000)
}

function advanceQuestion(roomId: string) {
  const room = rooms.get(roomId)
  if (!room) return

  const active = [...room.players.values()].filter(p => !p.isSpectator)
  const majority = computeMajority(room.players)

  const scorers: string[] = [], streakBonuses: string[] = []
  active.forEach(p => {
    const inMaj  = majority === 'tie' || p.answer === majority
    const scored = inMaj && p.answer !== undefined
    const newStreak = scored ? p.streak + 1 : 0
    const bonus  = scored && newStreak >= 2 ? 1 : 0
    if (scored) { p.score += 1 + bonus; scorers.push(p.name) }
    if (bonus)  streakBonuses.push(p.name)
    p.streak = newStreak
  })

  room.history.push({
    question: room.questions[room.questionIndex],
    answers: Object.fromEntries(active.map(p => [p.name, p.answer])),
    majority, scorers, streakBonuses,
  })
  room.players.forEach(p => { p.answer = undefined; p.guessAnswer = undefined })

  room.questionIndex++
  const isEnd = room.questionIndex >= room.questions.length

  if (isEnd) {
    room.phase = 'results'; room.guessTarget = null
  } else {
    const canGuess = !(room.settings.soloMode as boolean) && active.length >= 2
    if (canGuess) {
      room.guessTarget = active[Math.floor(Math.random() * active.length)].id
      room.phase = 'guess'
    } else {
      room.phase = 'game'; room.guessTarget = null
      startTimer(roomId)
    }
  }
  broadcastState(room)
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

function handleJoin(ws: WebSocket, { roomId, playerName, isSpectator = false }: any) {
  const room = getOrCreate(roomId)

  const existing = [...room.players.values()].find(p => p.name === playerName)
  if (existing) {
    existing.ws = ws
    send(ws, 'joined', { playerId: existing.id, roomId, hostId: room.hostId })
    send(ws, 'room_state', serialize(room))
    broadcast(room, 'player_reconnected', { playerId: existing.id }, ws)
    return
  }

  const player: Player = {
    id: makeId(), name: playerName, score: 0, streak: 0,
    ready: false, isSpectator: isSpectator || false, ws,
  }
  room.players.set(player.id, player)
  if (!room.hostId && !isSpectator) room.hostId = player.id

  send(ws, 'joined', { playerId: player.id, roomId, hostId: room.hostId })
  send(ws, 'room_state', serialize(room))
  broadcast(room, 'player_joined', { player: { ...player, ws: undefined } }, ws)
}

function handleReady(ws: WebSocket, { roomId, playerId, ready }: any) {
  const room = rooms.get(roomId)
  if (!room || !room.players.has(playerId)) return
  const p = room.players.get(playerId)!
  p.ready = ready
  broadcastState(room)
}

function handleStart(ws: WebSocket, { roomId, settings, questions, playerId }: any) {
  const room = rooms.get(roomId)
  if (!room || room.hostId !== playerId) return   // host guard

  room.phase = 'game'; room.questions = questions; room.questionIndex = 0
  room.settings = settings; room.history = []; room.guessTarget = null
  room.players.forEach(p => {
    p.score = 0; p.streak = 0; p.answer = undefined; p.guessAnswer = undefined; p.ready = false
  })
  clearTimer(room)
  startTimer(roomId)
  broadcastState(room)
}

function handleAnswer(ws: WebSocket, { roomId, playerId, answer }: any) {
  const room = rooms.get(roomId)
  if (!room || !room.players.has(playerId)) return
  const p = room.players.get(playerId)!
  if (!p.isSpectator) p.answer = answer
  broadcast(room, 'answer_update', { playerId, answer })

  const active = [...room.players.values()].filter(p => !p.isSpectator)
  if (active.every(p => p.answer)) {
    clearTimer(room)
    broadcast(room, 'all_answered', {
      majority: computeMajority(room.players),
      yesCount: active.filter(p => p.answer === 'yes').length,
      noCount:  active.filter(p => p.answer === 'no').length,
    })
  }
}

function handleNext(_ws: WebSocket, { roomId, playerId }: any) {
  const room = rooms.get(roomId)
  if (!room || room.hostId !== playerId) return   // host guard
  clearTimer(room)
  advanceQuestion(roomId)
}

function handleGuess(_ws: WebSocket, { roomId, playerId, guessAnswer }: any) {
  const room = rooms.get(roomId)
  if (!room || !room.players.has(playerId)) return
  const p = room.players.get(playerId)!
  p.guessAnswer = guessAnswer
  broadcastState(room)
}

function handleReveal(_ws: WebSocket, { roomId, playerId }: any) {
  const room = rooms.get(roomId)
  if (!room || room.hostId !== playerId || !room.guessTarget) return  // host guard

  const target    = room.players.get(room.guessTarget)
  const lastRec   = room.history[room.history.length - 1] as any
  const targetAns = lastRec?.answers[target?.name ?? '']

  room.players.forEach(p => {
    if (p.id === room.guessTarget || p.isSpectator || !p.guessAnswer) return
    if (p.guessAnswer === targetAns) p.score += 1
  })
  broadcast(room, 'guesses_revealed', serialize(room))
}

function handleExitGuess(_ws: WebSocket, { roomId, playerId }: any) {
  const room = rooms.get(roomId)
  if (!room || room.hostId !== playerId) return  // host guard
  const isEnd  = room.questionIndex >= room.questions.length
  room.phase   = isEnd ? 'results' : 'game'
  room.guessTarget = null
  if (!isEnd) startTimer(roomId)
  broadcastState(room)
}

function handleDisconnect(ws: WebSocket) {
  rooms.forEach((room, roomId) => {
    room.players.forEach((player, playerId) => {
      if (player.ws !== ws) return
      room.players.delete(playerId)
      broadcast(room, 'player_left', { playerId })

      // Transfer host
      if (room.hostId === playerId) {
        const next = [...room.players.values()].find(p => !p.isSpectator)
        room.hostId = next?.id ?? ''
        if (room.hostId) broadcast(room, 'host_changed', { hostId: room.hostId })
      }

      if (room.players.size === 0) { clearTimer(room); rooms.delete(roomId) }
    })
  })
}

// ─── Server ───────────────────────────────────────────────────────────────────

const wss = new WebSocketServer({ port: PORT })
console.log(`🌶️  Spill It! WS server on port ${PORT}`)

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    try {
      const { type, payload } = JSON.parse(data.toString())
      switch (type) {
        case 'join_room':     handleJoin(ws, payload);   break
        case 'player_ready':  handleReady(ws, payload);  break
        case 'start_game':    handleStart(ws, payload);  break
        case 'player_answer': handleAnswer(ws, payload); break
        case 'next_question': handleNext(ws, payload);   break
        case 'player_guess':  handleGuess(ws, payload);  break
        case 'reveal_guesses':handleReveal(ws, payload); break
        case 'exit_guess':    handleExitGuess(ws, payload); break
        case 'ping':          send(ws, 'pong', {});      break
      }
    } catch (e) { console.warn('[Server] bad message', e) }
  })

  ws.on('close', () => handleDisconnect(ws))
  ws.on('error', (e) => console.warn('[Server] WS error', e))
})