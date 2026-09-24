'use client'
import { useEffect, useRef, useCallback } from 'react'

/**
 * Auto-refresh hook — calls a fetch function on a configurable interval.
 * Stops when the component unmounts or when enabled=false.
 *
 * Usage:
 *   useAutoRefresh(loadData, { intervalMs: 30000, enabled: true })
 */
export function useAutoRefresh(
  fn: () => void,
  options: {
    intervalMs: number   // refresh interval in ms
    enabled:    boolean  // pause when false
    runOnMount?: boolean // run immediately on mount (default true)
  }
) {
  const { intervalMs, enabled, runOnMount = true } = options
  const fnRef    = useRef(fn)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Always call the latest version of fn
  useEffect(() => { fnRef.current = fn })

  const start = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => fnRef.current(), intervalMs)
  }, [intervalMs])

  const stop = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  useEffect(() => {
    if (!enabled) { stop(); return }
    if (runOnMount) fnRef.current()
    start()
    return stop
  }, [enabled, intervalMs, start, stop, runOnMount])
}

/**
 * Refresh interval options shown in the UI selector.
 */
export const REFRESH_OPTIONS = [
  { label: 'OFF',   value: 0 },
  { label: '10s',   value: 10_000 },
  { label: '30s',   value: 30_000 },
  { label: '1 min', value: 60_000 },
  { label: '5 min', value: 300_000 },
] as const

export type RefreshInterval = typeof REFRESH_OPTIONS[number]['value']
