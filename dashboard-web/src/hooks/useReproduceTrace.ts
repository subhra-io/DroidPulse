import { useState, useCallback } from 'react'

const CLOUD_API = process.env.NEXT_PUBLIC_CLOUD_API || 'http://localhost:3001'
const CLOUD_KEY = process.env.NEXT_PUBLIC_CLOUD_KEY || 'dp_live_demo_key_12345'

export type ReplayPhase =
  | 'idle'
  | 'fetching'      // loading session events from cloud
  | 'replaying'     // stepping through events
  | 'paused'
  | 'done'

export interface ReplayState {
  phase:        ReplayPhase
  crash:        any | null          // the crash event being reproduced
  sessionId:    string | null
  allEvents:    any[]               // full session events
  visibleEvents: any[]              // events revealed so far
  stepIndex:    number              // how far through allEvents we are
  totalSteps:   number
  error:        string | null
  analysis:     CrashAnalysis | null
}

export interface CrashAnalysis {
  rootCause:     string
  affectedFlow:  string[]           // screen names leading to crash
  suspectApis:   string[]           // slow/failed APIs before crash
  suspectQueries: string[]          // slow DB queries before crash
  memoryPressure: boolean
  mainThreadBlock: boolean
  recommendation: string[]
}

function analyseCrash(crash: any, events: any[]): CrashAnalysis {
  // All events before the crash timestamp
  const before = events.filter(e => e.timestamp <= crash.timestamp)

  const screens = before
    .filter(e => e.type === 'lifecycle' && e.eventType === 'RESUMED')
    .map(e => e.screenName)
    .filter(Boolean)

  const suspectApis = before
    .filter(e => e.type === 'network' && (!e.success || (e.responseCode ?? 200) >= 400 || e.duration > 1000))
    .map(e => { try { return new URL(e.url).pathname } catch { return e.url } })
    .filter(Boolean)

  const suspectQueries = before
    .filter(e => e.type === 'database' && (e.isMainThread || e.durationMs > 100))
    .map(e => e.query ?? '—')

  const memEvents = before.filter(e => e.type === 'memory')
  const memoryPressure = memEvents.some(e => e.isLowMemory || (e.usagePercentage ?? 0) > 85)

  const mainThreadBlock = before.some(
    e => e.type === 'database' && e.isMainThread
  )

  // Root cause heuristic
  let rootCause = 'Unknown exception'
  const msg = crash.message ?? ''
  if (msg.includes('NullPointerException'))  rootCause = 'Null object dereference — object not initialised before use'
  else if (msg.includes('OutOfMemoryError')) rootCause = 'Memory exhaustion — heap limit exceeded'
  else if (msg.includes('ANR'))              rootCause = 'Application Not Responding — main thread blocked'
  else if (msg.includes('NetworkOnMainThread')) rootCause = 'Network call on main thread'
  else if (msg.includes('IndexOutOfBounds')) rootCause = 'Array/list index out of bounds'
  else if (msg.includes('ClassCast'))        rootCause = 'Invalid type cast'
  else if (msg.includes('StackOverflow'))    rootCause = 'Infinite recursion / stack overflow'
  else if (msg.length > 0)                   rootCause = msg.split('\n')[0].slice(0, 120)

  const recommendations: string[] = []
  if (msg.includes('NullPointerException'))  recommendations.push('Add null checks or use Kotlin safe-call operator (?.) before accessing the object')
  if (memoryPressure)                        recommendations.push('Reduce memory allocations — consider bitmap recycling and avoiding large in-memory caches')
  if (mainThreadBlock)                       recommendations.push('Move database queries off the main thread using coroutines (Dispatchers.IO)')
  if (suspectApis.length > 0)               recommendations.push(`Investigate failing API calls: ${suspectApis.slice(0,2).join(', ')}`)
  if (recommendations.length === 0)          recommendations.push('Review the stack trace and add defensive null checks around the crash site')

  return {
    rootCause,
    affectedFlow:   [...new Set(screens)].slice(-5),
    suspectApis:    [...new Set(suspectApis)].slice(0, 4),
    suspectQueries: [...new Set(suspectQueries)].slice(0, 3),
    memoryPressure,
    mainThreadBlock,
    recommendation: recommendations,
  }
}

// ── Demo session events to replay when no real data ───────────────────────────

function buildDemoEvents(crash: any): any[] {
  const base = Date.now() - 12000
  return [
    { type: 'lifecycle', eventType: 'RESUMED', screenName: 'SplashActivity',   timestamp: base,        duration: 142 },
    { type: 'startup',   totalMs: 338,          timestamp: base + 338 },
    { type: 'lifecycle', eventType: 'RESUMED', screenName: 'MainActivity',     timestamp: base + 400,  duration: 280 },
    { type: 'network',   method: 'GET', url: 'https://api.droidpulse.io/v1/config',  responseCode: 200, duration: 189, success: true,  timestamp: base + 700  },
    { type: 'network',   method: 'POST', url: 'https://api.droidpulse.io/v1/user/config', responseCode: 408, duration: 1200, success: false, timestamp: base + 1900 },
    { type: 'memory',    usedMemoryMb: 980,  maxMemoryMb: 4096, usagePercentage: 24, timestamp: base + 2200 },
    { type: 'lifecycle', eventType: 'RESUMED', screenName: 'DashboardActivity', timestamp: base + 2500, duration: 450 },
    { type: 'database',  query: "UPDATE settings SET value = ? WHERE key = 'sync_status'", isMainThread: true, durationMs: 142, timestamp: base + 3100 },
    { type: 'fps',       fps: 58, jankCount: 0,  timestamp: base + 3500 },
    { type: 'fps',       fps: 42, jankCount: 3,  timestamp: base + 4200 },
    { type: 'memory',    usedMemoryMb: 1402, maxMemoryMb: 4096, usagePercentage: 34, isLowMemory: false, timestamp: base + 5000 },
    { type: 'network',   method: 'GET', url: 'https://api.droidpulse.io/v1/metrics', responseCode: 200, duration: 88, success: true, timestamp: base + 5500 },
    { type: 'lifecycle', eventType: 'RESUMED', screenName: 'ProfilerActivity',  timestamp: base + 6000, duration: 320 },
    { type: 'memory',    usedMemoryMb: 3600, maxMemoryMb: 4096, usagePercentage: 88, isLowMemory: true,  timestamp: base + 8000 },
    { ...crash, type: 'crash', timestamp: base + 9000 },
  ]
}

// ── Hook ──────────────────────────────────────────────────────────────────────

const STEP_INTERVAL_MS = 420  // ms between each replayed event

export function useReproduceTrace(sendCommand?: (cmd: object) => void) {
  const [state, setState] = useState<ReplayState>({
    phase: 'idle', crash: null, sessionId: null,
    allEvents: [], visibleEvents: [], stepIndex: 0, totalSteps: 0,
    error: null, analysis: null,
  })

  const timerRef = { current: null as ReturnType<typeof setInterval> | null }

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  // Start replay — fetch session events then step through them
  const reproduce = useCallback(async (crash: any, sessionId?: string) => {
    setState(s => ({ ...s, phase: 'fetching', crash, sessionId: sessionId ?? null, error: null, analysis: null, visibleEvents: [], stepIndex: 0 }))

    let allEvents: any[] = []

    if (sessionId) {
      try {
        const res = await fetch(`${CLOUD_API}/api/sessions/${sessionId}/events`, {
          headers: { Authorization: `Bearer ${CLOUD_KEY}` }
        })
        if (res.ok) {
          const data = await res.json()
          allEvents = (data.events ?? []).sort((a: any, b: any) => a.timestamp - b.timestamp)
        }
      } catch (e) {
        console.warn('[ReproduceTrace] fetch failed, using demo events')
      }
    }

    // Fall back to demo events if nothing from cloud
    if (allEvents.length === 0) allEvents = buildDemoEvents(crash)

    const analysis = analyseCrash(crash, allEvents)

    // ── Send reproduce_trace command to connected device ──────────────────
    if (sendCommand) {
      sendCommand({
        cmd:         'reproduce_trace',
        events:      allEvents,
        stepDelayMs: STEP_INTERVAL_MS,
      })
    }

    setState(s => ({
      ...s,
      phase: 'replaying',
      allEvents,
      visibleEvents: [],
      stepIndex: 0,
      totalSteps: allEvents.length,
      analysis,
    }))

    // Step through events one by one
    let idx = 0
    const timer = setInterval(() => {
      idx++
      setState(s => {
        const visible = s.allEvents.slice(0, idx)
        const done    = idx >= s.allEvents.length
        if (done) clearInterval(timer)
        return {
          ...s,
          visibleEvents: visible,
          stepIndex:     idx,
          phase:         done ? 'done' : 'replaying',
        }
      })
      if (idx >= allEvents.length) clearInterval(timer)
    }, STEP_INTERVAL_MS)

    timerRef.current = timer
  }, [])

  const pause = useCallback(() => {
    stopTimer()
    setState(s => ({ ...s, phase: 'paused' }))
  }, [])

  const resume = useCallback(() => {
    setState(s => {
      if (s.phase !== 'paused') return s
      let idx = s.stepIndex
      const timer = setInterval(() => {
        idx++
        setState(inner => {
          const visible = inner.allEvents.slice(0, idx)
          const done    = idx >= inner.allEvents.length
          if (done) clearInterval(timer)
          return { ...inner, visibleEvents: visible, stepIndex: idx, phase: done ? 'done' : 'replaying' }
        })
        if (idx >= s.allEvents.length) clearInterval(timer)
      }, STEP_INTERVAL_MS)
      timerRef.current = timer
      return { ...s, phase: 'replaying' }
    })
  }, [])

  const reset = useCallback(() => {
    stopTimer()
    setState({ phase: 'idle', crash: null, sessionId: null, allEvents: [], visibleEvents: [], stepIndex: 0, totalSteps: 0, error: null, analysis: null })
  }, [])

  return { state, reproduce, pause, resume, reset }
}
