import { useEffect, useRef } from 'react'
import { useSocket } from './useSocket'
import { useGameStore } from '../store/useGameStore'
import type { Player } from '../types/game'

/**
 * useRoom — syncs Zustand store with Socket.IO server events.
 * Uses named store actions instead of direct setState calls.
 */
export function useRoom() {
  const { emit, on } = useSocket()
  const myPlayerId = useRef<string | null>(null)

  const store = useGameStore()

  useEffect(() => {
    // Full room state sync (join, reconnect, any mutation)
    const offState = on('room_state', (state: any) => {
      const me = (state.players as Player[]).find(
        (p: Player) => p.name === store.playerName
      )
      store.setPlayers(state.players)
      useGameStore.setState({
        phase: state.phase,
        questions: state.questions,
        questionIndex: state.questionIndex,
        settings: state.settings ?? store.settings,
        history: state.history,
        guessTarget: state.guessTarget
          ? state.players.find((p: Player) => p.id === state.guessTarget) ?? null
          : null,
        hostId: state.hostId ?? '',
      })
      // Update local player ID if changed (reconnect)
      if (me) myPlayerId.current = me.id
    })

    const offRevealed = on('guesses_revealed', (state: any) => {
      store.setPlayers(state.players)
      useGameStore.setState({ guessReveal: true })
    })

    // Lightweight answer update — avoids full broadcast cost
    const offAnswer = on('answer_update', ({ playerId, answer }: any) => {
      store.updatePlayer(playerId, { answer })
    })

    const offJoined = on('player_joined', ({ player }: any) => {
      useGameStore.setState((s) => ({
        players: [...s.players.filter((p) => p.id !== player.id), player],
      }))
    })

    const offLeft = on('player_left', ({ playerId }: any) => {
      useGameStore.setState((s) => ({
        players: s.players.filter((p) => p.id !== playerId),
      }))
    })

    const offReconnected = on('player_reconnected', ({ playerId }: any) => {
      store.updatePlayer(playerId, {}) // triggers re-render with existing data
    })

    // Server tells us our own player ID + who the host is
    const offMe = on('joined', ({ playerId, hostId }: any) => {
      myPlayerId.current = playerId
      store.setHostId(hostId)
    })

    const offAllAnswered = on('all_answered', ({ majority, yesCount, noCount }: any) => {
      useGameStore.setState({ reveal: true })
      void majority; void yesCount; void noCount // used by GamePage directly
    })

    return () => {
      offState()
      offRevealed()
      offAnswer()
      offJoined()
      offLeft()
      offReconnected()
      offMe()
      offAllAnswered()
    }
  }, [on, store])

  // ─── Actions ────────────────────────────────────────────────────────────────

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

  const sendNextQuestion = (roomId: string, playerId: string) => {
    emit('next_question', { roomId, playerId })
  }

  const sendGuess = (roomId: string, playerId: string, guessAnswer: string) => {
    emit('player_guess', { roomId, playerId, guessAnswer })
  }

  const sendRevealGuesses = (roomId: string, playerId: string) => {
    emit('reveal_guesses', { roomId, playerId })
  }

  const sendExitGuess = (roomId: string, playerId: string) => {
    emit('exit_guess', { roomId, playerId })
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