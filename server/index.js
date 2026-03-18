const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

// ─── State ────────────────────────────────────────────────────────────────────

/** @type {Map<string, Room>} */
const rooms = new Map();

/**
 * @typedef {{ id: string, name: string, score: number, streak: number,
 *   ready: boolean, answer?: string, guessAnswer?: string, isSpectator?: boolean,
 *   socketId: string }} RoomPlayer
 * @typedef {{ id: string, players: Map<string, RoomPlayer>, phase: string,
 *   questions: any[], questionIndex: number, settings: any,
 *   guessTarget: string|null, history: any[] }} Room
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function getOrCreateRoom(roomId) {
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
    });
  }
  return rooms.get(roomId);
}

/** Serialize room without socketId (client doesn't need it) */
function serializeRoom(room) {
  return {
    phase: room.phase,
    questionIndex: room.questionIndex,
    questions: room.questions,
    settings: room.settings,
    guessTarget: room.guessTarget,
    history: room.history,
    players: [...room.players.values()].map(({ socketId, ...p }) => p),
  };
}

/** Broadcast full room state to everyone in the room */
function broadcastState(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  io.to(roomId).emit('room_state', serializeRoom(room));
}

function computeMajority(players) {
  const active = [...players.values()].filter(p => !p.isSpectator);
  const yes = active.filter(p => p.answer === 'yes').length;
  const no = active.filter(p => p.answer === 'no').length;
  if (yes > no) return 'yes';
  if (no > yes) return 'no';
  return 'tie';
}

// ─── Socket handlers ──────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log('🔌 Connexion:', socket.id);

  // JOIN ROOM
  socket.on('join_room', ({ roomId, playerName, isSpectator = false }) => {
    const room = getOrCreateRoom(roomId);

    // Reconnect if player name already exists
    const existing = [...room.players.values()].find(p => p.name === playerName);
    if (existing) {
      existing.socketId = socket.id;
      socket.join(roomId);
      socket.emit('room_state', serializeRoom(room));
      socket.emit('joined', { playerId: existing.id, roomId });
      socket.to(roomId).emit('player_reconnected', { playerId: existing.id });
      console.log(`[${roomId}] ${playerName} reconnecté`);
      return;
    }

    const player = {
      id: makeId(),
      name: playerName,
      score: 0,
      streak: 0,
      ready: false,
      isSpectator,
      socketId: socket.id,
    };

    room.players.set(player.id, player);
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.playerId = player.id;

    // Tell the new player their ID + current state
    socket.emit('joined', { playerId: player.id, roomId });
    socket.emit('room_state', serializeRoom(room));

    // Tell everyone else
    socket.to(roomId).emit('player_joined', { player: { ...player, socketId: undefined } });

    console.log(`[${roomId}] ${playerName} a rejoint (${room.players.size} joueurs)`);
  });

  // PLAYER READY
  socket.on('player_ready', ({ roomId, playerId, ready }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.get(playerId);
    if (player) player.ready = ready;
    broadcastState(roomId);
  });

  // START GAME
  socket.on('start_game', ({ roomId, settings, questions }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    room.phase = 'game';
    room.questions = questions;
    room.questionIndex = 0;
    room.settings = settings;
    room.history = [];
    room.guessTarget = null;

    room.players.forEach(p => {
      p.score = 0;
      p.streak = 0;
      p.answer = undefined;
      p.guessAnswer = undefined;
      p.ready = false;
    });

    broadcastState(roomId);
    console.log(`[${roomId}] Partie démarrée — ${questions.length} questions`);
  });

  // PLAYER ANSWER
  socket.on('player_answer', ({ roomId, playerId, answer }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.get(playerId);
    if (player) player.answer = answer;

    // Broadcast just the answer update (lighter than full state)
    io.to(roomId).emit('answer_update', { playerId, answer });

    // Auto-reveal if all active non-spectator players have answered
    const active = [...room.players.values()].filter(p => !p.isSpectator);
    const allAnswered = active.every(p => p.answer);
    if (allAnswered) {
      const majority = computeMajority(room.players);
      io.to(roomId).emit('all_answered', {
        majority,
        yesCount: active.filter(p => p.answer === 'yes').length,
        noCount: active.filter(p => p.answer === 'no').length,
      });
    }
  });

  // NEXT QUESTION
  socket.on('next_question', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const active = [...room.players.values()].filter(p => !p.isSpectator);
    const majority = computeMajority(room.players);

    // Score players
    active.forEach(p => {
      const inMajority = majority === 'tie' || p.answer === majority;
      const scored = inMajority && p.answer !== undefined;
      const newStreak = scored ? p.streak + 1 : 0;
      const streakBonus = scored && newStreak >= 2 ? 1 : 0;
      if (scored) p.score += 1 + streakBonus;
      p.streak = newStreak;
    });

    const record = {
      question: room.questions[room.questionIndex],
      answers: Object.fromEntries(active.map(p => [p.name, p.answer])),
      majority,
      scorers: active.filter(p => {
        const inMaj = majority === 'tie' || p.answer === majority;
        return inMaj && p.answer !== undefined;
      }).map(p => p.name),
      streakBonuses: active.filter(p => p.streak >= 2).map(p => p.name),
    };

    room.history.push(record);

    // Reset answers
    room.players.forEach(p => {
      p.answer = undefined;
      p.guessAnswer = undefined;
    });

    room.questionIndex++;
    const isEnd = room.questionIndex >= room.questions.length;

    if (isEnd) {
      room.phase = 'results';
      room.guessTarget = null;
    } else {
      const canGuess = !room.settings?.soloMode && active.length >= 2;
      if (canGuess) {
        const target = active[Math.floor(Math.random() * active.length)];
        room.guessTarget = target.id;
        room.phase = 'guess';
      } else {
        room.phase = 'game';
        room.guessTarget = null;
      }
    }

    broadcastState(roomId);
  });

  // PLAYER GUESS
  socket.on('player_guess', ({ roomId, playerId, guessAnswer }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.get(playerId);
    if (player) player.guessAnswer = guessAnswer;
    broadcastState(roomId);
  });

  // REVEAL GUESSES
  socket.on('reveal_guesses', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || !room.guessTarget) return;

    const target = room.players.get(room.guessTarget);
    const lastRecord = room.history[room.history.length - 1];
    const targetAnswer = lastRecord?.answers[target?.name ?? ''];

    room.players.forEach(p => {
      if (p.id === room.guessTarget || p.isSpectator || !p.guessAnswer) return;
      if (p.guessAnswer === targetAnswer) p.score += 1;
    });

    io.to(roomId).emit('guesses_revealed', serializeRoom(room));
  });

  // EXIT GUESS PHASE
  socket.on('exit_guess', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const isEnd = room.questionIndex >= room.questions.length;
    room.phase = isEnd ? 'results' : 'game';
    room.guessTarget = null;
    broadcastState(roomId);
  });

  // DISCONNECT
  socket.on('disconnect', () => {
    const { roomId, playerId } = socket.data;
    if (!roomId || !playerId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(playerId);
    if (player) {
      console.log(`[${roomId}] ${player.name} déconnecté`);
      room.players.delete(playerId);
      io.to(roomId).emit('player_left', { playerId });

      if (room.players.size === 0) {
        rooms.delete(roomId);
        console.log(`[${roomId}] Room supprimée (vide)`);
      }
    }
  });

  socket.on('ping', () => socket.emit('pong'));
});

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_, res) => res.json({ status: 'ok', rooms: rooms.size }));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🌶️  Spill It! server running on port ${PORT}`);
});