'use client'

import { useMemo } from 'react'

interface Props {
  events: any[]
}

function getPath(url: string) {
  try { return new URL(url).pathname } catch { return url }
}

function methodStyle(m: string) {
  switch (m?.toUpperCase()) {
    case 'GET':    return 'bg-green-900 text-green-300'
    case 'POST':   return 'bg-blue-900 text-blue-300'
    case 'PUT':    return 'bg-yellow-900 text-yellow-300'
    case 'DELETE': return 'bg-red-900 text-red-300'
    default:       return 'bg-gray-800 text-gray-300'
  }
}

export function SlowestApis({ events }: Props) {
  // Group by endpoint, calculate stats per endpoint
  const endpointStats = useMemo(() => {
    const map = new Map<string, { calls: number[]; errors: number; method: string }>()

    events.forEach(e => {
      const key = `${e.method}:${getPath(e.url)}`
      if (!map.has(key)) map.set(key, { calls: [], errors: 0, method: e.method })
      const s = map.get(key)!
      s.calls.push(e.duration || 0)
      if (!e.success || e.responseCode >= 400) s.errors++
    })

    return Array.from(map.entries())
      .map(([key, s]) => {
        const sorted = [...s.calls].sort((a, b) => a - b)
        const avg  = s.calls.reduce((a, b) => a + b, 0) / s.calls.length
        const p95  = sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1] ?? 0
        const max  = sorted[sorted.length - 1] ?? 0
        const path = key.split(':').slice(1).join(':')
        return {
          path,
          method: s.method,
          calls: s.calls.length,
          avg: Math.round(avg),
          p95: Math.round(p95),
          max: Math.round(max),
          errors: s.errors,
          errorRate: Math.round((s.errors / s.calls.length) * 100)
        }
      })
      .sort((a, b) => b.p95 - a.p95) // sort by P95 — most impactful
      .slice(0, 8)
  }, [events])

  if (endpointStats.length === 0) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-2">🐢 Slowest APIs</h2>
        <p className="text-gray-500 text-sm">Make API calls in your app to see performance data.</p>
      </div>
    )
  }

  const maxP95 = Math.max(...endpointStats.map(e => e.p95), 1)

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">🐢 Slowest APIs</h2>
          <p className="text-xs text-gray-500 mt-0.5">Sorted by P95 — the worst 5% of calls</p>
        </div>
        <div className="text-xs text-gray-500 bg-dark-bg px-2 py-1 rounded">
          {endpointStats.length} endpoints
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 mb-2 px-2">
        <div className="col-span-5">Endpoint</div>
        <div className="col-span-2 text-right">Avg</div>
        <div className="col-span-2 text-right">P95</div>
        <div className="col-span-1 text-right">Max</div>
        <div className="col-span-2 text-right">Errors</div>
      </div>

      <div className="space-y-2">
        {endpointStats.map((e, i) => {
          const barWidth = (e.p95 / maxP95) * 100
          const isSlowP95 = e.p95 > 1000
          const isSlowAvg = e.avg > 500
          const hasErrors = e.errors > 0

          return (
            <div key={i} className="relative rounded-lg overflow-hidden border border-dark-border">
              {/* P95 bar */}
              <div
                className={`absolute left-0 top-0 bottom-0 opacity-10 ${
                  isSlowP95 ? 'bg-red-500' : isSlowAvg ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${barWidth}%` }}
              />

              <div className="relative grid grid-cols-12 gap-2 items-center p-2.5">
                {/* Endpoint */}
                <div className="col-span-5 flex items-center gap-1.5 min-w-0">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${methodStyle(e.method)}`}>
                    {e.method}
                  </span>
                  <span className="text-xs font-mono text-gray-200 truncate">{e.path}</span>
                </div>

                {/* Avg */}
                <div className={`col-span-2 text-right text-xs font-mono ${isSlowAvg ? 'text-yellow-400' : 'text-gray-400'}`}>
                  {e.avg}ms
                </div>

                {/* P95 */}
                <div className={`col-span-2 text-right text-xs font-mono font-bold ${isSlowP95 ? 'text-red-400' : 'text-gray-300'}`}>
                  {e.p95}ms
                </div>

                {/* Max */}
                <div className="col-span-1 text-right text-xs font-mono text-gray-500">
                  {e.max}ms
                </div>

                {/* Errors */}
                <div className={`col-span-2 text-right text-xs ${hasErrors ? 'text-red-400 font-bold' : 'text-gray-600'}`}>
                  {hasErrors ? `${e.errors} (${e.errorRate}%)` : '—'}
                </div>
              </div>

              {/* Calls count */}
              <div className="relative px-2.5 pb-1.5 text-xs text-gray-600">
                {e.calls} calls
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 pt-3 border-t border-dark-border text-xs text-gray-500">
        <span className="font-medium">P95</span> = 95th percentile — 95% of calls are faster than this.
        Fix P95 first for biggest user impact.
      </div>
    </div>
  )
}
