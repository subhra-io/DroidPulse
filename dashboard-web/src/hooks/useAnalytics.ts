'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAutoRefresh } from './useAutoRefresh'

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

export interface ImpactInsight {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  pmSummary: string
  likelyCause: string
  businessImpact: string
  developerHandoff: string[]
  evidence: Record<string, any>
}

export interface ImpactBrief {
  summary: {
    events: number
    users: number
    sessions: number
    poorPerfEvents: number
    crashAffectedEvents: number
    avgPerf: number
    avgStartupMs: number
    revenue: number
    revenueAtRisk: number
  }
  insights: ImpactInsight[]
  slowEndpoints: any[]
  funnelDropoffs: any[]
}

export function useAnalytics(autoRefreshMs = 30_000) {
  const [topEvents, setTopEvents]         = useState<TopEvent[]>([])
  const [hourly, setHourly]               = useState<HourlyBucket[]>([])
  const [correlation, setCorrelation]     = useState<PerfCorrelation[]>([])
  const [impact, setImpact]               = useState<ImpactBrief | null>(null)
  const [loading, setLoading]             = useState(false)
  const [lastRefresh, setLastRefresh]     = useState<Date | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [evtRes, corrRes, impactRes] = await Promise.all([
        fetch(`${CLOUD_API}/api/analytics/events?limit=15`, { headers }),
        fetch(`${CLOUD_API}/api/analytics/perf-correlation`, { headers }),
        fetch(`${CLOUD_API}/api/analytics/impact?limit=4`, { headers }),
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
      if (impactRes.ok) {
        const d = await impactRes.json()
        setImpact(d || null)
      }
      setLastRefresh(new Date())
    } catch (_) {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-refresh
  useAutoRefresh(load, { intervalMs: autoRefreshMs, enabled: autoRefreshMs > 0, runOnMount: false })

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

  return { topEvents, hourly, correlation, impact, loading, reload: load, getFunnel, lastRefresh }
}
