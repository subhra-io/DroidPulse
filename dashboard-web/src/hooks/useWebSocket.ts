import { useEffect, useState } from 'react'

export interface Event {
  timestamp: number
  type: string
  [key: string]: any
}

export function useWebSocket(url: string) {
  const [events, setEvents] = useState<Event[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const ws = new WebSocket(url)

    ws.onopen = () => {
      console.log('Connected to Optimizer SDK')
      setConnected(true)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setEvents(prev => [...prev.slice(-100), data]) // Keep last 100 events
      } catch (e) {
        console.error('Failed to parse event:', e)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setConnected(false)
    }

    ws.onclose = () => {
      console.log('Disconnected from Optimizer SDK')
      setConnected(false)
    }

    return () => {
      ws.close()
    }
  }, [url])

  return { events, connected }
}
