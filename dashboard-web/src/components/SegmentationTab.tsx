'use client'
import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const CLOUD_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const SEG_COLORS = ['#3b82f6','#22d3ee','#f59e0b','#10b981','#f43f5e','#a78bfa','#34d399','#fb923c']

interface SegRow { segment: string; value: number; unique_users?: number }

export default function SegmentationTab({ projectId }: { projectId: string }) {
  const [mode,        setMode]        = useState<'events'|'users'|'perf'>('events')
  const [event,       setEvent]       = useState('purchase_completed')
  const [breakdownBy, setBreakdownBy] = useState('plan')
  const [metric,      setMetric]      = useState('count')
  const [perfMetric,  setPerfMetric]  = useState('avg_fps')
  const [results,     setResults]     = useState<SegRow[]>([])
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [ran,         setRan]         = useState(false)

  const run = async () => {
    setLoading(true); setError(''); setRan(true)
    try {
      const endpoint = mode === 'perf' ? '/api/segment/perf'
        : mode === 'users' ? '/api/segment/users'
        : '/api/segment/events'
      const body: Record<string, string> = { breakdownBy, projectId }
      if (mode === 'events') { body.event = event; body.metric = metric }
      if (mode === 'perf')   { body.metric = perfMetric }

      const res = await fetch(`${CLOUD_API}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('dp_token')}`,
        },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setResults([]) }
      else setResults(data.segments || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const metricLabel = {
    count: 'COUNT', revenue: 'REVENUE ($)', avg_perf: 'AVG PERF', avg_startup: 'AVG STARTUP (ms)',
    avg_fps: 'AVG FPS', avg_startup_ms: 'AVG STARTUP (ms)', avg_memory_mb: 'AVG MEMORY (MB)', avg_api_ms: 'AVG API (ms)',
  }[mode === 'perf' ? perfMetric : metric] || 'VALUE'

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-mono font-bold text-white tracking-widest">SEGMENTATION</div>
          <div className="text-[10px] font-mono text-gray-500 mt-0.5">
            Slice any metric by user or event properties
          </div>
        </div>
      </div>

      {/* Query builder */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1e1e1e] text-[10px] font-mono text-gray-400 tracking-widest">
          QUERY BUILDER
        </div>
        <div className="p-4 space-y-4">

          {/* Mode selector */}
          <div className="flex items-center gap-1">
            {(['events','users','perf'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 text-[10px] font-mono font-bold tracking-widest rounded transition-colors ${
                  mode === m
                    ? 'bg-[#1a2a3a] text-blue-400 border border-blue-900'
                    : 'text-gray-600 hover:text-gray-400 border border-transparent'
                }`}
              >
                {m === 'events' ? 'EVENTS' : m === 'users' ? 'USERS' : 'PERFORMANCE'}
              </button>
            ))}
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-4 gap-3">
            {mode === 'events' && (
              <>
                <div>
                  <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1.5">EVENT NAME</div>
                  <input
                    value={event}
                    onChange={e => setEvent(e.target.value)}
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-[10px] font-mono text-gray-300 placeholder-gray-700 outline-none focus:border-blue-800"
                    placeholder="purchase_completed"
                  />
                </div>
                <div>
                  <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1.5">METRIC</div>
                  <select
                    value={metric}
                    onChange={e => setMetric(e.target.value)}
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-[10px] font-mono text-gray-300 outline-none"
                  >
                    <option value="count">COUNT</option>
                    <option value="revenue">REVENUE</option>
                    <option value="avg_perf">AVG PERF SCORE</option>
                    <option value="avg_startup">AVG STARTUP</option>
                  </select>
                </div>
              </>
            )}
            {mode === 'perf' && (
              <div>
                <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1.5">PERF METRIC</div>
                <select
                  value={perfMetric}
                  onChange={e => setPerfMetric(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-[10px] font-mono text-gray-300 outline-none"
                >
                  <option value="avg_fps">AVG FPS</option>
                  <option value="avg_startup_ms">AVG STARTUP (ms)</option>
                  <option value="avg_memory_mb">AVG MEMORY (MB)</option>
                  <option value="avg_api_ms">AVG API LATENCY (ms)</option>
                </select>
              </div>
            )}
            <div>
              <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1.5">BREAK DOWN BY</div>
              <input
                value={breakdownBy}
                onChange={e => setBreakdownBy(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-[10px] font-mono text-gray-300 placeholder-gray-700 outline-none focus:border-blue-800"
                placeholder="plan, device_tier, app_version…"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={run}
                disabled={loading}
                className="w-full py-1.5 text-[10px] font-mono font-bold tracking-widest text-blue-400 border border-blue-800 rounded hover:bg-blue-950 disabled:opacity-40 transition-colors"
              >
                {loading ? 'RUNNING...' : 'RUN QUERY'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-950/30 border border-red-900 rounded px-4 py-3 text-[10px] font-mono text-red-400">
          ERROR: {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 gap-4">

          {/* Bar chart */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1e1e1e] text-[10px] font-mono text-gray-400 tracking-widest">
              {metricLabel} BY {breakdownBy.toUpperCase()}
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={results} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <XAxis
                    type="number"
                    tick={{ fill: '#555', fontSize: 9, fontFamily: 'monospace' }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    type="category" dataKey="segment" width={90}
                    tick={{ fill: '#666', fontSize: 9, fontFamily: 'monospace' }}
                    axisLine={false} tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ background: '#111', border: '1px solid #2a2a2a', fontSize: 10, fontFamily: 'monospace' }}
                    labelStyle={{ color: '#fff' }}
                    cursor={{ fill: '#1a1a1a' }}
                  />
                  <Bar dataKey="value" radius={[0, 2, 2, 0]}>
                    {results.map((_, i) => (
                      <Cell key={i} fill={SEG_COLORS[i % SEG_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1e1e1e] text-[10px] font-mono text-gray-400 tracking-widest">
              BREAKDOWN TABLE
            </div>
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-[#1a1a1a]">
                  <th className="text-left px-4 py-2.5 text-[9px] text-gray-600 tracking-widest font-normal">
                    {breakdownBy.toUpperCase()}
                  </th>
                  <th className="text-right px-4 py-2.5 text-[9px] text-gray-600 tracking-widest font-normal">
                    {metricLabel}
                  </th>
                  {results[0]?.unique_users !== undefined && (
                    <th className="text-right px-4 py-2.5 text-[9px] text-gray-600 tracking-widest font-normal">
                      USERS
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414]">
                {results.map((row, i) => (
                  <tr key={row.segment} className="hover:bg-[#161616] transition-colors">
                    <td className="px-4 py-2.5 text-gray-300 flex items-center gap-2">
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: SEG_COLORS[i % SEG_COLORS.length] }}
                      />
                      {row.segment}
                    </td>
                    <td className="px-4 py-2.5 text-right text-white font-bold">
                      {typeof row.value === 'number'
                        ? row.value.toLocaleString(undefined, { maximumFractionDigits: 1 })
                        : row.value}
                    </td>
                    {row.unique_users !== undefined && (
                      <td className="px-4 py-2.5 text-right text-gray-500">
                        {row.unique_users.toLocaleString()}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {ran && !loading && results.length === 0 && !error && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-8 text-center">
          <div className="text-[10px] font-mono text-gray-600">
            NO DATA — try a different event name or property key
          </div>
        </div>
      )}

      {!ran && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-8 text-center">
          <div className="text-[10px] font-mono text-gray-600">
            CONFIGURE A QUERY ABOVE AND PRESS RUN QUERY
          </div>
        </div>
      )}

    </div>
  )
}
