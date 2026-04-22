interface Props {
  events: any[]
}

// Color based on timing performance
function timingColor(ms: number): string {
  if (ms < 100) return 'text-green-400'
  if (ms < 300) return 'text-yellow-400'
  return 'text-red-400'
}

function timingLabel(ms: number): string {
  if (ms < 100) return 'Fast'
  if (ms < 300) return 'OK'
  return 'Slow'
}

export function ScreenTimings({ events }: Props) {
  // Build per-screen summary: latest timing per screen
  const screenMap = new Map<string, any>()
  events.forEach(e => {
    if (e.screenName) {
      const existing = screenMap.get(e.screenName)
      if (!existing || e.timestamp > existing.timestamp) {
        screenMap.set(e.screenName, e)
      }
    }
  })

  // Navigation history (RESUMED events in order)
  const navHistory = events
    .filter(e => e.eventType === 'RESUMED')
    .slice(-8)
    .reverse()

  // All screens with their best timing
  const screens = Array.from(screenMap.values())
    .filter(e => e.duration)
    .sort((a, b) => b.duration - a.duration) // slowest first

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Screen Timings</h2>

      {/* Navigation History */}
      {navHistory.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Navigation History</p>
          <div className="flex flex-wrap gap-1">
            {navHistory.map((e, i) => (
              <div key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-gray-600 text-xs">→</span>}
                <span className="text-xs bg-dark-bg border border-dark-border rounded px-2 py-1 text-blue-400">
                  {e.screenName}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-Screen Timing Table */}
      <div className="space-y-2">
        {screens.length === 0 ? (
          <p className="text-gray-500 text-sm">No screen events yet</p>
        ) : (
          screens.map((screen, i) => (
            <div key={i} className="flex items-center justify-between p-2 bg-dark-bg rounded">
              <div className="flex items-center gap-2">
                <span className="text-xs bg-blue-900 text-blue-300 rounded px-1.5 py-0.5">
                  {screen.screenType || 'ACTIVITY'}
                </span>
                <span className="font-medium text-sm">{screen.screenName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${timingColor(screen.duration)}`}>
                  {timingLabel(screen.duration)}
                </span>
                <span className={`font-mono text-sm font-bold ${timingColor(screen.duration)}`}>
                  {screen.duration}ms
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      {screens.length > 0 && (
        <div className="mt-3 pt-3 border-t border-dark-border flex justify-between text-xs text-gray-500">
          <span>{screens.length} screens tracked</span>
          <span>
            Avg: {Math.round(screens.reduce((s, e) => s + e.duration, 0) / screens.length)}ms
          </span>
        </div>
      )}
    </div>
  )
}
