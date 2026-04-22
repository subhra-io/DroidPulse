'use client'

interface Props {
  events: any[]
}

function startupColor(ms: number) {
  if (ms < 500)  return { text: 'text-green-400',  label: '⚡ Excellent', bar: 'bg-green-500'  }
  if (ms < 1000) return { text: 'text-blue-400',   label: '✅ Good',      bar: 'bg-blue-500'   }
  if (ms < 2000) return { text: 'text-yellow-400', label: '🟡 OK',        bar: 'bg-yellow-500' }
  if (ms < 3000) return { text: 'text-orange-400', label: '🟠 Slow',      bar: 'bg-orange-500' }
  return               { text: 'text-red-400',    label: '🔴 Very Slow', bar: 'bg-red-500'    }
}

export function StartupProfiler({ events }: Props) {
  const startupEvents = events.filter(e => e.type === 'startup')
  const latest = startupEvents[startupEvents.length - 1]

  if (!latest) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-2">🚀 Startup Profiler</h2>
        <p className="text-gray-500 text-sm">
          Restart your app to see cold start timing.
        </p>
      </div>
    )
  }

  const col = startupColor(latest.totalMs)
  const maxMs = Math.max(latest.totalMs, 1000)

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">🚀 Startup Profiler</h2>
          <p className="text-xs text-gray-500 mt-0.5">Cold start time breakdown</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded bg-dark-bg border border-dark-border ${col.text}`}>
          {latest.startupType} START
        </span>
      </div>

      {/* Total time — big number */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-dark-bg rounded-xl">
        <div>
          <div className={`text-4xl font-black ${col.text}`}>
            {latest.totalMs}
            <span className="text-lg text-gray-500 font-normal">ms</span>
          </div>
          <div className="text-sm text-gray-400 mt-1">Total startup time</div>
          <div className={`text-xs mt-1 ${col.text}`}>{col.label}</div>
        </div>
        <div className="flex-1">
          {/* Visual bar */}
          <div className="h-3 bg-dark-border rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${col.bar}`}
              style={{ width: `${Math.min((latest.totalMs / 3000) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>0ms</span>
            <span>1s</span>
            <span>2s</span>
            <span>3s+</span>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-dark-bg rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">App onCreate()</div>
          <div className={`text-xl font-bold ${startupColor(latest.appCreateMs).text}`}>
            {latest.appCreateMs}ms
          </div>
          {latest.appCreateMs > 100 && (
            <div className="text-xs text-yellow-400 mt-1">⚠️ Consider deferring heavy init</div>
          )}
        </div>
        <div className="bg-dark-bg rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">First screen visible</div>
          <div className={`text-xl font-bold ${startupColor(latest.firstActivityMs).text}`}>
            {latest.firstActivityMs}ms
          </div>
        </div>
      </div>

      {/* Main thread blocked warning */}
      {latest.isMainThreadBlocked && (
        <div className="mb-4 p-3 bg-red-950 border border-red-800 rounded-lg">
          <div className="text-red-300 font-medium text-sm">🚨 Main Thread Blocked During Startup</div>
          <div className="text-red-400 text-xs mt-1">
            Heavy work detected on main thread. Common causes:
            SharedPreferences, Room DB init, network calls, or large file reads in onCreate().
          </div>
        </div>
      )}

      {/* Milestone timeline */}
      {latest.milestones?.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Timeline</div>
          <div className="space-y-1">
            {latest.milestones.map((m: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                {/* Time marker */}
                <div className="text-xs font-mono text-gray-500 w-16 text-right flex-shrink-0">
                  +{m.elapsedMs}ms
                </div>
                {/* Dot */}
                <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                {/* Bar */}
                <div className="flex-1 h-1 bg-dark-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${(m.elapsedMs / maxMs) * 100}%` }}
                  />
                </div>
                {/* Label */}
                <div className="text-xs text-gray-400 flex-shrink-0 max-w-48 truncate">
                  {m.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Benchmark */}
      <div className="mt-4 pt-3 border-t border-dark-border text-xs text-gray-500">
        Industry benchmarks: ⚡ &lt;500ms Excellent · ✅ &lt;1s Good · 🟡 &lt;2s OK · 🔴 &gt;2s Fix needed
      </div>
    </div>
  )
}
