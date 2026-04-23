import { useEffect, useState, useCallback } from 'react'

const CLOUD_API = process.env.NEXT_PUBLIC_CLOUD_API || 'http://localhost:3001'
const CLOUD_KEY = process.env.NEXT_PUBLIC_CLOUD_KEY || 'dp_live_demo_key_12345'

export interface SessionRecord {
  id: string
  app_version: string
  build_type: string
  device_model: string
  os_version: string
  started_at: number
  ended_at: number | null
  event_count: number
  crash_count: number
  startup_ms: number | null
  crashes: number
}

export function useSessionHistory() {
  const [sessions, setSessions]   = useState<SessionRecord[]>([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(false)
  const [page, setPage]           = useState(0)
  const PAGE_SIZE = 20

  const headers = { Authorization: `Bearer ${CLOUD_KEY}` }

  const fetch_ = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await fetch(
        `${CLOUD_API}/api/sessions?limit=${PAGE_SIZE}&offset=${p * PAGE_SIZE}`,
        { headers }
      )
      if (!res.ok) return
      const data = await res.json()
      setSessions(data.sessions ?? [])
      setTotal(data.total ?? 0)
    } catch (e) {
      console.warn('[SessionHistory] fetch failed', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch_(page) }, [page, fetch_])

  const refresh = () => fetch_(page)

  const fetchEvents = async (sessionId: string): Promise<any[]> => {
    try {
      const res = await fetch(`${CLOUD_API}/api/sessions/${sessionId}/events`, { headers })
      if (!res.ok) return []
      const data = await res.json()
      return data.events ?? []
    } catch { return [] }
  }

  const exportSession = async (sessionId: string, format: 'json' | 'csv') => {
    const url = `${CLOUD_API}/api/sessions/${sessionId}/export?format=${format}`
    const res = await fetch(url, { headers })
    if (!res.ok) return
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `session-${sessionId.slice(0, 8)}.${format}`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const deleteSession = async (sessionId: string) => {
    try {
      await fetch(`${CLOUD_API}/api/sessions/${sessionId}`, { method: 'DELETE', headers })
      fetch_(page)
    } catch (e) {
      console.warn('[SessionHistory] delete failed', e)
    }
  }

  return {
    sessions, total, loading,
    page, setPage, PAGE_SIZE,
    refresh, fetchEvents, exportSession, deleteSession,
  }
}
