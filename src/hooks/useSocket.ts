import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useGameStore } from '../store/useGameStore'

const WS_URL = import.meta.env.VITE_WS_URL || ''

// Singleton socket — persists across re-renders
let sharedSocket: Socket | null = null

function getSocket(): Socket | null {
  if (!WS_URL) return null
  if (!sharedSocket) {
    sharedSocket = io(WS_URL, {
      transports: ['websocket'],
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1500,
      reconnectionAttempts: 10,
    })
  }
  return sharedSocket
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)
  const setStatus = useGameStore((s) => s.setConnectionStatus)
  const setReconnecting = useGameStore((s) => s.setReconnecting)

  useEffect(() => {
    const socket = getSocket()
    if (!socket) {
      // No WS URL — local/solo mode, mark as connected
      setStatus('connected')
      return
    }

    socketRef.current = socket

    const onConnect    = () => { setStatus('connected');    setReconnecting(false) }
    const onDisconnect = () => { setStatus('disconnected') }
    const onError      = () => { setStatus('error') }
    const onReconnecting = () => { setStatus('connecting'); setReconnecting(true) }

    socket.on('connect',             onConnect)
    socket.on('disconnect',          onDisconnect)
    socket.on('connect_error',       onError)
    socket.on('reconnect_attempt',   onReconnecting)
    socket.on('reconnect',           onConnect)

    if (!socket.connected) {
      setStatus('connecting')
      socket.connect()
    } else {
      setStatus('connected')
    }

    return () => {
      socket.off('connect',           onConnect)
      socket.off('disconnect',        onDisconnect)
      socket.off('connect_error',     onError)
      socket.off('reconnect_attempt', onReconnecting)
      socket.off('reconnect',         onConnect)
    }
  }, [setStatus, setReconnecting])

  const emit = useCallback((event: string, data?: unknown) => {
    socketRef.current?.emit(event, data)
  }, [])

  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    socketRef.current?.on(event, handler)
    return () => { socketRef.current?.off(event, handler) }
  }, [])

  const off = useCallback((event: string, handler?: (...args: unknown[]) => void) => {
    if (handler) socketRef.current?.off(event, handler)
    else socketRef.current?.removeAllListeners(event)
  }, [])

  return { emit, on, off }
}