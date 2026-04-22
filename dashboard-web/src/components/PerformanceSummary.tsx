interface Props {
  events: any[]
}

export function PerformanceSummary({ events }: Props) {
  // Get latest events of each type
  const latestMemory = events.filter(e => e.type === 'memory').slice(-1)[0]
  const latestFps = events.filter(e => e.type === 'fps').slice(-1)[0]
  const apiEvents = events.filter(e => e.type === 'network')
  const screenEvents = events.filter(e => e.type === 'lifecycle')

  // Calculate metrics
  const memoryUsage = latestMemory?.usagePercentage?.toFixed(1) || 0
  const currentFps = latestFps?.fps?.toFixed(1) || 0
  const totalApiCalls = apiEvents.length
  const failedApiCalls = apiEvents.filter(e => !e.success).length
  const totalScreens = screenEvents.length
  const avgScreenTime = screenEvents
    .filter(e => e.duration)
    .reduce((sum, e) => sum + e.duration, 0) / screenEvents.filter(e => e.duration).length || 0

  // Determine health status
  const getHealthStatus = () => {
    const memoryHealth = parseFloat(memoryUsage as string) < 75
    const fpsHealth = parseFloat(currentFps as string) >= 45
    const apiHealth = failedApiCalls === 0 || (failedApiCalls / totalApiCalls) < 0.1

    if (memoryHealth && fpsHealth && apiHealth) return { status: 'Excellent', color: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-500/50' }
    if (memoryHealth && fpsHealth) return { status: 'Good', color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-500/50' }
    if (memoryHealth || fpsHealth) return { status: 'Fair', color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-500/50' }
    return { status: 'Poor', color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-500/50' }
  }

  const health = getHealthStatus()

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Performance Summary</h2>
      
      <div className={`mb-6 p-4 ${health.bg} border ${health.border} rounded-lg`}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Overall Health</span>
          <span className={`text-2xl font-bold ${health.color}`}>{health.status}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-dark-bg rounded-lg">
          <div className="text-xs text-gray-500 mb-1">Memory Usage</div>
          <div className="text-2xl font-bold text-blue-400">{memoryUsage}%</div>
        </div>

        <div className="p-4 bg-dark-bg rounded-lg">
          <div className="text-xs text-gray-500 mb-1">Current FPS</div>
          <div className="text-2xl font-bold text-green-400">{currentFps}</div>
        </div>

        <div className="p-4 bg-dark-bg rounded-lg">
          <div className="text-xs text-gray-500 mb-1">API Calls</div>
          <div className="text-2xl font-bold text-purple-400">{totalApiCalls}</div>
          {failedApiCalls > 0 && (
            <div className="text-xs text-red-400 mt-1">{failedApiCalls} failed</div>
          )}
        </div>

        <div className="p-4 bg-dark-bg rounded-lg">
          <div className="text-xs text-gray-500 mb-1">Screens Viewed</div>
          <div className="text-2xl font-bold text-cyan-400">{totalScreens}</div>
          {avgScreenTime > 0 && (
            <div className="text-xs text-gray-500 mt-1">Avg: {avgScreenTime.toFixed(0)}ms</div>
          )}
        </div>
      </div>

      {latestMemory?.isLowMemory && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-500/50 rounded text-red-400 text-sm">
          ⚠️ Low memory warning
        </div>
      )}

      {parseFloat(currentFps as string) < 30 && latestFps && (
        <div className="mt-4 p-3 bg-orange-900/20 border border-orange-500/50 rounded text-orange-400 text-sm">
          ⚠️ Low FPS detected
        </div>
      )}
    </div>
  )
}
