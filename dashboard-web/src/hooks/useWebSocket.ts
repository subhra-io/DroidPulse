import { useEffect, useState, useRef, useCallback } from 'react'

export interface Event {
  timestamp: number
  type: string
  [key: string]: any
}

export function useWebSocket(url: string) {
  const [events, setEvents] = useState<Event[]>([])
  const [connected, setConnected] = useState(false)
  const wsRef           = useRef<WebSocket | null>(null)
  const connectedRef    = useRef(false)
  const reconnectTimer  = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState < 2) {
      wsRef.current.close()
    }

    console.log(`[DroidPulse] Connecting to ${url}...`)

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[DroidPulse] ✅ Connected to SDK')
        connectedRef.current = true
        setConnected(true)
        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current)
          reconnectTimer.current = null
        }
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('[DroidPulse] Event received:', data.type, data)
          setEvents(prev => [...prev.slice(-100), data])
        } catch (e) {
          console.error('[DroidPulse] Failed to parse event:', e, event.data)
        }
      }

      ws.onerror = (error) => {
        console.error('[DroidPulse] WebSocket error:', error)
        connectedRef.current = false
        setConnected(false)
      }

      ws.onclose = () => {
        console.log('[DroidPulse] Disconnected. Retrying in 3s...')
        connectedRef.current = false
        setConnected(false)
        // Don't null wsRef here — sendCommand checks readyState directly
        reconnectTimer.current = setTimeout(connect, 3000)
      }
    } catch (e) {
      console.error('[DroidPulse] Failed to create WebSocket:', e)
      reconnectTimer.current = setTimeout(connect, 3000)
    }
  }, [url])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [connect])

  const sendCommand = useCallback((cmd: object) => {
    const ws = wsRef.current
    if (!ws) {
      console.warn('[DroidPulse] Cannot send command — no WS instance yet')
      return
    }
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(cmd))
      console.log('[DroidPulse] ✅ Command sent:', (cmd as any).cmd)
      return
    }
    if (ws.readyState === 0) {
      // Still connecting — queue on open
      console.log('[DroidPulse] WS connecting, queuing:', (cmd as any).cmd)
      const onOpen = () => {
        ws.send(JSON.stringify(cmd))
        ws.removeEventListener('open', onOpen)
      }
      ws.addEventListener('open', onOpen)
      return
    }
    // CLOSING or CLOSED — wait for reconnect then send
    console.warn(`[DroidPulse] WS state ${ws.readyState}, waiting for reconnect...`)
    const retry = setInterval(() => {
      const ws2 = wsRef.current
      if (ws2 && ws2.readyState === 1) {
        ws2.send(JSON.stringify(cmd))
        console.log('[DroidPulse] ✅ Command sent (after reconnect):', (cmd as any).cmd)
        clearInterval(retry)
      }
    }, 500)
    // Give up after 10s
    setTimeout(() => clearInterval(retry), 10000)
  }, [])

  return { events, connected, sendCommand }
}
