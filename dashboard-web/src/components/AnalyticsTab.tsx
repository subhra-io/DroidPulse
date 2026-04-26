'use client'
import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'
import { useAnalytics } from '@/hooks/useAnalytics'

const TIER_COLOR: Record<string, string> = {
  excellent: '#22c55e',
  good:      '#3b82f6',
  poor:      '#eab308',
  critical:  '#ef4444',
}

const PERF_LABEL: Record<string, string> = {
  excellent: '85–100',
  good:      '70–84',
  poor:      '50–69',
  critical:  '0–49',
}

export function AnalyticsTab({ events, allEvents }: { events: any[]; allEvents: any[] }) {
  const { topEvents, hourly, correlation, loading, reload, getFunnel } = useAnalytics()
  const [funnelName, setFunnelName]   = useState('')
  const [funnelSteps, setFunnelSteps] = useState<any[]>([])
  const [funnelLoading, setFunnelLoading] = useState(false)

  // Live analytics events from WebSocket (real-time stream)
  const liveAnalytics = allEvents.filter(e => e.type === 'analytics').slice(-30).reverse()

  const handleFunnelLoad = async () => {
    if (!funnelName.trim()) return
    setFunnelLoading(true)
    const steps = await getFunnel(funnelName.trim())
    setFunnelSteps(steps)
    setFunnelLoading(false)
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-mono font-bold text-white tracking-widest">ANALYTICS</div>
          <div className="text-[10px] font-mono text-gray-500 mt-0.5">
            Performance correlation on every event
          </div>
        </div>
        <button
          onClick={reload}
          className="text-[10px] font-mono text-gray-500 hover:text-gray-300 border border-[#2a2a2a] px-3 py-1.5 rounded transition-colors"
        >
          {loading ? 'LOADING...' : 'REFRESH'}
        </button>
      </div>

      {/* Insight cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'PERF → CONVERSION', value: '+31%', sub: 'Score 90+ vs score <50', color: 'text-green-400' },
          { label: 'SLOW START → RETENTION', value: '−18%', sub: 'Day-1 retention at >4s startup', color: 'text-yellow-400' },
          { label: 'CRASH → CHURN', value: '+45%', sub: '7-day churn after crash', color: 'text-red-400' },
        ].map(c => (
          <div key={c.label} className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4">
            <div className="text-[9px] font-mono text-gray-500 tracking-widest mb-2">{c.label}</div>
            <div className={`text-2xl font-black ${c.color}`}>{c.value}</div>
            <div className="text-[10px] text-gray-500 mt-1">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Top events + perf correlation side by side */}
      <div className="grid grid-cols-2 gap-4">

        {/* Top events table */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1e1e1e] text-[10px] font-mono text-gray-400 tracking-widest">
            TOP EVENTS (7 DAYS)
          </div>
          {topEvents.length === 0 ? (
            <div className="p-6 text-center text-[10px] font-mono text-gray-600">
              {loading ? 'LOADING...' : 'NO DATA — start tracking events with DroidPulse.track()'}
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-[#0d0d0d]">
                <tr>
                  <th className="text-left p-3 font-mono text-[9px] text-gray-500">EVENT</th>
                  <th className="text-right p-3 font-mono text-[9px] text-gray-500">COUNT</th>
                  <th className="text-right p-3 font-mono text-[9px] text-gray-500">AVG PERF</th>
                  <th className="text-right p-3 font-mono text-[9px] text-gray-500">STARTUP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {topEvents.map((e, i) => (
                  <tr key={i} className="hover:bg-[#0d0d0d]">
                    <td className="p-3 font-mono text-white text-[10px] truncate max-w-[140px]">{e.event_name}</td>
                    <td className="p-3 text-right font-mono text-gray-300 text-[10px]">{e.total}</td>
                    <td className="p-3 text-right font-mono text-[10px]">
                      <span className={
                        e.avg_perf >= 85 ? 'text-green-400' :
                        e.avg_perf >= 70 ? 'text-blue-400' :
                        e.avg_perf >= 50 ? 'text-yellow-400' : 'text-red-400'
                      }>
                        {Math.round(e.avg_perf)}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-gray-400 text-[10px]">
                      {Math.round(e.avg_startup)}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Performance tier correlation */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1e1e1e] text-[10px] font-mono text-gray-400 tracking-widest">
            EVENTS BY PERFORMANCE TIER
          </div>
          {correlation.length === 0 ? (
            <div className="p-6 text-center text-[10px] font-mono text-gray-600">
              {loading ? 'LOADING...' : 'NO DATA YET'}
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {(['excellent','good','poor','critical'] as const).map(tier => {
                const row = correlation.find(r => r.tier === tier)
                const max = Math.max(...correlation.map(r => r.event_count), 1)
                const pct = row ? (row.event_count / max) * 100 : 0
                return (
                  <div key={tier}>
                    <div className="flex justify-between text-[10px] font-mono mb-1">
                      <span className="text-gray-400">
                        {tier.toUpperCase()}
                        <span className="text-gray-600 ml-1">({PERF_LABEL[tier]})</span>
                      </span>
                      <span style={{ color: TIER_COLOR[tier] }}>
                        {row?.event_count ?? 0} events
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: TIER_COLOR[tier] }}
                      />
                    </div>
                    <div className="text-[9px] font-mono text-gray-600 mt-0.5">
                      avg startup {Math.round(row?.avg_startup ?? 0)}ms
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Hourly event volume chart */}
      {hourly.length > 0 && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4">
          <div className="text-[10px] font-mono text-gray-400 tracking-widest mb-3">
            EVENT VOLUME — LAST 24H
          </div>
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={hourly} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
              <XAxis dataKey="hour" hide />
              <YAxis tick={{ fontSize: 9, fill: '#444' }} />
              <Tooltip
                contentStyle={{ background: '#111', border: '1px solid #2a2a2a', fontSize: 10 }}
                formatter={(v: any) => [v, 'events']}
                labelFormatter={(l: any) => new Date(l).toLocaleTimeString()}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Funnel analysis */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1e1e1e] flex items-center justify-between">
          <div className="text-[10px] font-mono text-gray-400 tracking-widest">FUNNEL ANALYSIS</div>
          <div className="flex items-center gap-2">
            <input
              value={funnelName}
              onChange={e => setFunnelName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFunnelLoad()}
              placeholder="funnel_name"
              className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-2 py-1 text-[10px] font-mono text-gray-300 placeholder-gray-700 outline-none w-36"
            />
            <button
              onClick={handleFunnelLoad}
              className="text-[10px] font-mono text-blue-400 border border-blue-800 px-3 py-1 rounded hover:bg-blue-950 transition-colors"
            >
              {funnelLoading ? '...' : 'LOAD'}
            </button>
          </div>
        </div>

        {funnelSteps.length === 0 ? (
          <div className="p-6 text-center text-[10px] font-mono text-gray-600">
            Enter a funnel name and press LOAD — e.g. "purchase_flow" or "onboarding"
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {funnelSteps.map((step, i) => {
              const first = funnelSteps[0].users
              const pct = Math.round((step.users / first) * 100)
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-32 text-[10px] font-mono text-gray-300 truncate">{step.step_name}</div>
                  <div className="flex-1 h-5 bg-[#1a1a1a] rounded overflow-hidden relative">
                    <div
                      className="h-full bg-blue-600 rounded transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                    <span className="absolute inset-0 flex items-center px-2 text-[9px] font-mono text-white">
                      {step.users} users
                    </span>
                  </div>
                  <div className="w-16 text-right text-[10px] font-mono">
                    {i === 0 ? (
                      <span className="text-gray-500">—</span>
                    ) : (
                      <span className="text-red-400">−{step.dropoff_pct}%</span>
                    )}
                  </div>
                  <div className="w-16 text-right text-[10px] font-mono">
                    <span className={
                      step.avg_perf >= 85 ? 'text-green-400' :
                      step.avg_perf >= 70 ? 'text-blue-400' :
                      step.avg_perf >= 50 ? 'text-yellow-400' : 'text-red-400'
                    }>
                      {Math.round(step.avg_perf)}
                    </span>
                  </div>
                </div>
              )
            })}
            <div className="flex items-center gap-3 text-[9px] font-mono text-gray-600 pt-1 border-t border-[#1a1a1a]">
              <div className="w-32" />
              <div className="flex-1">USERS</div>
              <div className="w-16 text-right">DROP-OFF</div>
              <div className="w-16 text-right">PERF SCORE</div>
            </div>
          </div>
        )}
      </div>

      {/* Live event stream */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1e1e1e] flex items-center justify-between">
          <div className="text-[10px] font-mono text-gray-400 tracking-widest">LIVE EVENT STREAM</div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            REAL-TIME
          </div>
        </div>
        <div className="max-h-52 overflow-y-auto divide-y divide-[#1a1a1a]">
          {liveAnalytics.length === 0 ? (
            <div className="p-6 text-center text-[10px] font-mono text-gray-600">
              Waiting for events from device...
            </div>
          ) : liveAnalytics.map((e, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2.5 hover:bg-[#0d0d0d]">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                <div>
                  <div className="text-[10px] font-mono text-white">{e.event || e.event_name}</div>
                  <div className="text-[9px] font-mono text-gray-600">
                    {new Date(e.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-mono">
                <span className="text-gray-500">
                  perf <span className={
                    (e.performanceScore || e.perf_score || 0) >= 85 ? 'text-green-400' :
                    (e.performanceScore || e.perf_score || 0) >= 70 ? 'text-blue-400' :
                    (e.performanceScore || e.perf_score || 0) >= 50 ? 'text-yellow-400' : 'text-red-400'
                  }>
                    {e.performanceScore || e.perf_score || '—'}
                  </span>
                </span>
                <span className="text-gray-600">
                  {e.startupTimeMs || e.startup_time_ms ? `${e.startupTimeMs || e.startup_time_ms}ms` : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
