import { useEffect, useState, useCallback } from 'react'

const CLOUD_API  = process.env.NEXT_PUBLIC_CLOUD_API  || 'http://localhost:3002'
const CLOUD_KEY  = process.env.NEXT_PUBLIC_CLOUD_KEY  || 'dp_live_demo_key_12345'
const PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID || 'demo-project'

/**
 * Fetches events from the cloud backend for the latest session.
 * Merges with live WebSocket events so the dashboard shows everything.
 */
export function useCloudEvents(liveEvents: any[]) {
  const [cloudEvents, setCloudEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [latestSession, setLatestSession] = useState<any>(null)

  const fetchLatestSession = useCallback(async () => {
    try {
      const res = await fetch(`${CLOUD_API}/api/sessions?limit=1`, {
        headers: { Authorization: `Bearer ${CLOUD_KEY}` }
      })
      if (!res.ok) return
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

  // Fetch on mount and every 10 seconds
  useEffect(() => {
    const load = async () => {
      const sessionId = await fetchLatestSession()
      if (sessionId) await fetchEvents(sessionId)
    }
    load()
    const interval = setInterval(load, 10_000)
    return () => clearInterval(interval)
  }, [fetchLatestSession, fetchEvents])

  // Merge: cloud events as base + live events on top (deduplicated by _id/timestamp)
  const mergedEvents = useCallback(() => {
    const liveTimestamps = new Set(liveEvents.map(e => e.timestamp))
    // Add cloud events that aren't already in live stream
    const uniqueCloud = cloudEvents.filter(e => !liveTimestamps.has(e.timestamp))
    return [...uniqueCloud, ...liveEvents].sort((a, b) => a.timestamp - b.timestamp)
  }, [cloudEvents, liveEvents])

  return {
    events: mergedEvents(),
    loading,
    latestSession,
    cloudConnected: cloudEvents.length > 0
  }
}
