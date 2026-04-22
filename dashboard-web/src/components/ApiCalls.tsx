'use client'

import { useState, useMemo } from 'react'

interface Props {
  events: any[]
}

// Method badge color
function methodStyle(method: string) {
  switch (method?.toUpperCase()) {
    case 'GET':    return 'bg-green-900 text-green-300 border-green-700'
    case 'POST':   return 'bg-blue-900 text-blue-300 border-blue-700'
    case 'PUT':    return 'bg-yellow-900 text-yellow-300 border-yellow-700'
    case 'PATCH':  return 'bg-orange-900 text-orange-300 border-orange-700'
    case 'DELETE': return 'bg-red-900 text-red-300 border-red-700'
    default:       return 'bg-gray-800 text-gray-300 border-gray-600'
  }
}

// Status code color
function statusStyle(code: number) {
  if (!code) return 'bg-gray-800 text-gray-400'
  if (code < 300) return 'bg-green-900 text-green-300'
  if (code < 400) return 'bg-yellow-900 text-yellow-300'
  return 'bg-red-900 text-red-300'
}

// Duration color
function durationColor(ms: number) {
  if (ms < 200)  return 'text-green-400'
  if (ms < 500)  return 'text-yellow-400'
  if (ms < 1000) return 'text-orange-400'
  return 'text-red-400'
}

// Duration label
function durationLabel(ms: number) {
  if (ms < 200)  return '⚡ Fast'
  if (ms < 500)  return '🟡 OK'
  if (ms < 1000) return '🟠 Slow'
  return '🔴 Very Slow'
}

// Duration bar width
function durationBarWidth(ms: number, max: number) {
  return Math.min((ms / Math.max(max, 1)) * 100, 100)
}

// Extract just the path from URL
function getPath(url: string) {
  try { return new URL(url).pathname } catch { return url }
}

// Format bytes
function formatBytes(bytes: number) {
  if (!bytes || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes}B`
  return `${(bytes / 1024).toFixed(1)}KB`
}

export function ApiCalls({ events }: Props) {
  const [filter, setFilter] = useState<'all' | 'slow' | 'error'>('all')
  const [expanded, setExpanded] = useState<number | null>(null)

  const maxDuration = useMemo(
    () => Math.max(...events.map(e => e.duration || 0), 1),
    [events]
  )

  // Stats
  const stats = useMemo(() => {
    const total = events.length
    const errors = events.filter(e => !e.success || e.responseCode >= 400).length
    const slow = events.filter(e => e.duration > 500).length
    const avgDuration = total > 0
      ? Math.round(events.reduce((s, e) => s + (e.duration || 0), 0) / total)
      : 0
    return { total, errors, slow, avgDuration }
  }, [events])

  // Filtered list
  const filtered = useMemo(() => {
    let list = [...events].reverse() // newest first
    if (filter === 'slow')  list = list.filter(e => e.duration > 500)
    if (filter === 'error') list = list.filter(e => !e.success || e.responseCode >= 400)
    return list.slice(0, 20)
  }, [events, filter])

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">🌐 API Calls</h2>
          <p className="text-xs text-gray-500 mt-0.5">Every network request tracked in real-time</p>
        </div>
        <span className="text-xs bg-dark-bg border border-dark-border px-2 py-1 rounded text-gray-400">
          {stats.total} total
        </span>
      </div>

      {/* Stats Row */}
      {stats.total > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-dark-bg rounded p-2 text-center">
            <div className="text-lg font-bold text-white">{stats.total}</div>
            <div className="text-xs text-gray-500">Calls</div>
          </div>
          <div className="bg-dark-bg rounded p-2 text-center">
            <div className={`text-lg font-bold ${stats.errors > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {stats.errors}
            </div>
            <div className="text-xs text-gray-500">Errors</div>
          </div>
          <div className="bg-dark-bg rounded p-2 text-center">
            <div className={`text-lg font-bold ${stats.slow > 0 ? 'text-orange-400' : 'text-green-400'}`}>
              {stats.slow}
            </div>
            <div className="text-xs text-gray-500">Slow (&gt;500ms)</div>
          </div>
          <div className="bg-dark-bg rounded p-2 text-center">
            <div className={`text-lg font-bold ${durationColor(stats.avgDuration)}`}>
              {stats.avgDuration}ms
            </div>
            <div className="text-xs text-gray-500">Avg</div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      {stats.total > 0 && (
        <div className="flex gap-1 mb-4">
          {(['all', 'slow', 'error'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1 rounded border transition-colors ${
                filter === f
                  ? 'bg-blue-900 border-blue-700 text-blue-300'
                  : 'bg-dark-bg border-dark-border text-gray-500 hover:text-gray-300'
              }`}
            >
              {f === 'all'   && `All (${stats.total})`}
              {f === 'slow'  && `🟠 Slow (${stats.slow})`}
              {f === 'error' && `🔴 Errors (${stats.errors})`}
            </button>
          ))}
        </div>
      )}

      {/* API Call List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">
            {events.length === 0
              ? 'No API calls yet — make a network request in your app'
              : 'No calls match this filter'}
          </p>
        ) : (
          filtered.map((api, i) => (
            <div
              key={i}
              className="border border-dark-border rounded-lg overflow-hidden"
            >
              {/* Main Row */}
              <div
                className="flex items-center gap-2 p-2 cursor-pointer hover:bg-dark-bg transition-colors"
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                {/* Method */}
                <span className={`text-xs font-bold px-2 py-0.5 rounded border w-14 text-center flex-shrink-0 ${methodStyle(api.method)}`}>
                  {api.method}
                </span>

                {/* URL Path */}
                <span className="text-sm font-mono text-gray-200 flex-1 truncate">
                  {getPath(api.url)}
                </span>

                {/* Status Code */}
                <span className={`text-xs font-mono px-1.5 py-0.5 rounded flex-shrink-0 ${statusStyle(api.responseCode)}`}>
                  {api.responseCode ?? 'ERR'}
                </span>

                {/* Duration */}
                <span className={`text-xs font-mono font-bold w-16 text-right flex-shrink-0 ${durationColor(api.duration)}`}>
                  {api.duration}ms
                </span>

                {/* Expand arrow */}
                <span className="text-gray-600 text-xs flex-shrink-0">
                  {expanded === i ? '▲' : '▼'}
                </span>
              </div>

              {/* Duration Bar */}
              <div className="h-0.5 bg-dark-bg">
                <div
                  className={`h-full transition-all ${
                    api.duration < 200 ? 'bg-green-500' :
                    api.duration < 500 ? 'bg-yellow-500' :
                    api.duration < 1000 ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${durationBarWidth(api.duration, maxDuration)}%` }}
                />
              </div>

              {/* Expanded Detail */}
              {expanded === i && (
                <div className="p-3 bg-dark-bg border-t border-dark-border text-xs space-y-2">

                  {/* Full URL */}
                  <div>
                    <span className="text-gray-500">Full URL</span>
                    <p className="text-blue-400 font-mono break-all mt-0.5">{api.url}</p>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-dark-card rounded p-2">
                      <div className="text-gray-500">Duration</div>
                      <div className={`font-bold ${durationColor(api.duration)}`}>
                        {api.duration}ms
                        <span className="ml-1 font-normal">{durationLabel(api.duration)}</span>
                      </div>
                    </div>
                    <div className="bg-dark-card rounded p-2">
                      <div className="text-gray-500">Request Size</div>
                      <div className="text-white font-bold">{formatBytes(api.requestSize)}</div>
                    </div>
                    <div className="bg-dark-card rounded p-2">
                      <div className="text-gray-500">Response Size</div>
                      <div className="text-white font-bold">{formatBytes(api.responseSize)}</div>
                    </div>
                  </div>

                  {/* Time */}
                  <div className="flex justify-between text-gray-500">
                    <span>Called at: {new Date(api.timestamp).toLocaleTimeString()}</span>
                    <span className={api.success ? 'text-green-400' : 'text-red-400'}>
                      {api.success ? '✅ Success' : '❌ Failed'}
                    </span>
                  </div>

                  {/* Error message */}
                  {api.errorMessage && (
                    <div className="bg-red-950 border border-red-800 rounded p-2 text-red-300">
                      ❌ {api.errorMessage}
                    </div>
                  )}

                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Legend */}
      {stats.total > 0 && (
        <div className="mt-3 pt-3 border-t border-dark-border flex flex-wrap gap-3 text-xs text-gray-500">
          <span className="text-green-400">⚡ &lt;200ms Fast</span>
          <span className="text-yellow-400">🟡 200-500ms OK</span>
          <span className="text-orange-400">🟠 500ms-1s Slow</span>
          <span className="text-red-400">🔴 &gt;1s Very Slow</span>
        </div>
      )}
    </div>
  )
}
