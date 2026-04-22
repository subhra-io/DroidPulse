'use client'

import { useState } from 'react'

interface Props {
  events: any[]
}

function crashIcon(type: string) {
  switch (type) {
    case 'UNCAUGHT_EXCEPTION': return '💥'
    case 'ANR':                return '🥶'
    case 'FROZEN_UI':          return '⏳'
    default:                   return '⚠️'
  }
}

function crashColor(type: string) {
  switch (type) {
    case 'UNCAUGHT_EXCEPTION': return { bg: 'bg-red-950',    border: 'border-red-800',    text: 'text-red-300',    badge: 'bg-red-900 text-red-300'    }
    case 'ANR':                return { bg: 'bg-orange-950', border: 'border-orange-800', text: 'text-orange-300', badge: 'bg-orange-900 text-orange-300' }
    case 'FROZEN_UI':          return { bg: 'bg-yellow-950', border: 'border-yellow-800', text: 'text-yellow-300', badge: 'bg-yellow-900 text-yellow-300' }
    default:                   return { bg: 'bg-gray-900',   border: 'border-gray-700',   text: 'text-gray-300',   badge: 'bg-gray-800 text-gray-300'    }
  }
}

export function CrashMonitor({ events }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null)

  const crashes = events.filter(e => e.type === 'crash').reverse()

  const counts = {
    crashes: crashes.filter(e => e.crashType === 'UNCAUGHT_EXCEPTION').length,
    anrs:    crashes.filter(e => e.crashType === 'ANR').length,
    frozen:  crashes.filter(e => e.crashType === 'FROZEN_UI').length,
  }

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">💥 Crash & ANR Monitor</h2>
          <p className="text-xs text-gray-500 mt-0.5">Real-time crash, ANR, and frozen UI detection</p>
        </div>
        {crashes.length > 0 && (
          <span className="text-xs bg-red-900 text-red-300 px-2 py-1 rounded font-bold">
            {crashes.length} issues
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className={`p-3 rounded-lg border text-center ${counts.crashes > 0 ? 'bg-red-950 border-red-800' : 'bg-dark-bg border-dark-border'}`}>
          <div className={`text-2xl font-black ${counts.crashes > 0 ? 'text-red-400' : 'text-gray-600'}`}>
            {counts.crashes}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">💥 Crashes</div>
        </div>
        <div className={`p-3 rounded-lg border text-center ${counts.anrs > 0 ? 'bg-orange-950 border-orange-800' : 'bg-dark-bg border-dark-border'}`}>
          <div className={`text-2xl font-black ${counts.anrs > 0 ? 'text-orange-400' : 'text-gray-600'}`}>
            {counts.anrs}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">🥶 ANRs</div>
        </div>
        <div className={`p-3 rounded-lg border text-center ${counts.frozen > 0 ? 'bg-yellow-950 border-yellow-800' : 'bg-dark-bg border-dark-border'}`}>
          <div className={`text-2xl font-black ${counts.frozen > 0 ? 'text-yellow-400' : 'text-gray-600'}`}>
            {counts.frozen}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">⏳ Frozen UI</div>
        </div>
      </div>

      {/* Crash List */}
      {crashes.length === 0 ? (
        <div className="text-center py-6">
          <div className="text-3xl mb-2">✅</div>
          <div className="text-green-400 font-medium">No crashes detected</div>
          <div className="text-xs text-gray-500 mt-1">SDK is monitoring for crashes, ANRs, and frozen UI</div>
        </div>
      ) : (
        <div className="space-y-2">
          {crashes.map((c, i) => {
            const col = crashColor(c.crashType)
            return (
              <div key={i} className={`rounded-lg border ${col.bg} ${col.border}`}>
                {/* Header row */}
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer"
                  onClick={() => setExpanded(expanded === i ? null : i)}
                >
                  <span className="text-xl">{crashIcon(c.crashType)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded font-bold ${col.badge}`}>
                        {c.crashType.replace('_', ' ')}
                      </span>
                      {c.isFatal && (
                        <span className="text-xs bg-red-900 text-red-300 px-1.5 py-0.5 rounded">FATAL</span>
                      )}
                    </div>
                    <div className={`text-sm font-medium mt-1 truncate ${col.text}`}>
                      {c.message}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-gray-500">
                      {new Date(c.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      Thread: {c.threadName}
                    </div>
                  </div>
                  <span className="text-gray-600 text-xs">{expanded === i ? '▲' : '▼'}</span>
                </div>

                {/* Stack trace */}
                {expanded === i && c.stackTrace && (
                  <div className="px-3 pb-3 border-t border-dark-border">
                    <div className="text-xs text-gray-500 mb-1 mt-2">Stack Trace:</div>
                    <pre className="text-xs font-mono text-gray-400 bg-dark-bg rounded p-3 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">
                      {c.stackTrace}
                    </pre>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
