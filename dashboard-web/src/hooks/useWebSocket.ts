import { useEffect, useState, useRef, useCallback } from 'react'

export interface Event {
  timestamp: number
  type: string
  [key: string]: any
}

export function useWebSocket(url: string) {
  const [events, setEvents] = useState<Event[]>([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close()
    }

    console.log(`[DroidPulse] Connecting to ${url}...`)

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[DroidPulse] ✅ Connected to SDK')
        setConnected(true)
        // Clear any pending reconnect
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
        setConnected(false)
      }

      ws.onclose = () => {
        console.log('[DroidPulse] Disconnected. Retrying in 3s...')
        setConnected(false)
        wsRef.current = null
        // Auto-reconnect after 3 seconds
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

  return { events, connected }
}
