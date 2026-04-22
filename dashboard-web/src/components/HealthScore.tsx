'use client'

import { useMemo } from 'react'

interface Props {
  events: any[]
}

interface Score {
  label: string
  score: number
  icon: string
  detail: string
  color: string
}

function scoreColor(s: number) {
  if (s >= 90) return { text: 'text-green-400',  ring: 'stroke-green-400',  bg: 'bg-green-900/20'  }
  if (s >= 70) return { text: 'text-blue-400',   ring: 'stroke-blue-400',   bg: 'bg-blue-900/20'   }
  if (s >= 50) return { text: 'text-yellow-400', ring: 'stroke-yellow-400', bg: 'bg-yellow-900/20' }
  return              { text: 'text-red-400',    ring: 'stroke-red-400',    bg: 'bg-red-900/20'    }
}

function grade(overall: number) {
  if (overall >= 90) return { g: 'A+', color: 'text-green-400' }
  if (overall >= 80) return { g: 'A',  color: 'text-green-400' }
  if (overall >= 70) return { g: 'B+', color: 'text-blue-400'  }
  if (overall >= 60) return { g: 'B',  color: 'text-blue-400'  }
  if (overall >= 50) return { g: 'C',  color: 'text-yellow-400'}
  return                    { g: 'D',  color: 'text-red-400'   }
}

// Circular progress ring
function Ring({ score, size = 80 }: { score: number; size?: number }) {
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const c = scoreColor(score)

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#2a2a2a" strokeWidth={8} />
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none"
        className={c.ring}
        strokeWidth={8}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  )
}

export function HealthScore({ events }: Props) {
  const scores = useMemo<Score[]>(() => {
    const fpsEvents    = events.filter(e => e.type === 'fps')
    const memEvents    = events.filter(e => e.type === 'memory')
    const apiEvents    = events.filter(e => e.type === 'network')
    const screenEvents = events.filter(e => e.type === 'lifecycle' && e.duration)

    // --- FPS Score ---
    const avgFps = fpsEvents.length
      ? fpsEvents.reduce((s, e) => s + (e.fps || 0), 0) / fpsEvents.length
      : -1
    const totalJanks = fpsEvents.reduce((s, e) => s + (e.jankCount || 0), 0)
    let fpsScore = avgFps < 0 ? 0
      : avgFps >= 58 ? 100
      : avgFps >= 45 ? 75
      : avgFps >= 30 ? 50 : 25
    if (totalJanks > 10) fpsScore = Math.max(fpsScore - 15, 0)

    // --- Memory Score ---
    const latestMem = memEvents[memEvents.length - 1]
    const memPct = latestMem?.usagePercentage ?? -1
    const memScore = memPct < 0 ? 0
      : memPct < 50 ? 100
      : memPct < 70 ? 80
      : memPct < 85 ? 55
      : latestMem?.isLowMemory ? 20 : 35

    // --- Network Score ---
    const failedApis = apiEvents.filter(e => !e.success || e.responseCode >= 400).length
    const slowApis   = apiEvents.filter(e => e.duration > 1000).length
    const avgApiMs   = apiEvents.length
      ? apiEvents.reduce((s, e) => s + (e.duration || 0), 0) / apiEvents.length
      : -1
    let netScore = apiEvents.length === 0 ? 0
      : avgApiMs < 200 ? 100
      : avgApiMs < 500 ? 80
      : avgApiMs < 1000 ? 60 : 40
    if (failedApis > 0) netScore = Math.max(netScore - (failedApis * 10), 0)
    if (slowApis > 0)   netScore = Math.max(netScore - (slowApis * 5), 0)

    // --- Startup Score ---
    const resumeEvents = screenEvents.filter(e => e.eventType === 'RESUMED')
    const avgStartup = resumeEvents.length
      ? resumeEvents.reduce((s, e) => s + (e.duration || 0), 0) / resumeEvents.length
      : -1
    const startupScore = avgStartup < 0 ? 0
      : avgStartup < 100 ? 100
      : avgStartup < 300 ? 80
      : avgStartup < 600 ? 55 : 30

    return [
      {
        label: 'FPS',
        score: fpsScore,
        icon: '🎮',
        detail: avgFps >= 0 ? `${avgFps.toFixed(0)} avg fps, ${totalJanks} janks` : 'No data yet',
        color: scoreColor(fpsScore).text
      },
      {
        label: 'Memory',
        score: memScore,
        icon: '💾',
        detail: memPct >= 0 ? `${memPct.toFixed(0)}% used` : 'No data yet',
        color: scoreColor(memScore).text
      },
      {
        label: 'Network',
        score: netScore,
        icon: '🌐',
        detail: avgApiMs >= 0 ? `${avgApiMs.toFixed(0)}ms avg, ${failedApis} errors` : 'No data yet',
        color: scoreColor(netScore).text
      },
      {
        label: 'Startup',
        score: startupScore,
        icon: '🚀',
        detail: avgStartup >= 0 ? `${avgStartup.toFixed(0)}ms avg open time` : 'No data yet',
        color: scoreColor(startupScore).text
      },
    ]
  }, [events])

  const overall = useMemo(() => {
    const active = scores.filter(s => s.score > 0)
    if (active.length === 0) return 0
    return Math.round(active.reduce((s, c) => s + c.score, 0) / active.length)
  }, [scores])

  const g = grade(overall)

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">🏆 App Health Score</h2>

      {/* Overall grade */}
      <div className="flex items-center gap-6 mb-6 p-4 bg-dark-bg rounded-xl">
        <div className="relative flex items-center justify-center">
          <Ring score={overall} size={90} />
          <div className="absolute text-center">
            <div className={`text-2xl font-black ${g.color}`}>{g.g}</div>
          </div>
        </div>
        <div>
          <div className="text-3xl font-black text-white">{overall}<span className="text-lg text-gray-500">/100</span></div>
          <div className="text-sm text-gray-400 mt-1">Overall Performance</div>
          <div className="text-xs text-gray-600 mt-1">
            {overall === 0 ? 'Use your app to generate data' :
             overall >= 80 ? '🎉 Great job! App is performing well' :
             overall >= 60 ? '⚠️ Some areas need attention' :
             '🔴 Performance issues detected'}
          </div>
        </div>
      </div>

      {/* Individual scores */}
      <div className="grid grid-cols-2 gap-3">
        {scores.map((s) => {
          const c = scoreColor(s.score)
          return (
            <div key={s.label} className={`p-3 rounded-lg border ${c.bg} border-dark-border`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span>{s.icon}</span>
                  <span className="text-sm font-medium text-gray-300">{s.label}</span>
                </div>
                <span className={`text-lg font-black ${c.text}`}>{s.score}</span>
              </div>
              {/* Score bar */}
              <div className="h-1.5 bg-dark-border rounded-full overflow-hidden mb-1">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    s.score >= 90 ? 'bg-green-400' :
                    s.score >= 70 ? 'bg-blue-400' :
                    s.score >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${s.score}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 truncate">{s.detail}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
