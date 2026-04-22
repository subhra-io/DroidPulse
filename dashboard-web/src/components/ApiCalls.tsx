interface Props {
  events: any[]
}

export function ApiCalls({ events }: Props) {
  const apiData = events
    .map(e => ({
      url: e.url,
      method: e.method,
      duration: e.duration,
      code: e.responseCode,
      success: e.success
    }))
    .slice(-10)

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">API Calls</h2>
      <div className="space-y-3">
        {apiData.length === 0 ? (
          <p className="text-gray-500">No API calls yet</p>
        ) : (
          apiData.map((api, i) => (
            <div key={i} className="border-b border-dark-border pb-2">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <span className="text-xs font-mono text-blue-400">{api.method}</span>
                  <p className="text-sm truncate">{api.url}</p>
                </div>
                <div className="text-right">
                  <span className={api.success ? 'text-green-400' : 'text-red-400'}>
                    {api.code}
                  </span>
                  <p className="text-xs text-gray-500">{api.duration}ms</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
