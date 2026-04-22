'use client'

import { useMemo, useState } from 'react'

interface Props {
  events: any[]
}

export function DatabaseMonitor({ events }: Props) {
  const [filter, setFilter] = useState<'all' | 'slow' | 'main'>('all')

  const dbEvents = events.filter(e => e.type === 'database').reverse()

  const stats = useMemo(() => ({
    total:    dbEvents.length,
    slow:     dbEvents.filter(e => e.isSlow).length,
    mainThread: dbEvents.filter(e => e.isMainThread).length,
    avgMs:    dbEvents.length
      ? Math.round(dbEvents.reduce((s, e) => s + e.durationMs, 0) / dbEvents.length)
      : 0
  }), [dbEvents])

  const filtered = useMemo(() => {
    if (filter === 'slow') return dbEvents.filter(e => e.isSlow)
    if (filter === 'main') return dbEvents.filter(e => e.isMainThread)
    return dbEvents.slice(0, 20)
  }, [dbEvents, filter])

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">🗄️ Database Monitor</h2>
          <p className="text-xs text-gray-500 mt-0.5">Room / SQLite query performance</p>
        </div>
        {stats.mainThread > 0 && (
          <span className="text-xs bg-red-900 text-red-300 px-2 py-1 rounded font-bold animate-pulse">
            🚨 {stats.mainThread} main thread queries!
          </span>
        )}
      </div>

      {/* Stats */}
      {dbEvents.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-dark-bg rounded p-2 text-center">
            <div className="text-lg font-bold text-white">{stats.total}</div>
            <div className="text-xs text-gray-500">Queries</div>
          </div>
          <div className={`rounded p-2 text-center ${stats.slow > 0 ? 'bg-yellow-950' : 'bg-dark-bg'}`}>
            <div className={`text-lg font-bold ${stats.slow > 0 ? 'text-yellow-400' : 'text-gray-600'}`}>
              {stats.slow}
            </div>
            <div className="text-xs text-gray-500">Slow (&gt;100ms)</div>
          </div>
          <div className={`rounded p-2 text-center ${stats.mainThread > 0 ? 'bg-red-950' : 'bg-dark-bg'}`}>
            <div className={`text-lg font-bold ${stats.mainThread > 0 ? 'text-red-400' : 'text-gray-600'}`}>
              {stats.mainThread}
            </div>
            <div className="text-xs text-gray-500">Main Thread</div>
          </div>
          <div className="bg-dark-bg rounded p-2 text-center">
            <div className="text-lg font-bold text-blue-400">{stats.avgMs}ms</div>
            <div className="text-xs text-gray-500">Avg</div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      {dbEvents.length > 0 && (
        <div className="flex gap-1 mb-3">
          {(['all', 'slow', 'main'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1 rounded border transition-colors ${
                filter === f
                  ? 'bg-blue-900 border-blue-700 text-blue-300'
                  : 'bg-dark-bg border-dark-border text-gray-500 hover:text-gray-300'
              }`}
            >
              {f === 'all'  && `All (${stats.total})`}
              {f === 'slow' && `🐢 Slow (${stats.slow})`}
              {f === 'main' && `🚨 Main Thread (${stats.mainThread})`}
            </button>
          ))}
        </div>
      )}

      {/* Query list */}
      {filtered.length === 0 ? (
        <div className="py-6 text-center">
          <div className="text-2xl mb-2">🗄️</div>
          <div className="text-gray-500 text-sm">
            {dbEvents.length === 0
              ? 'No DB queries yet. Use DroidPulse.trackDb() or DatabaseMonitor.track()'
              : 'No queries match this filter'}
          </div>
          {dbEvents.length === 0 && (
            <div className="mt-3 text-xs text-gray-600 bg-dark-bg rounded p-3 text-left font-mono">
              {`// Wrap your DAO calls:\nval users = DroidPulse.trackDb("getUsers") {\n    userDao.getAllUsers()\n}`}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((e, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 p-2.5 rounded-lg border ${
                e.isMainThread ? 'bg-red-950 border-red-800' :
                e.isSlow       ? 'bg-yellow-950 border-yellow-800' :
                'bg-dark-bg border-dark-border'
              }`}
            >
              {/* Warning icon */}
              <span className="text-sm flex-shrink-0">
                {e.isMainThread ? '🚨' : e.isSlow ? '🐢' : '✅'}
              </span>

              {/* Query name */}
              <span className="text-xs font-mono text-gray-200 flex-1 truncate">
                {e.query}
              </span>

              {/* DB name */}
              {e.dbName !== 'default' && (
                <span className="text-xs text-gray-600 flex-shrink-0">{e.dbName}</span>
              )}

              {/* Row count */}
              {e.rowCount > 0 && (
                <span className="text-xs text-gray-500 flex-shrink-0">{e.rowCount} rows</span>
              )}

              {/* Main thread badge */}
              {e.isMainThread && (
                <span className="text-xs bg-red-900 text-red-300 px-1.5 py-0.5 rounded flex-shrink-0">
                  MAIN
                </span>
              )}

              {/* Duration */}
              <span className={`text-xs font-mono font-bold flex-shrink-0 ${
                e.isMainThread ? 'text-red-400' :
                e.isSlow       ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {e.durationMs}ms
              </span>
            </div>
          ))}
        </div>
      )}

      {/* How to use */}
      {dbEvents.length === 0 && (
        <div className="mt-4 pt-3 border-t border-dark-border text-xs text-gray-500">
          <div className="font-medium mb-1">How to track queries:</div>
          <div className="font-mono bg-dark-bg rounded p-2 text-gray-400">
            {`val result = DroidPulse.trackDb("queryName") {\n    yourDao.yourQuery()\n}`}
          </div>
        </div>
      )}
    </div>
  )
}
