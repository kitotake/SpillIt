/**
 * server/index.js — Serveur Socket.IO pour Spill It!
 *
 * Corrections :
 *   - Système de host : seul le host peut start/next/reveal
 *   - Validation playerId sur chaque action
 *   - Timer côté serveur : force next_question si le client se freeze
 *   - Reconnexion : restaure le socket d'un joueur existant
 */

const express = require('express')
const http    = require('http')
const { Server } = require('socket.io')
const cors   = require('cors')

const app = express()
app.use(cors())

const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })

// ─── State ────────────────────────────────────────────────────────────────────

/** @type {Map<string, Room>} */
const rooms = new Map()

/**
 * @typedef {{
 *   id: string, players: Map<string, RoomPlayer>,
 *   phase: string, questions: any[], questionIndex: number,
 *   settings: any, guessTarget: string|null, history: any[],
 *   hostId: string, serverTimer: NodeJS.Timeout|null
 * }} Room
 *
 * @typedef {{
 *   id: string, name: string, score: number, streak: number,
 *   ready: boolean, answer?: string, guessAnswer?: string,
 *   isSpectator?: boolean, socketId: string
 * }} RoomPlayer
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

function getOrCreate(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      players: new Map(),
      phase: 'lobby',
      questions: [],
      questionIndex: 0,
      settings: {},
      guessTarget: null,
      history: [],
      hostId: '',
      serverTimer: null,
    })
  }
  return rooms.get(roomId)
}

function serialize(room) {
  return {
    phase:         room.phase,
    questionIndex: room.questionIndex,
    questions:     room.questions,
    settings:      room.settings,
    guessTarget:   room.guessTarget,
    history:       room.history,
    hostId:        room.hostId,
    players: [...room.players.values()].map(({ socketId, ...p }) => p),
  }
}

function broadcast(roomId) {
  const room = rooms.get(roomId)
  if (!room) return
  io.to(roomId).emit('room_state', serialize(room))
}

function isHost(room, playerId) {
  return room.hostId === playerId
}

function validatePlayer(room, playerId) {
  return room.players.has(playerId)
}

function computeMajority(players) {
  const active = [...players.values()].filter(p => !p.isSpectator)
  const yes = active.filter(p => p.answer === 'yes').length
  const no  = active.filter(p => p.answer === 'no').length
  return yes > no ? 'yes' : no > yes ? 'no' : 'tie'
}

// ─── Server-side timer (forces next question after timeout + 3s grace) ────────

function startServerTimer(roomId) {
  const room = rooms.get(roomId)
  if (!room) return
  clearServerTimer(room)
  const grace = (room.settings.secondsPerQuestion || 12) + 3
  room.serverTimer = setTimeout(() => {
    const r = rooms.get(roomId)
    if (!r || r.phase !== 'game') return
    advanceQuestion(roomId)
  }, grace * 1000)
}

function clearServerTimer(room) {
  if (room.serverTimer) { clearTimeout(room.serverTimer); room.serverTimer = null }
}

function advanceQuestion(roomId) {
  const room = rooms.get(roomId)
  if (!room) return

  const active = [...room.players.values()].filter(p => !p.isSpectator)
  const majority = computeMajority(room.players)

  const scorers = [], streakBonuses = []
  active.forEach(p => {
    const inMaj  = majority === 'tie' || p.answer === majority
    const scored = inMaj && p.answer !== undefined
    const newStreak = scored ? p.streak + 1 : 0
    const bonus  = scored && newStreak >= 2 ? 1 : 0
    if (scored) { p.score += 1 + bonus; scorers.push(p.name) }
    if (bonus)  streakBonuses.push(p.name)
    p.streak = newStreak
  })

  const record = {
    question: room.questions[room.questionIndex],
    answers:  Object.fromEntries(active.map(p => [p.name, p.answer])),
    majority, scorers, streakBonuses,
  }
  room.history.push(record)
  room.players.forEach(p => { p.answer = undefined; p.guessAnswer = undefined })

  room.questionIndex++
  const isEnd = room.questionIndex >= room.questions.length

  if (isEnd) {
    room.phase = 'results'
    room.guessTarget = null
  } else {
    const canGuess = !room.settings.soloMode && active.length >= 2
    if (canGuess) {
      const target = active[Math.floor(Math.random() * active.length)]
      room.guessTarget = target.id
      room.phase = 'guess'
    } else {
      room.phase = 'game'
      room.guessTarget = null
      startServerTimer(roomId)
    }
  }

  broadcast(roomId)
}

// ─── Socket handlers ──────────────────────────────────────────────────────────

io.on('connection', (socket) => {

  socket.on('join_room', ({ roomId, playerName, isSpectator = false }) => {
    const room = getOrCreate(roomId)

    // Reconnect existing player
    const existing = [...room.players.values()].find(p => p.name === playerName)
    if (existing) {
      existing.socketId = socket.id
      socket.join(roomId)
      socket.data.roomId   = roomId
      socket.data.playerId = existing.id
      socket.emit('joined', { playerId: existing.id, roomId, hostId: room.hostId })
      socket.emit('room_state', serialize(room))
      socket.to(roomId).emit('player_reconnected', { playerId: existing.id })
      return
    }

    const player = {
      id: makeId(), name: playerName,
      score: 0, streak: 0, ready: false,
      isSpectator, socketId: socket.id,
    }
    room.players.set(player.id, player)

    // First non-spectator player becomes host
    if (!room.hostId && !isSpectator) room.hostId = player.id

    socket.join(roomId)
    socket.data.roomId   = roomId
    socket.data.playerId = player.id

    socket.emit('joined', { playerId: player.id, roomId, hostId: room.hostId })
    socket.emit('room_state', serialize(room))
    socket.to(roomId).emit('player_joined', {
      player: { ...player, socketId: undefined },
    })
  })

  socket.on('player_ready', ({ roomId, playerId, ready }) => {
    const room = rooms.get(roomId)
    if (!room || !validatePlayer(room, playerId)) return
    const p = room.players.get(playerId)
    if (p) p.ready = ready
    broadcast(roomId)
  })

  socket.on('start_game', ({ roomId, settings, questions, playerId }) => {
    const room = rooms.get(roomId)
    if (!room || !isHost(room, playerId)) return   // ← host guard

    room.phase = 'game'
    room.questions = questions
    room.questionIndex = 0
    room.settings = settings
    room.history = []
    room.guessTarget = null
    room.players.forEach(p => {
      p.score = 0; p.streak = 0; p.answer = undefined; p.guessAnswer = undefined; p.ready = false
    })
    clearServerTimer(room)
    startServerTimer(roomId)
    broadcast(roomId)
  })

  socket.on('player_answer', ({ roomId, playerId, answer }) => {
    const room = rooms.get(roomId)
    if (!room || !validatePlayer(room, playerId)) return
    const p = room.players.get(playerId)
    if (p && !p.isSpectator) p.answer = answer
    io.to(roomId).emit('answer_update', { playerId, answer })

    // Auto-reveal if everyone answered
    const active = [...room.players.values()].filter(p => !p.isSpectator)
    if (active.length > 0 && active.every(p => p.answer)) {
      clearServerTimer(room)
      const maj = computeMajority(room.players)
      io.to(roomId).emit('all_answered', {
        majority: maj,
        yesCount: active.filter(p => p.answer === 'yes').length,
        noCount:  active.filter(p => p.answer === 'no').length,
      })
    }
  })

  socket.on('next_question', ({ roomId, playerId }) => {
    const room = rooms.get(roomId)
    if (!room || !isHost(room, playerId)) return   // ← host guard
    clearServerTimer(room)
    advanceQuestion(roomId)
  })

  socket.on('player_guess', ({ roomId, playerId, guessAnswer }) => {
    const room = rooms.get(roomId)
    if (!room || !validatePlayer(room, playerId)) return
    const p = room.players.get(playerId)
    if (p) p.guessAnswer = guessAnswer
    broadcast(roomId)
  })

  socket.on('reveal_guesses', ({ roomId, playerId }) => {
    const room = rooms.get(roomId)
    if (!room || !isHost(room, playerId)) return   // ← host guard
    if (!room.guessTarget) return

    const target     = room.players.get(room.guessTarget)
    const lastRecord = room.history[room.history.length - 1]
    const targetAns  = lastRecord?.answers[target?.name ?? '']

    room.players.forEach(p => {
      if (p.id === room.guessTarget || p.isSpectator || !p.guessAnswer) return
      if (p.guessAnswer === targetAns) p.score += 1
    })

    io.to(roomId).emit('guesses_revealed', serialize(room))
  })

  socket.on('exit_guess', ({ roomId, playerId }) => {
    const room = rooms.get(roomId)
    if (!room || !isHost(room, playerId)) return   // ← host guard
    const isEnd  = room.questionIndex >= room.questions.length
    room.phase   = isEnd ? 'results' : 'game'
    room.guessTarget = null
    if (!isEnd) startServerTimer(roomId)
    broadcast(roomId)
  })

  socket.on('disconnect', () => {
    const { roomId, playerId } = socket.data ?? {}
    if (!roomId || !playerId) return
    const room = rooms.get(roomId)
    if (!room) return

    const player = room.players.get(playerId)
    if (!player) return

    room.players.delete(playerId)
    io.to(roomId).emit('player_left', { playerId })

    // Transfer host if needed
    if (room.hostId === playerId) {
      const next = [...room.players.values()].find(p => !p.isSpectator)
      room.hostId = next?.id ?? ''
      if (room.hostId) io.to(roomId).emit('host_changed', { hostId: room.hostId })
    }

    if (room.players.size === 0) {
      clearServerTimer(room)
      rooms.delete(roomId)
    }
  })

  socket.on('ping', () => socket.emit('pong'))
})

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/health', (_, res) => res.json({ status: 'ok', rooms: rooms.size }))

const PORT = process.env.PORT || 3000
server.listen(PORT, () => console.log(`🌶️  Spill It! server on port ${PORT}`))