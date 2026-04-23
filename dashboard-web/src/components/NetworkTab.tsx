'use client'

import { useState, useMemo } from 'react'

interface Props {
  events: any[]
  subTab: 'live' | 'analysis' | 'security'
  allEvents: any[]
}

// ── helpers ───────────────────────────────────────────────────────────────────

function getPath(url: string) {
  try { return new URL(url).pathname } catch { return url }
}

function formatBytes(b: number) {
  if (!b || b < 0) return '—'
  if (b < 1024) return `${b} B`
  return `${(b / 1024).toFixed(1)} KB`
}

function methodCls(m: string) {
  switch (m?.toUpperCase()) {
    case 'GET':    return 'bg-[#0f2a1a] text-green-400 border border-green-900'
    case 'POST':   return 'bg-[#0f1a2a] text-blue-400 border border-blue-900'
    case 'PUT':    return 'bg-[#2a1f0a] text-yellow-400 border border-yellow-900'
    case 'PATCH':  return 'bg-[#2a1a0a] text-orange-400 border border-orange-900'
    case 'DELETE': return 'bg-[#2a0f0f] text-red-400 border border-red-900'
    default:       return 'bg-[#1a1a1a] text-gray-400 border border-gray-700'
  }
}

function statusCls(code: number) {
  if (!code)      return 'text-gray-500'
  if (code < 300) return 'text-green-400'
  if (code < 400) return 'text-yellow-400'
  return 'text-red-400'
}

function latencyCls(ms: number) {
  if (ms < 200)  return 'text-green-400'
  if (ms < 1000) return 'text-yellow-400'
  return 'text-red-400'
}

function statusLabel(p95: number, errors: number) {
  if (errors > 0 && p95 > 1000) return { label: 'Degraded', cls: 'text-red-400' }
  if (p95 > 800)                 return { label: 'Warning',  cls: 'text-yellow-400' }
  if (p95 > 400)                 return { label: 'Stable',   cls: 'text-gray-300' }
  return                                { label: 'Optimal',  cls: 'text-green-400' }
}

function dotCls(p95: number) {
  if (p95 > 1000) return 'bg-red-500'
  if (p95 > 800)  return 'bg-yellow-400'
  if (p95 > 400)  return 'bg-yellow-400'
  return 'bg-green-400'
}

// ── demo data ─────────────────────────────────────────────────────────────────

const DEMO_SLOWEST = [
  { method: 'POST',  path: '/v1/auth/session/initialize',    calls: 12402, p95: 1240, status: { label: 'Degraded', cls: 'text-red-400' },    dot: 'bg-red-500'    },
  { method: 'GET',   path: '/v1/analytics/aggregations/heavy', calls: 8110, p95: 890,  status: { label: 'Warning',  cls: 'text-yellow-400' }, dot: 'bg-yellow-400' },
  { method: 'POST',  path: '/v1/user/upload/profile-binary', calls: 421,   p95: 754,  status: { label: 'Stable',   cls: 'text-gray-300' },   dot: 'bg-yellow-400' },
  { method: 'PATCH', path: '/v1/inventory/bulk-update-v2',   calls: 2055,  p95: 310,  status: { label: 'Optimal',  cls: 'text-green-400' },  dot: 'bg-green-400'  },
]

const DEMO_CALLS = [
  { method: 'POST', url: '/api/v2/gateway/ingest',         code: 200, ms: 42,  kb: '1.2 KB', time: '14:20:01.422', err: false },
  { method: 'GET',  url: '/api/v2/user/assets?id=9402',    code: 500, ms: 142, kb: '0.4 KB', time: '14:16:58.115', err: true  },
  { method: 'POST', url: '/api/v2/cluster/heartbeat',      code: 200, ms: 12,  kb: '0.8 KB', time: '14:19:56.002', err: false },
  { method: 'GET',  url: '/api/v1/external/proxy-request', code: 200, ms: 178, kb: '14.5 KB',time: '14:19:52.881', err: false },
]

const DEMO_INSPECTOR = {
  url:     'https://api.droidpulse.io/api/v2/gateway/ingest?token=k8s_9x22&priority=high',
  status:  200,
  latency: '42ms',
  payload: '1.2 KB',
  headers: [
    { key: 'content-type', val: 'application/json' },
    { key: 'server',       val: 'envoy/1.22.0'     },
    { key: 'x-request-id', val: 'a3f9-bc12-...'   },
    { key: 'cache-control', val: 'no-store'        },
  ],
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, delta, deltaPos, accent }: {
  label: string; value: string; delta?: string; deltaPos?: boolean; accent?: string
}) {
  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-lg px-5 py-4 flex flex-col gap-2">
      <div className="text-[9px] font-mono text-gray-500 tracking-widest">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-black ${accent ?? 'text-white'}`}>{value}</span>
        {delta && (
          <span className={`text-[10px] font-mono ${deltaPos ? 'text-green-400' : 'text-red-400'}`}>
            {delta}
          </span>
        )}
      </div>
      <div className={`h-0.5 w-12 rounded-full ${accent ? accent.replace('text-', 'bg-') : 'bg-blue-600'}`} />
    </div>
  )
}

// ── Live Stream view ──────────────────────────────────────────────────────────

const LIVE_DEMO = [
  { method: 'POST', url: '/api/v2/gateway/ingest',         code: 200, ms: 42,  kb: '1.2 KB', time: '14:20:01.422', err: false },
  { method: 'GET',  url: '/api/v2/user/assets?id=9402',    code: 500, ms: 142, kb: '0.4 KB', time: '14:19:58.115', err: true  },
  { method: 'POST', url: '/api/v2/cluster/heartbeat',      code: 200, ms: 12,  kb: '0.8 KB', time: '14:19:56.002', err: false },
  { method: 'GET',  url: '/api/v1/external/proxy-request', code: 200, ms: 178, kb: '14.5 KB',time: '14:19:52.881', err: false },
  { method: 'POST', url: '/api/v1/auth/session/refresh',   code: 200, ms: 88,  kb: '0.6 KB', time: '14:19:49.330', err: false },
  { method: 'GET',  url: '/api/v2/metrics/realtime',       code: 200, ms: 231, kb: '8.2 KB', time: '14:19:45.110', err: false },
  { method: 'DELETE',url: '/api/v1/cache/flush',           code: 403, ms: 55,  kb: '0.2 KB', time: '14:19:41.009', err: true  },
  { method: 'PATCH', url: '/api/v2/user/preferences',      code: 200, ms: 67,  kb: '1.0 KB', time: '14:19:38.774', err: false },
]

function LiveStreamView({ events }: { events: any[] }) {
  const isDemo = events.length === 0
  const rows = isDemo ? LIVE_DEMO : [...events].reverse().slice(0, 20).map(e => ({
    method: e.method ?? 'GET',
    url:    e.url ?? '—',
    code:   e.responseCode ?? 200,
    ms:     e.duration ?? 0,
    kb:     formatBytes(e.responseSize),
    time:   new Date(e.timestamp).toLocaleTimeString('en-GB', { hour12: false, fractionalSecondDigits: 3 }),
    err:    !e.success || (e.responseCode ?? 200) >= 400,
  }))

  return (
    <div className="space-y-4">
      {/* header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-mono text-green-400">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          LIVE — REAL TIME STREAM
        </div>
        <span className="text-[10px] font-mono text-gray-600">{rows.length} REQUESTS CAPTURED</span>
      </div>

      <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-[#1a1a1a]">
              <th className="text-left px-5 py-2.5 text-[9px] text-gray-600 tracking-widest font-normal">METHOD</th>
              <th className="text-left px-3 py-2.5 text-[9px] text-gray-600 tracking-widest font-normal">URL</th>
              <th className="text-right px-3 py-2.5 text-[9px] text-gray-600 tracking-widest font-normal">STATUS</th>
              <th className="text-right px-3 py-2.5 text-[9px] text-gray-600 tracking-widest font-normal">LATENCY</th>
              <th className="text-right px-3 py-2.5 text-[9px] text-gray-600 tracking-widest font-normal">SIZE</th>
              <th className="text-right px-5 py-2.5 text-[9px] text-gray-600 tracking-widest font-normal">TIME</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-[#141414] hover:bg-[#161616] transition-colors">
                <td className="px-5 py-2.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${methodCls(r.method)}`}>{r.method}</span>
                </td>
                <td className="px-3 py-2.5 text-gray-300 max-w-[320px] truncate">{r.url}</td>
                <td className="px-3 py-2.5 text-right">
                  <span className={`flex items-center justify-end gap-1.5 ${statusCls(r.code)}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${r.err ? 'bg-red-500' : 'bg-green-400'}`} />
                    {r.code} {r.err ? 'ERR' : 'OK'}
                  </span>
                </td>
                <td className={`px-3 py-2.5 text-right ${latencyCls(r.ms)}`}>{r.ms}ms</td>
                <td className="px-3 py-2.5 text-right text-gray-600">{r.kb}</td>
                <td className="px-5 py-2.5 text-right text-gray-600">{r.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Security view ─────────────────────────────────────────────────────────────

const SECURITY_ALERTS = [
  { severity: 'CRITICAL', code: 'AUTH_TOKEN_EXPOSED',      detail: 'Bearer token found in query param on GET /api/v2/user/assets?token=…', time: '14:19:58' },
  { severity: 'HIGH',     code: 'UNENCRYPTED_PII',         detail: 'Email address transmitted over HTTP on POST /api/v1/user/register',     time: '14:18:22' },
  { severity: 'HIGH',     code: 'CORS_WILDCARD_DETECTED',  detail: 'Access-Control-Allow-Origin: * on /api/v2/gateway/ingest',              time: '14:17:44' },
  { severity: 'MEDIUM',   code: 'MISSING_HSTS_HEADER',     detail: 'Strict-Transport-Security header absent on /api/v1/external/proxy-request', time: '14:16:10' },
  { severity: 'MEDIUM',   code: 'RATE_LIMIT_BYPASS',       detail: 'X-Forwarded-For spoofing detected — 42 requests from same client',     time: '14:15:03' },
  { severity: 'LOW',      code: 'DEPRECATED_TLS_VERSION',  detail: 'TLS 1.1 negotiated on connection to api.droidpulse.io',                 time: '14:12:55' },
]

const SECURITY_STATS = [
  { label: 'CRITICAL', count: 1, cls: 'text-red-400',    bar: 'bg-red-500'    },
  { label: 'HIGH',     count: 2, cls: 'text-orange-400', bar: 'bg-orange-500' },
  { label: 'MEDIUM',   count: 2, cls: 'text-yellow-400', bar: 'bg-yellow-400' },
  { label: 'LOW',      count: 1, cls: 'text-gray-400',   bar: 'bg-gray-600'   },
]

function severityCls(s: string) {
  switch (s) {
    case 'CRITICAL': return 'bg-[#2a0f0f] text-red-400 border border-red-900'
    case 'HIGH':     return 'bg-[#2a1a0a] text-orange-400 border border-orange-900'
    case 'MEDIUM':   return 'bg-[#2a2a0a] text-yellow-400 border border-yellow-900'
    default:         return 'bg-[#1a1a1a] text-gray-400 border border-gray-700'
  }
}

function SecurityView({ events }: { events: any[] }) {
  // derive real alerts from events if available
  const alerts = useMemo(() => {
    const real: typeof SECURITY_ALERTS = []
    events.forEach(e => {
      try {
        const u = new URL(e.url ?? '')
        if (u.searchParams.has('token') || u.searchParams.has('api_key')) {
          real.push({ severity: 'CRITICAL', code: 'AUTH_TOKEN_EXPOSED', detail: `Token in query param on ${e.method} ${u.pathname}`, time: new Date(e.timestamp).toLocaleTimeString('en-GB', { hour12: false }) })
        }
      } catch {}
      if (!e.success && (e.responseCode ?? 200) === 403) {
        real.push({ severity: 'HIGH', code: 'FORBIDDEN_ACCESS', detail: `403 on ${e.method} ${getPath(e.url)}`, time: new Date(e.timestamp).toLocaleTimeString('en-GB', { hour12: false }) })
      }
    })
    return real.length > 0 ? real : SECURITY_ALERTS
  }, [events])

  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 } as Record<string, number>
  alerts.forEach(a => { counts[a.severity] = (counts[a.severity] ?? 0) + 1 })

  return (
    <div className="space-y-4">
      {/* summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {SECURITY_STATS.map(s => (
          <div key={s.label} className="bg-[#111] border border-[#1e1e1e] rounded-lg px-5 py-4">
            <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-2">{s.label}</div>
            <div className={`text-3xl font-black ${s.cls}`}>{counts[s.label] ?? 0}</div>
            <div className={`h-0.5 w-8 rounded-full mt-2 ${s.bar}`} />
          </div>
        ))}
      </div>

      {/* alerts table */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1e1e1e] flex items-center justify-between">
          <span className="text-[10px] font-mono text-gray-400 tracking-widest">SECURITY ALERTS</span>
          <span className="text-[10px] font-mono text-gray-600">{alerts.length} ISSUES DETECTED</span>
        </div>
        <div className="divide-y divide-[#141414]">
          {alerts.map((a, i) => (
            <div key={i} className="px-5 py-3.5 flex items-start gap-4 hover:bg-[#161616] transition-colors">
              <span className={`flex-shrink-0 text-[9px] font-mono font-bold px-2 py-1 rounded tracking-widest ${severityCls(a.severity)}`}>
                {a.severity}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-mono font-bold text-gray-200 mb-0.5">{a.code}</div>
                <div className="text-[10px] font-mono text-gray-500 truncate">{a.detail}</div>
              </div>
              <span className="flex-shrink-0 text-[10px] font-mono text-gray-700">{a.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* footer note */}
      <div className="text-[10px] font-mono text-gray-700 text-center tracking-widest">
        SECURITY SCAN POWERED BY DROIDPULSE STATIC ANALYSIS ENGINE
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function NetworkTab({ events, subTab, allEvents }: Props) {
  const [callFilter, setCallFilter] = useState<'all' | 'slow' | 'errors'>('all')
  const [selectedIdx, setSelectedIdx] = useState<number>(0)

  const isDemo = events.length === 0

  // ── stats ──
  const stats = useMemo(() => {
    if (isDemo) return { total: '142.8k', errorRate: '0.42%', slow: '1,204', avgLatency: '184ms' }
    const total   = events.length
    const errors  = events.filter(e => !e.success || (e.responseCode ?? 200) >= 400).length
    const slow    = events.filter(e => e.duration > 1000).length
    const avg     = total ? Math.round(events.reduce((s, e) => s + (e.duration || 0), 0) / total) : 0
    return {
      total:      total >= 1000 ? `${(total / 1000).toFixed(1)}k` : String(total),
      errorRate:  `${((errors / Math.max(total, 1)) * 100).toFixed(2)}%`,
      slow:       slow.toLocaleString(),
      avgLatency: `${avg}ms`,
    }
  }, [events, isDemo])

  // ── slowest endpoints ──
  const slowest = useMemo(() => {
    if (isDemo) return DEMO_SLOWEST
    const map = new Map<string, { calls: number[]; errors: number; method: string }>()
    events.forEach(e => {
      const key = `${e.method}:${getPath(e.url)}`
      if (!map.has(key)) map.set(key, { calls: [], errors: 0, method: e.method })
      const s = map.get(key)!
      s.calls.push(e.duration || 0)
      if (!e.success || (e.responseCode ?? 200) >= 400) s.errors++
    })
    return Array.from(map.entries()).map(([key, s]) => {
      const sorted = [...s.calls].sort((a, b) => a - b)
      const p95    = sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1] ?? 0
      const path   = key.split(':').slice(1).join(':')
      const st     = statusLabel(p95, s.errors)
      return { method: s.method, path, calls: s.calls.length, p95: Math.round(p95), status: st, dot: dotCls(p95) }
    }).sort((a, b) => b.p95 - a.p95).slice(0, 6)
  }, [events, isDemo])

  // ── call list ──
  const calls = useMemo(() => {
    if (isDemo) return DEMO_CALLS
    let list = [...events].reverse()
    if (callFilter === 'slow')   list = list.filter(e => e.duration > 1000)
    if (callFilter === 'errors') list = list.filter(e => !e.success || (e.responseCode ?? 200) >= 400)
    return list.slice(0, 20).map(e => ({
      method: e.method ?? 'GET',
      url:    getPath(e.url),
      code:   e.responseCode ?? 200,
      ms:     e.duration ?? 0,
      kb:     formatBytes(e.responseSize),
      time:   new Date(e.timestamp).toLocaleTimeString('en-GB', { hour12: false, fractionalSecondDigits: 3 }),
      err:    !e.success || (e.responseCode ?? 200) >= 400,
    }))
  }, [events, callFilter, isDemo])

  // ── inspector ──
  const inspector = useMemo(() => {
    if (isDemo) return DEMO_INSPECTOR
    const e = [...events].reverse()[selectedIdx]
    if (!e) return DEMO_INSPECTOR
    return {
      url:     e.url ?? '—',
      status:  e.responseCode ?? 200,
      latency: `${e.duration ?? 0}ms`,
      payload: formatBytes(e.responseSize),
      headers: [
        { key: 'content-type', val: e.contentType ?? 'application/json' },
        { key: 'status',       val: String(e.responseCode ?? 200) },
      ],
    }
  }, [events, selectedIdx, isDemo])

  const exportReport = () => {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `network-report-${Date.now()}.json`
    a.click()
  }

  return (
    <>
      {subTab === 'live'     && <LiveStreamView events={events} />}
      {subTab === 'security' && <SecurityView events={allEvents} />}
      {subTab === 'analysis' && (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="TOTAL REQUESTS"  value={stats.total}      delta="+12%"   deltaPos={false} />
        <StatCard label="ERROR RATE"      value={stats.errorRate}  delta="+0.01%" deltaPos={false} accent="text-red-400" />
        <StatCard label="SLOW REQUESTS"   value={stats.slow}       delta="-4%"    deltaPos={true}  accent="text-yellow-400" />
        <StatCard label="AVG LATENCY"     value={stats.avgLatency} delta="~ stable" deltaPos={true} />
      </div>

      {/* ── Slowest endpoints table ── */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e1e1e]">
          <span className="text-[10px] font-mono text-gray-400 tracking-widest">
            SLOWEST API ENDPOINTS (LAST 24H)
          </span>
          <button
            onClick={exportReport}
            className="text-[10px] font-mono text-gray-400 tracking-widest hover:text-white transition-colors"
          >
            EXPORT REPORT
          </button>
        </div>

        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-[#1a1a1a]">
              <th className="text-left px-5 py-2.5 text-[9px] text-gray-600 tracking-widest font-normal">METHOD</th>
              <th className="text-left px-3 py-2.5 text-[9px] text-gray-600 tracking-widest font-normal">ENDPOINT</th>
              <th className="text-right px-3 py-2.5 text-[9px] text-gray-600 tracking-widest font-normal">CALLS</th>
              <th className="text-right px-3 py-2.5 text-[9px] text-gray-600 tracking-widest font-normal">P95 LATENCY</th>
              <th className="text-right px-5 py-2.5 text-[9px] text-gray-600 tracking-widest font-normal">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {slowest.map((row, i) => (
              <tr key={i} className="border-b border-[#141414] hover:bg-[#161616] transition-colors">
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${methodCls(row.method)}`}>
                    {row.method}
                  </span>
                </td>
                <td className="px-3 py-3 text-gray-300">{row.path}</td>
                <td className="px-3 py-3 text-right text-gray-400">{row.calls.toLocaleString()}</td>
                <td className="px-3 py-3 text-right">
                  <span className="flex items-center justify-end gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${row.dot}`} />
                    <span className="text-gray-300">{row.p95}ms</span>
                  </span>
                </td>
                <td className={`px-5 py-3 text-right ${row.status.cls}`}>{row.status.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Call list + Inspector ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Call list */}
        <div className="lg:col-span-3 bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
          {/* Filter tabs */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1e1e1e]">
            <div className="flex gap-1">
              {(['all', 'slow', 'errors'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setCallFilter(f)}
                  className={`px-3 py-1 text-[10px] font-mono font-bold tracking-widest rounded transition-colors ${
                    callFilter === f
                      ? 'bg-[#1a2a3a] text-blue-400 border border-blue-900'
                      : 'text-gray-600 hover:text-gray-400'
                  }`}
                >
                  {f.toUpperCase().replace('_', ' ')}
                </button>
              ))}
            </div>
            <span className="text-[9px] font-mono text-gray-600 tracking-widest">
              FILTERING BY: REAL_TIME_STREAM
            </span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-[#141414] max-h-[420px] overflow-y-auto">
            {calls.map((c, i) => (
              <div
                key={i}
                onClick={() => setSelectedIdx(i)}
                className={`px-4 py-3 cursor-pointer transition-colors ${
                  selectedIdx === i ? 'bg-[#0f1a2a] border-l-2 border-blue-500' : 'hover:bg-[#161616]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${methodCls(c.method)}`}>
                    {c.method}
                  </span>
                  <span className="text-[10px] font-mono text-gray-600">{c.time}</span>
                </div>
                <div className="text-sm font-mono text-gray-200 truncate mb-1.5">{c.url}</div>
                <div className="flex items-center gap-3 text-[10px] font-mono">
                  <span className={`flex items-center gap-1 ${statusCls(c.code)}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${c.err ? 'bg-red-500' : 'bg-green-400'}`} />
                    {c.code} {c.err ? 'ERR' : 'OK'}
                  </span>
                  <span className={latencyCls(c.ms)}>{c.ms}ms</span>
                  <span className="text-gray-600">{c.kb}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Request Inspector */}
        <div className="lg:col-span-2 bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-[#1e1e1e]">
            <span className="text-[10px] font-mono text-gray-400 tracking-widest">REQUEST INSPECTOR</span>
          </div>

          <div className="p-5 space-y-4">
            {/* Target URL */}
            <div>
              <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1.5">TARGET_URL</div>
              <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded p-3 text-[11px] font-mono text-gray-300 break-all leading-relaxed">
                {inspector.url}
              </div>
            </div>

            {/* Status / Latency / Payload */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded p-3">
                <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1">STATUS</div>
                <div className={`text-sm font-mono font-bold ${statusCls(inspector.status)}`}>
                  {inspector.status} {inspector.status < 300 ? 'OK' : 'ERR'}
                </div>
              </div>
              <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded p-3">
                <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1">LATENCY</div>
                <div className="text-sm font-mono font-bold text-white">{inspector.latency}</div>
              </div>
              <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded p-3">
                <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1">PAYLOAD</div>
                <div className="text-sm font-mono font-bold text-white">{inspector.payload}</div>
              </div>
            </div>

            {/* Response headers */}
            <div>
              <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-2">RESPONSE HEADERS</div>
              <div className="space-y-1.5">
                {inspector.headers.map((h, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-gray-500">{h.key}:</span>
                    <span className="text-blue-400">{h.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
      )}
    </>
  )
}
