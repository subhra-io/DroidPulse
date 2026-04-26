import { useEffect, useState, useCallback, useRef } from 'react'

const CLOUD_API  = process.env.NEXT_PUBLIC_CLOUD_API  || 'http://localhost:3002'
const CLOUD_KEY  = process.env.NEXT_PUBLIC_CLOUD_KEY  || 'dp_live_demo_key_12345'
const PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID || 'demo-project'
const CLOUD_WS   = (process.env.NEXT_PUBLIC_CLOUD_WS  || 'ws://localhost:3002')

/**
 * Fetches events from the cloud backend for the latest session.
 * Merges with live WebSocket events so the dashboard shows everything.
 * Cloud WebSocket gives instant push — HTTP poll is just a fallback/hydration.
 */
export function useCloudEvents(liveEvents: any[]) {
  const [cloudEvents, setCloudEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [latestSession, setLatestSession] = useState<any>(null)
  const [cloudConnected, setCloudConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  const fetchLatestSession = useCallback(async () => {
    try {
      const res = await fetch(`${CLOUD_API}/api/sessions?limit=1`, {
        headers: { Authorization: `Bearer ${CLOUD_KEY}` }
      })
      if (!res.ok) return null
      const data = await res.json()
      if (data.sessions?.length > 0) {
        setLatestSession(data.sessions[0])
        return data.sessions[0].id
      }
    } catch (e) {
      console.warn('[DroidPulse Cloud] Could not fetch sessions:', e)
    }
    return null
  }, [])

  const fetchEvents = useCallback(async (sessionId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`${CLOUD_API}/api/sessions/${sessionId}/events`, {
        headers: { Authorization: `Bearer ${CLOUD_KEY}` }
      })
      if (!res.ok) return
      const data = await res.json()
      setCloudEvents(data.events || [])
    } catch (e) {
      console.warn('[DroidPulse Cloud] Could not fetch events:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Cloud WebSocket: instant push from backend ────────────────────────────
  useEffect(() => {
    const wsUrl = `${CLOUD_WS}?projectId=${PROJECT_ID}`
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    const connect = () => {
      try {
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          setCloudConnected(true)
          console.log('[DroidPulse Cloud] ✅ WS connected')
        }

        ws.onmessage = (msg) => {
          try {
            const payload = JSON.parse(msg.data)
            // Backend broadcasts { event: 'events', sessionId, events: [...] }
            if (payload.event === 'events' && Array.isArray(payload.events)) {
              setCloudEvents(prev => {
                const existingTs = new Set(prev.map((e: any) => e.timestamp))
                const fresh = payload.events.filter((e: any) => !existingTs.has(e.timestamp))
                return fresh.length > 0
                  ? [...prev, ...fresh].sort((a, b) => a.timestamp - b.timestamp)
                  : prev
              })
            }
            if (payload.event === 'session_started') {
              setLatestSession((s: any) => s ?? payload)
            }
          } catch (e) {
            console.warn('[DroidPulse Cloud] WS parse error', e)
          }
        }

        ws.onclose = () => {
          setCloudConnected(false)
          reconnectTimer = setTimeout(connect, 5000)
        }

        ws.onerror = () => {
          ws.close()
        }
      } catch (e) {
        reconnectTimer = setTimeout(connect, 5000)
      }
    }

    connect()
    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer)
      wsRef.current?.close()
    }
  }, [])

  // ── HTTP poll: hydrate on mount + every 30s as safety net ────────────────
  useEffect(() => {
    const load = async () => {
      const sessionId = await fetchLatestSession()
      if (sessionId) await fetchEvents(sessionId)
    }
    load()
    const interval = setInterval(load, 30_000) // reduced from 10s — WS handles live
    return () => clearInterval(interval)
  }, [fetchLatestSession, fetchEvents])

  // Merge: cloud events as base + live SDK events on top (deduplicated by timestamp)
  const mergedEvents = useCallback(() => {
    const liveTimestamps = new Set(liveEvents.map(e => e.timestamp))
    const uniqueCloud = cloudEvents.filter(e => !liveTimestamps.has(e.timestamp))
    return [...uniqueCloud, ...liveEvents].sort((a, b) => a.timestamp - b.timestamp)
  }, [cloudEvents, liveEvents])

  return {
    events: mergedEvents(),
    loading,
    latestSession,
    cloudConnected,
  }
}
