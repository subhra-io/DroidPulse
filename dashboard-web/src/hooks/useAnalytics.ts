'use client'
import { useState, useEffect, useCallback } from 'react'

const CLOUD_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const CLOUD_KEY = process.env.NEXT_PUBLIC_API_KEY || 'dp_live_demo_key_12345'

const headers = { Authorization: `Bearer ${CLOUD_KEY}` }

export interface TopEvent {
  event_name: string
  total: number
  avg_perf: number
  avg_startup: number
  crash_sessions: number
}

export interface HourlyBucket {
  hour: number
  count: number
}

export interface FunnelStep {
  step_name: string
  users: number
  avg_perf: number
  dropoff_pct: number
}

export interface PerfCorrelation {
  tier: 'excellent' | 'good' | 'poor' | 'critical'
  event_count: number
  avg_startup: number
}

export function useAnalytics() {
  const [topEvents, setTopEvents]         = useState<TopEvent[]>([])
  const [hourly, setHourly]               = useState<HourlyBucket[]>([])
  const [correlation, setCorrelation]     = useState<PerfCorrelation[]>([])
  const [loading, setLoading]             = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [evtRes, corrRes] = await Promise.all([
        fetch(`${CLOUD_API}/api/analytics/events?limit=15`, { headers }),
        fetch(`${CLOUD_API}/api/analytics/perf-correlation`, { headers }),
      ])
      if (evtRes.ok) {
        const d = await evtRes.json()
        setTopEvents(d.topEvents || [])
        setHourly(d.hourly || [])
      }
      if (corrRes.ok) {
        const d = await corrRes.json()
        setCorrelation(d.correlation || [])
      }
    } catch (_) {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const getFunnel = useCallback(async (name: string): Promise<FunnelStep[]> => {
    try {
      const res = await fetch(`${CLOUD_API}/api/analytics/funnel/${encodeURIComponent(name)}`, { headers })
      if (res.ok) {
        const d = await res.json()
        return d.steps || []
      }
    } catch (_) {}
    return []
  }, [])

  return { topEvents, hourly, correlation, loading, reload: load, getFunnel }
}
