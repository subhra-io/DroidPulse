'use client'

import { useMemo } from 'react'

interface Props {
  events: any[]
  apiEvents: any[]
}

// Timing badge color
function badge(ms: number) {
  if (ms < 100) return { bg: 'bg-green-900', text: 'text-green-300', label: '⚡ Fast' }
  if (ms < 300) return { bg: 'bg-yellow-900', text: 'text-yellow-300', label: '🟡 OK' }
  return { bg: 'bg-red-900', text: 'text-red-300', label: '🔴 Slow' }
}

// Icon per event type
function eventIcon(eventType: string) {
  switch (eventType) {
    case 'CREATED':  return '🟢'
    case 'RESUMED':  return '▶️'
    case 'PAUSED':   return '⏸️'
    case 'DESTROYED':return '🔴'
    default:         return '⚪'
  }
}

export function FlowTrace({ events, apiEvents }: Props) {

  // Merge screen + api events sorted by time
  const timeline = useMemo(() => {
    const screen = events.map(e => ({ ...e, kind: 'screen' }))
    const api = apiEvents.map(e => ({ ...e, kind: 'api' }))
    return [...screen, ...api]
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-30) // last 30 events
  }, [events, apiEvents])

  // Group by screen — each screen is a "chapter" in the journey
  const journeys = useMemo(() => {
    const groups: { screen: string; events: any[] }[] = []
    let current: { screen: string; events: any[] } | null = null

    timeline.forEach(e => {
      const screenName = e.screenName || e.url?.split('/').pop() || 'Unknown'

      if (e.kind === 'screen' && e.eventType === 'RESUMED') {
        // New screen opened — start new chapter
        current = { screen: e.screenName, events: [e] }
        groups.push(current)
      } else if (current) {
        current.events.push(e)
      } else {
        // Before any screen event
        if (groups.length === 0) {
          current = { screen: 'App Start', events: [e] }
          groups.push(current)
        } else {
          groups[groups.length - 1].events.push(e)
        }
      }
    })

    return groups
  }, [timeline])

  if (timeline.length === 0) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-2">🗺️ Flow Trace</h2>
        <p className="text-gray-500 text-sm">
          Navigate through your app — the full journey will appear here in real-time.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">🗺️ Flow Trace</h2>
          <p className="text-xs text-gray-500 mt-1">
            Full journey — every screen, composable, and API call in order
          </p>
        </div>
        <span className="text-xs text-gray-500 bg-dark-bg px-2 py-1 rounded">
          {timeline.length} events
        </span>
      </div>

      {/* Journey Timeline */}
      <div className="space-y-4">
        {journeys.map((journey, ji) => (
          <div key={ji} className="relative">

            {/* Screen Header — like a chapter title */}
            <div className="flex items-center gap-2 mb-2">
              {ji > 0 && (
                <div className="absolute -top-3 left-4 text-gray-600 text-xs">↓</div>
              )}
              <div className="flex items-center gap-2 bg-blue-950 border border-blue-800 rounded-lg px-3 py-2 w-full">
                <span className="text-lg">📱</span>
                <div className="flex-1">
                  <span className="text-blue-300 font-bold text-sm">{journey.screen}</span>
                  <span className="text-gray-500 text-xs ml-2">Activity</span>
                </div>
                {/* Launch time */}
                {journey.events[0]?.duration && (
                  <div className={`text-xs px-2 py-0.5 rounded ${badge(journey.events[0].duration).bg} ${badge(journey.events[0].duration).text}`}>
                    {badge(journey.events[0].duration).label} · {journey.events[0].duration}ms to open
                  </div>
                )}
              </div>
            </div>

            {/* Events inside this screen */}
            <div className="ml-6 border-l-2 border-dark-border pl-4 space-y-1">
              {journey.events.map((e, ei) => (
                <div key={ei}>

                  {/* Screen lifecycle event */}
                  {e.kind === 'screen' && e.eventType !== 'RESUMED' && (
                    <div className="flex items-center gap-2 py-1">
                      <span className="text-sm">{eventIcon(e.eventType)}</span>
                      <span className="text-xs text-gray-400 font-mono">{e.eventType}</span>
                      {e.duration && (
                        <span className={`text-xs font-mono ${badge(e.duration).text}`}>
                          {e.duration}ms
                        </span>
                      )}
                      <span className="text-xs text-gray-600 ml-auto">
                        {new Date(e.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  )}

                  {/* API call inside this screen */}
                  {e.kind === 'api' && (
                    <div className="flex items-center gap-2 py-1.5 px-2 bg-dark-bg rounded my-1">
                      <span className="text-sm">🌐</span>
                      <div className="flex-1 min-w-0">
                        {/* Method badge */}
                        <span className={`text-xs font-bold mr-1 px-1.5 py-0.5 rounded ${
                          e.method === 'GET' ? 'bg-green-900 text-green-300' :
                          e.method === 'POST' ? 'bg-blue-900 text-blue-300' :
                          e.method === 'PUT' ? 'bg-yellow-900 text-yellow-300' :
                          'bg-red-900 text-red-300'
                        }`}>
                          {e.method}
                        </span>
                        {/* URL — show only path */}
                        <span className="text-xs text-gray-300 font-mono truncate">
                          {(() => {
                            try { return new URL(e.url).pathname } catch { return e.url }
                          })()}
                        </span>
                      </div>
                      {/* Status code */}
                      <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                        e.responseCode >= 200 && e.responseCode < 300
                          ? 'bg-green-900 text-green-300'
                          : 'bg-red-900 text-red-300'
                      }`}>
                        {e.responseCode ?? 'ERR'}
                      </span>
                      {/* Duration */}
                      <span className={`text-xs font-mono font-bold ${badge(e.duration).text}`}>
                        {e.duration}ms
                      </span>
                    </div>
                  )}

                </div>
              ))}
            </div>

          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-dark-border flex flex-wrap gap-3 text-xs text-gray-500">
        <span>📱 Screen opened</span>
        <span>▶️ Resumed</span>
        <span>⏸️ Paused (left screen)</span>
        <span>🌐 API call</span>
        <span className="text-green-400">⚡ &lt;100ms Fast</span>
        <span className="text-yellow-400">🟡 100-300ms OK</span>
        <span className="text-red-400">🔴 &gt;300ms Slow</span>
      </div>
    </div>
  )
}
