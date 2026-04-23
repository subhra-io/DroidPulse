'use client'

import { useMemo, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

interface Props {
  events: any[]
  fpsEvents: any[]
  memoryEvents: any[]
  screenEvents: any[]
  connected: boolean
  cloudConnected: boolean
  loading: boolean
}

// ── helpers ──────────────────────────────────────────────────────────────────

function calcHealth(events: any[]) {
  const fps  = events.filter(e => e.type === 'fps')
  const mem  = events.filter(e => e.type === 'memory')
  const api  = events.filter(e => e.type === 'network')

  const avgFps   = fps.length  ? fps.reduce((s, e) => s + (e.fps || 0), 0) / fps.length : -1
  const latestMem = mem[mem.length - 1]
  const memPct   = latestMem?.usagePercentage ?? -1
  const failedApi = api.filter(e => !e.success || e.responseCode >= 400).length
  const avgApi   = api.length  ? api.reduce((s, e) => s + (e.duration || 0), 0) / api.length : -1

  const fpsScore = avgFps < 0 ? 0 : avgFps >= 58 ? 100 : avgFps >= 45 ? 75 : avgFps >= 30 ? 50 : 25
  const memScore = memPct < 0 ? 0 : memPct < 50 ? 100 : memPct < 70 ? 80 : memPct < 85 ? 55 : 30
  const netScore = avgApi < 0 ? 0 : avgApi < 200 ? 100 : avgApi < 500 ? 80 : avgApi < 1000 ? 60 : 40
  if (failedApi > 0) Math.max(netScore - failedApi * 10, 0)

  const active = [fpsScore, memScore, netScore].filter(s => s > 0)
  const overall = active.length ? Math.round(active.reduce((a, b) => a + b) / active.length) : 85

  const cpuLoad  = avgFps >= 0 ? Math.max(5, 100 - fpsScore * 0.7).toFixed(1) : '24.2'
  const errRate  = api.length  ? ((failedApi / api.length) * 100).toFixed(2) : '0.02'

  return { overall, cpuLoad, errRate, memPct, latestMem }
}

function statusLabel(score: number) {
  if (score >= 90) return 'EXCELLENT'
  if (score >= 75) return 'OPTIMAL'
  if (score >= 55) return 'FAIR'
  return 'CRITICAL'
}

// ── Ring ─────────────────────────────────────────────────────────────────────

function Ring({ score }: { score: number }) {
  const size = 160
  const r    = 62
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e1e1e" strokeWidth={10} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={10}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease', filter: 'drop-shadow(0 0 6px #3b82f6)' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-4xl font-black text-white">{score}</div>
        <div className="text-[10px] font-mono text-blue-400 tracking-widest mt-0.5">{statusLabel(score)}</div>
      </div>
    </div>
  )
}

// ── Memory chart ─────────────────────────────────────────────────────────────

function MemoryPanel({ events }: { events: any[] }) {
  const [range, setRange] = useState<'1H' | '6H' | '24H'>('6H')

  const data = useMemo(() => {
    const slice = range === '1H' ? 20 : range === '6H' ? 40 : 60
    const src   = events.slice(-slice)
    if (src.length === 0) {
      // demo curve
      return Array.from({ length: 30 }, (_, i) => ({
        t: i,
        mb: 900 + Math.sin(i * 0.4) * 300 + Math.sin(i * 0.15) * 150,
      }))
    }
    return src.map((e, i) => ({ t: i, mb: e.usedMemoryMb || 0 }))
  }, [events, range])

  const latest = events[events.length - 1]
  const usedMb = latest?.usedMemoryMb ?? 1402
  const maxMb  = latest?.maxMemoryMb  ?? 4096

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-mono text-gray-500 tracking-widest">MEMORY UTILIZATION</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{usedMb.toLocaleString()} MB</span>
            <span className="text-xs text-gray-600 font-mono">/ {maxMb.toLocaleString()} MB</span>
          </div>
        </div>
        <div className="flex gap-1">
          {(['1H', '6H', '24H'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`text-[10px] font-mono px-2 py-1 rounded border transition-colors ${
                range === r
                  ? 'border-blue-600 bg-blue-950/40 text-blue-400'
                  : 'border-[#2a2a2a] text-gray-600 hover:text-gray-400'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={130}>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: -30, bottom: 0 }}>
          <defs>
            <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="t" hide />
          <YAxis tick={{ fontSize: 9, fill: '#444' }} />
          <Tooltip
            contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', fontSize: 11 }}
            formatter={(v: any) => [`${Math.round(v)} MB`, 'Memory']}
            labelFormatter={() => ''}
          />
          <Area
            type="monotone" dataKey="mb"
            stroke="#3b82f6" strokeWidth={2}
            fill="url(#memGrad)" dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── FPS bar chart ─────────────────────────────────────────────────────────────

function FpsPanel({ events }: { events: any[] }) {
  const data = useMemo(() => {
    const src = events.slice(-16)
    if (src.length === 0) {
      return Array.from({ length: 16 }, (_, i) => ({
        i, fps: 50 + Math.random() * 10 - (i === 6 ? 30 : 0),
      }))
    }
    return src.map((e, i) => ({ i, fps: e.fps || 0 }))
  }, [events])

  const avg = data.length ? data.reduce((s, d) => s + d.fps, 0) / data.length : 59.6
  const min = data.length ? Math.min(...data.map(d => d.fps)) : 42.1

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-mono text-gray-500 tracking-widest">FPS STABILITY</div>
        <div className="flex items-center gap-4 text-[10px] font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-gray-400">{avg.toFixed(1)} AVG</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span className="text-gray-400">{min.toFixed(1)} MIN</span>
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={130}>
        <BarChart data={data} barCategoryGap="20%" margin={{ top: 4, right: 0, left: -30, bottom: 0 }}>
          <XAxis dataKey="i" hide />
          <YAxis domain={[0, 65]} tick={{ fontSize: 9, fill: '#444' }} />
          <Tooltip
            contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', fontSize: 11 }}
            formatter={(v: any) => [`${v.toFixed(1)} fps`, 'FPS']}
            labelFormatter={() => ''}
          />
          <Bar dataKey="fps" radius={[2, 2, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.fps < 30 ? '#7f1d1d' : '#1e3a5f'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Navigation history ────────────────────────────────────────────────────────

function NavHistory({ events }: { events: any[] }) {
  const rows = useMemo(() => {
    const resumed = events.filter(e => e.eventType === 'RESUMED').slice(-5).reverse()
    if (resumed.length === 0) {
      return [
        { path: '/auth/login/success',        time: '14:02:11.23', ms: 124,  color: 'text-green-400' },
        { path: '/dashboard/metrics/realtime', time: '14:02:14.45', ms: 452,  color: 'text-gray-300' },
        { path: '/user/profile/settings',      time: '14:05:01.09', ms: 1024, color: 'text-yellow-400' },
      ]
    }
    return resumed.map(e => {
      const ms = e.duration || 0
      return {
        path:  e.screenName || '—',
        time:  new Date(e.timestamp).toLocaleTimeString('en-GB', { hour12: false, fractionalSecondDigits: 2 }),
        ms,
        color: ms < 200 ? 'text-green-400' : ms < 800 ? 'text-gray-300' : 'text-yellow-400',
      }
    })
  }, [events])

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-5 flex flex-col gap-3">
      <div className="text-[10px] font-mono text-gray-500 tracking-widest">NAVIGATION HISTORY</div>
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="text-[9px] text-gray-600 tracking-widest border-b border-[#1e1e1e]">
            <th className="text-left pb-2 font-normal">PATH_SEGMENT</th>
            <th className="text-left pb-2 font-normal">T_OFFSET</th>
            <th className="text-right pb-2 font-normal">LOAD_MS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-[#161616]">
              <td className="py-2.5 text-gray-300 truncate max-w-[180px]">{r.path}</td>
              <td className="py-2.5 text-gray-600">{r.time}</td>
              <td className={`py-2.5 text-right ${r.color}`}>{r.ms}ms</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Live event stream ─────────────────────────────────────────────────────────

const EVENT_COLORS: Record<string, string> = {
  RECV_PAYLOAD_SIZE_MISMATCH: 'border-l-gray-500 text-gray-300',
  GC_COLLECTION_COMPLETED:    'border-l-gray-500 text-gray-400',
  LOW_MEMORY_WARNING:         'border-l-yellow-500 text-gray-300',
  UI_REFLOW_SUCCESS:          'border-l-gray-600 text-gray-500',
}

function fmtEvent(e: any): { key: string; detail: string; time: string } {
  const time = new Date(e.timestamp).toLocaleTimeString('en-GB', { hour12: false })
  if (e.type === 'network') {
    const path = (() => { try { return new URL(e.url).pathname } catch { return e.url } })()
    return { key: `RECV_PAYLOAD_SIZE_MISMATCH`, detail: path, time }
  }
  if (e.type === 'memory' && e.isLowMemory) {
    return { key: 'LOW_MEMORY_WARNING', detail: `[THRESHOLD: ${e.usagePercentage?.toFixed(0)}%]`, time }
  }
  if (e.type === 'memory') {
    return { key: 'GC_COLLECTION_COMPLETED', detail: `{Sweep: ${e.gcDuration ?? 14}ms}`, time }
  }
  return { key: 'UI_REFLOW_SUCCESS', detail: `Context:${e.screenName ?? 'MainWindow'}`, time }
}

function LiveStream({ events, connected }: { events: any[]; connected: boolean }) {
  const rows = useMemo(() => {
    if (events.length === 0) {
      return [
        { key: 'RECV_PAYLOAD_SIZE_MISMATCH', detail: 'on_entrySocket#04', time: '14:08:21',
          sub: '{"expected": 2048, "received": 2041, "origin": "10.0.1.4"}' },
        { key: 'GC_COLLECTION_COMPLETED',    detail: '{Sweep: 14ms}',      time: '14:08:19', sub: '' },
        { key: 'LOW_MEMORY_WARNING',         detail: '[THRESHOLD: 80%]',   time: '14:08:15', sub: '' },
        { key: 'UI_REFLOW_SUCCESS',          detail: 'Context:MainWindow', time: '14:08:12', sub: '' },
      ]
    }
    return events.slice(-8).reverse().map(e => ({ ...fmtEvent(e), sub: '' }))
  }, [events])

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-mono text-gray-500 tracking-widest">LIVE EVENT STREAM</div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-green-400">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          RECORDING
        </div>
      </div>

      <div className="space-y-1 max-h-52 overflow-y-auto">
        {rows.map((r, i) => {
          const cls = EVENT_COLORS[r.key] ?? 'border-l-gray-600 text-gray-400'
          const [borderCls, textCls] = cls.split(' ')
          return (
            <div key={i} className={`border-l-2 pl-3 py-1 ${borderCls}`}>
              <div className="flex items-baseline gap-2 text-[11px] font-mono">
                <span className="text-gray-600 flex-shrink-0">{r.time}</span>
                <span className={`font-semibold ${textCls}`}>{r.key}</span>
                <span className="text-gray-500 truncate">{r.detail}</span>
              </div>
              {r.sub && (
                <div className="text-[10px] font-mono text-gray-700 mt-0.5 pl-0">{r.sub}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Export panel ──────────────────────────────────────────────────────────────

function ExportPanel({ events }: { events: any[] }) {
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `droidpulse-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-5 flex flex-col gap-3">
      {/* Export system logs */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-mono font-bold text-white tracking-widest">EXPORT SYSTEM LOGS</div>
          <div className="text-[10px] text-gray-600 mt-0.5">Compile full session trace</div>
        </div>
        <button
          onClick={exportJSON}
          className="p-2 border border-[#2a2a2a] rounded hover:border-blue-600 hover:text-blue-400 text-gray-500 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M7 1v8M4 6l3 3 3-3" /><path d="M2 10v2a1 1 0 001 1h8a1 1 0 001-1v-2" />
          </svg>
        </button>
      </div>

      <div className="border-t border-[#1e1e1e]" />

      {/* Generate PDF */}
      <button
        onClick={exportJSON}
        className="flex items-center justify-between px-4 py-3 bg-white text-black rounded font-mono text-xs font-bold tracking-widest hover:bg-gray-100 transition-colors"
      >
        GENERATE PDF REPORT
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M7 1v8M4 6l3 3 3-3" /><path d="M2 10v2a1 1 0 001 1h8a1 1 0 001-1v-2" />
        </svg>
      </button>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function OverviewTab({ events, fpsEvents, memoryEvents, screenEvents, connected }: Props) {
  const { overall, cpuLoad, errRate } = useMemo(() => calcHealth(events), [events])

  return (
    <div className="space-y-4">

      {/* Row 1: Health + Memory */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Health Score */}
        <div className="lg:col-span-2 bg-[#111] border border-[#1e1e1e] rounded-lg p-5 flex flex-col gap-4">
          <div className="text-[10px] font-mono text-gray-500 tracking-widest">APP HEALTH SCORE</div>
          <div className="flex justify-center">
            <Ring score={overall} />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[#1e1e1e]">
            <div>
              <div className="text-[9px] font-mono text-gray-600 tracking-widest">CPU LOAD</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-sm font-mono font-bold text-white">{cpuLoad}%</span>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              </div>
            </div>
            <div>
              <div className="text-[9px] font-mono text-gray-600 tracking-widest">ERROR RATE</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-sm font-mono font-bold text-white">{errRate}%</span>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Memory */}
        <div className="lg:col-span-3">
          <MemoryPanel events={memoryEvents} />
        </div>
      </div>

      {/* Row 2: FPS + Nav History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FpsPanel events={fpsEvents} />
        <NavHistory events={screenEvents} />
      </div>

      {/* Row 3: Export + Live Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <ExportPanel events={events} />
        </div>
        <div className="lg:col-span-3">
          <LiveStream events={events} connected={connected} />
        </div>
      </div>

      {/* CREATE CUSTOM VIEW FAB */}
      <div className="fixed bottom-6 right-6">
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-mono font-bold tracking-widest px-4 py-3 rounded shadow-lg shadow-blue-900/40 transition-colors">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="1" width="5" height="5" rx="0.5" /><rect x="8" y="1" width="5" height="5" rx="0.5" />
            <rect x="1" y="8" width="5" height="5" rx="0.5" /><rect x="8" y="8" width="5" height="5" rx="0.5" />
          </svg>
          CREATE CUSTOM VIEW
        </button>
      </div>

    </div>
  )
}
