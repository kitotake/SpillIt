import { useEffect, useRef } from 'react'
import { useSocket } from './useSocket'
import { useGameStore } from '../store/useGameStore'

/**
 * useRoom — synchronise le store Zustand avec les événements Socket.IO.
 *
 * À utiliser dans les pages Lobby, Game, Guess, Results.
 * Quand le serveur émet 'room_state', on met à jour le store local.
 *
 * Usage :
 *   const { joinRoom, sendAnswer, sendReady } = useRoom()
 */
export function useRoom() {
  const { emit, on, off } = useSocket()
  const myPlayerId = useRef<string | null>(null)

  const setPlayers = (players: any[]) =>
    useGameStore.setState({ players })

  const applyRoomState = (state: any) => {
    useGameStore.setState({
      phase: state.phase,
      players: state.players,
      questions: state.questions,
      questionIndex: state.questionIndex,
      settings: state.settings ?? useGameStore.getState().settings,
      history: state.history,
      guessTarget: state.guessTarget
        ? state.players.find((p: any) => p.id === state.guessTarget) ?? null
        : null,
    })
  }

  useEffect(() => {
    // Server sends full state on join or any mutation
    const offState = on('room_state', applyRoomState)
    const offRevealed = on('guesses_revealed', applyRoomState)

    // Lightweight answer update (avoids full broadcast)
    const offAnswer = on('answer_update', ({ playerId, answer }: any) => {
      useGameStore.setState(s => ({
        players: s.players.map(p => p.id === playerId ? { ...p, answer } : p),
      }))
    })

    // Someone joined
    const offJoined = on('player_joined', ({ player }: any) => {
      useGameStore.setState(s => ({
        players: [...s.players.filter(p => p.id !== player.id), player],
      }))
    })

    // Someone left
    const offLeft = on('player_left', ({ playerId }: any) => {
      useGameStore.setState(s => ({
        players: s.players.filter(p => p.id !== playerId),
      }))
    })

    // Server tells us our own player ID after joining
    const offMe = on('joined', ({ playerId }: any) => {
      myPlayerId.current = playerId
    })

    return () => {
      offState()
      offRevealed()
      offAnswer()
      offJoined()
      offLeft()
      offMe()
    }
  }, [on])

  // ─── Actions ──────────────────────────────────────────────────────────────

  const joinRoom = (roomId: string, playerName: string, isSpectator = false) => {
    emit('join_room', { roomId, playerName, isSpectator })
  }

  const sendReady = (roomId: string, playerId: string, ready: boolean) => {
    emit('player_ready', { roomId, playerId, ready })
  }

  const sendStartGame = (roomId: string, settings: any, questions: any[]) => {
    emit('start_game', { roomId, settings, questions })
  }

  const sendAnswer = (roomId: string, playerId: string, answer: 'yes' | 'no') => {
    emit('player_answer', { roomId, playerId, answer })
  }

  const sendNextQuestion = (roomId: string) => {
    emit('next_question', { roomId })
  }

  const sendGuess = (roomId: string, playerId: string, guessAnswer: string) => {
    emit('player_guess', { roomId, playerId, guessAnswer })
  }

  const sendRevealGuesses = (roomId: string) => {
    emit('reveal_guesses', { roomId })
  }

  const sendExitGuess = (roomId: string) => {
    emit('exit_guess', { roomId })
  }

  return {
    myPlayerId: myPlayerId.current,
    joinRoom,
    sendReady,
    sendStartGame,
    sendAnswer,
    sendNextQuestion,
    sendGuess,
    sendRevealGuesses,
    sendExitGuess,
  }
}
