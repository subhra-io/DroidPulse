interface Props {
  events: any[]
}

export function ScreenTimings({ events }: Props) {
  const screenData = events
    .filter(e => e.duration)
    .map(e => ({
      name: e.screenName,
      duration: e.duration,
      type: e.screenType
    }))
    .slice(-10)

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Screen Timings</h2>
      <div className="space-y-3">
        {screenData.length === 0 ? (
          <p className="text-gray-500">No screen events yet</p>
        ) : (
          screenData.map((screen, i) => (
            <div key={i} className="flex justify-between items-center">
              <div>
                <span className="font-medium">{screen.name}</span>
                <span className="text-xs text-gray-500 ml-2">{screen.type}</span>
              </div>
              <span className="text-green-400">{screen.duration}ms</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
