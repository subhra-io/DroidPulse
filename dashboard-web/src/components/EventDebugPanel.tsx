'use client'

import { useState } from 'react'

interface EventDebugPanelProps {
  events: any[]
}

export function EventDebugPanel({ events }: EventDebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const recentEvents = events.slice(-10).reverse()
  const networkEvents = events.filter(e => 
    e.type === 'network' || 
    e.type === 'api' || 
    e.endpoint || 
    e.url || 
    e.method
  )

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#161616] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="text-[10px] font-mono text-gray-400 tracking-widest">
            EVENT DEBUG PANEL
          </div>
          <div className="text-[9px] font-mono text-gray-600">
            {events.length} total events • {networkEvents.length} network events
          </div>
        </div>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#555" strokeWidth="1.5"
          className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        >
          <polyline points="2,4 6,8 10,4" />
        </svg>
      </button>

      {isExpanded && (
        <div className="border-t border-[#1a1a1a] p-4 space-y-4">
          {/* Event Summary */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded p-3 text-center">
              <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1">TOTAL EVENTS</div>
              <div className="text-lg font-mono font-bold text-white">{events.length}</div>
            </div>
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded p-3 text-center">
              <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1">NETWORK</div>
              <div className="text-lg font-mono font-bold text-blue-400">{networkEvents.length}</div>
            </div>
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded p-3 text-center">
              <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1">LIFECYCLE</div>
              <div className="text-lg font-mono font-bold text-green-400">
                {events.filter(e => e.type === 'lifecycle').length}
              </div>
            </div>
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded p-3 text-center">
              <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1">OTHER</div>
              <div className="text-lg font-mono font-bold text-gray-400">
                {events.filter(e => !['network', 'lifecycle', 'api'].includes(e.type)).length}
              </div>
            </div>
          </div>

          {/* Event Types Breakdown */}
          <div>
            <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-2">EVENT TYPES</div>
            <div className="space-y-1">
              {Object.entries(
                events.reduce((acc, event) => {
                  const type = event.type || 'unknown'
                  acc[type] = (acc[type] || 0) + 1
                  return acc
                }, {} as Record<string, number>)
              ).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-gray-400">{type}</span>
                  <span className="text-white font-bold">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Events */}
          <div>
            <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-2">RECENT EVENTS (Last 10)</div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {recentEvents.map((event, i) => (
                <div key={i} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
                      event.type === 'network' ? 'bg-blue-900 text-blue-400' :
                      event.type === 'lifecycle' ? 'bg-green-900 text-green-400' :
                      event.type === 'api' ? 'bg-purple-900 text-purple-400' :
                      'bg-gray-800 text-gray-400'
                    }`}>
                      {event.type || 'unknown'}
                    </span>
                    <span className="text-[8px] font-mono text-gray-600">
                      {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : 'No timestamp'}
                    </span>
                  </div>
                  <div className="text-[9px] font-mono text-gray-300 space-y-0.5">
                    {event.url && <div>URL: {event.url}</div>}
                    {event.endpoint && <div>Endpoint: {event.endpoint}</div>}
                    {event.method && <div>Method: {event.method}</div>}
                    {event.duration && <div>Duration: {event.duration}ms</div>}
                    {event.responseCode && <div>Status: {event.responseCode}</div>}
                    {event.activity && <div>Activity: {event.activity}</div>}
                    {event.screen && <div>Screen: {event.screen}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded p-3">
            <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-2">TROUBLESHOOTING</div>
            <div className="text-[10px] font-mono text-gray-400 space-y-1">
              <div>• Make sure your Android app is running with the SDK integrated</div>
              <div>• Check that the WebSocket connection is active (LIVE_SYNC indicator)</div>
              <div>• Verify that OptimizerInterceptor is added to your OkHttp client</div>
              <div>• Network events should appear when you make API calls in your app</div>
              <div>• If no events appear, check the Android app logs for SDK errors</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}