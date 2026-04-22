'use client'

import { useMemo } from 'react'

interface Props {
  screenEvents: any[]
  apiEvents: any[]
}

interface ScreenStat {
  name: string
  visits: number
  avgOpenMs: number
  avgTimeOnScreenMs: number
  apiCallsOnScreen: number
  slowApiCount: number
  heatScore: number // 0-100, higher = more problematic
}

function heatColor(score: number) {
  if (score >= 80) return { bg: 'bg-red-900',    text: 'text-red-300',    bar: 'bg-red-500',    label: '🔴 Hot'    }
  if (score >= 60) return { bg: 'bg-orange-900', text: 'text-orange-300', bar: 'bg-orange-500', label: '🟠 Warm'   }
  if (score >= 40) return { bg: 'bg-yellow-900', text: 'text-yellow-300', bar: 'bg-yellow-500', label: '🟡 Mild'   }
  return                  { bg: 'bg-green-900',  text: 'text-green-300',  bar: 'bg-green-500',  label: '🟢 Cool'   }
}

export function ScreenHeatmap({ screenEvents, apiEvents }: Props) {
  const stats = useMemo<ScreenStat[]>(() => {
    // Group screen events by screen name
    const screenMap = new Map<string, { opens: number[]; times: number[] }>()

    screenEvents.forEach(e => {
      if (!e.screenName) return
      if (!screenMap.has(e.screenName)) {
        screenMap.set(e.screenName, { opens: [], times: [] })
      }
      const s = screenMap.get(e.screenName)!
      if (e.eventType === 'RESUMED' && e.duration) s.opens.push(e.duration)
      if (e.eventType === 'PAUSED'   && e.duration) s.times.push(e.duration)
    })

    // Build stats per screen
    return Array.from(screenMap.entries()).map(([name, data]) => {
      const avgOpenMs = data.opens.length
        ? data.opens.reduce((a, b) => a + b, 0) / data.opens.length
        : 0
      const avgTimeOnScreenMs = data.times.length
        ? data.times.reduce((a, b) => a + b, 0) / data.times.length
        : 0

      // Count API calls that happened while this screen was active
      // (approximate: API calls between RESUMED and PAUSED timestamps)
      const resumeEvents = screenEvents.filter(e => e.screenName === name && e.eventType === 'RESUMED')
      const pauseEvents  = screenEvents.filter(e => e.screenName === name && e.eventType === 'PAUSED')

      let apiCallsOnScreen = 0
      let slowApiCount = 0

      resumeEvents.forEach((resume, i) => {
        const pause = pauseEvents[i]
        const end = pause?.timestamp ?? Date.now()
        const calls = apiEvents.filter(a => a.timestamp >= resume.timestamp && a.timestamp <= end)
        apiCallsOnScreen += calls.length
        slowApiCount += calls.filter(a => a.duration > 500).length
      })

      // Heat score: combination of slow open + slow APIs
      const openScore  = Math.min((avgOpenMs / 600) * 50, 50)
      const apiScore   = Math.min((slowApiCount / Math.max(apiCallsOnScreen, 1)) * 50, 50)
      const heatScore  = Math.round(openScore + apiScore)

      return {
        name,
        visits: data.opens.length || data.times.length,
        avgOpenMs: Math.round(avgOpenMs),
        avgTimeOnScreenMs: Math.round(avgTimeOnScreenMs),
        apiCallsOnScreen,
        slowApiCount,
        heatScore
      }
    }).sort((a, b) => b.heatScore - a.heatScore) // hottest first
  }, [screenEvents, apiEvents])

  if (stats.length === 0) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-2">🔥 Screen Heatmap</h2>
        <p className="text-gray-500 text-sm">Navigate through your app to see which screens are slowest.</p>
      </div>
    )
  }

  const maxHeat = Math.max(...stats.map(s => s.heatScore), 1)

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">🔥 Screen Heatmap</h2>
          <p className="text-xs text-gray-500 mt-0.5">Which screens are causing the most pain</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="text-green-400">🟢 Fast</span>
          <span>→</span>
          <span className="text-red-400">🔴 Slow</span>
        </div>
      </div>

      <div className="space-y-3">
        {stats.map((s, i) => {
          const c = heatColor(s.heatScore)
          const barWidth = (s.heatScore / maxHeat) * 100

          return (
            <div key={s.name} className="relative">
              {/* Heat bar background */}
              <div
                className={`absolute inset-0 rounded-lg opacity-20 ${c.bg}`}
                style={{ width: `${barWidth}%` }}
              />

              <div className="relative flex items-center gap-3 p-3 rounded-lg border border-dark-border">
                {/* Rank */}
                <span className="text-gray-600 text-xs w-4 flex-shrink-0">#{i + 1}</span>

                {/* Screen name */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-white truncate">{s.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${c.bg} ${c.text}`}>
                      {c.label}
                    </span>
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-gray-500">
                    <span>👁️ {s.visits} visits</span>
                    {s.avgOpenMs > 0 && (
                      <span className={s.avgOpenMs > 300 ? 'text-red-400' : 'text-gray-500'}>
                        ⏱️ {s.avgOpenMs}ms to open
                      </span>
                    )}
                    {s.avgTimeOnScreenMs > 0 && (
                      <span>🕐 {(s.avgTimeOnScreenMs / 1000).toFixed(1)}s on screen</span>
                    )}
                    {s.apiCallsOnScreen > 0 && (
                      <span className={s.slowApiCount > 0 ? 'text-orange-400' : 'text-gray-500'}>
                        🌐 {s.apiCallsOnScreen} API calls
                        {s.slowApiCount > 0 && ` (${s.slowApiCount} slow)`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Heat score */}
                <div className="text-right flex-shrink-0">
                  <div className={`text-lg font-black ${c.text}`}>{s.heatScore}</div>
                  <div className="text-xs text-gray-600">heat</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-dark-border text-xs text-gray-500">
        Heat score = slow open time + slow API calls on that screen. Higher = needs more attention.
      </div>
    </div>
  )
}
