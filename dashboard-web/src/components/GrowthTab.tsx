'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts'
import { useAutoRefresh, REFRESH_OPTIONS } from '@/hooks/useAutoRefresh'

const CLOUD_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const SEVERITY_CLS: Record<string, string> = {
  CRITICAL: 'bg-red-950 text-red-400 border border-red-900',
  HIGH:     'bg-orange-950 text-orange-400 border border-orange-900',
  MEDIUM:   'bg-yellow-950 text-yellow-400 border border-yellow-900',
  LOW:      'bg-blue-950 text-blue-400 border border-blue-900',
}
const SIGNAL_LABEL: Record<string, string> = {
  HIGH_VELOCITY:       'Abnormal event velocity',
  MULTI_ACCOUNT:       'Multiple accounts on device',
  CRASH_LOOP:          'Crash loop detected',
  ACCOUNT_TAKEOVER:    'Account takeover signal',
  EMULATOR:            'Emulator / rooted device',
  EXCESSIVE_SESSIONS:  'Excessive sessions',
}
const COLORS = ['#3b82f6','#22d3ee','#f59e0b','#10b981','#f43f5e','#a78bfa','#34d399','#fb923c']

export default function GrowthTab({ projectId }: { projectId: string }) {
  const [view,          setView]          = useState<'installs'|'fraud'>('installs')
  const [overview,      setOverview]      = useState<any>(null)
  const [newUserTrend,  setNewUserTrend]  = useState<any[]>([])
  const [activeBuckets, setActiveBuckets] = useState<any[]>([])
  const [versions,      setVersions]      = useState<any[]>([])
  const [devices,       setDevices]       = useState<any>(null)
  const [fraudOverview, setFraudOverview] = useState<any>(null)
  const [fraudSignals,  setFraudSignals]  = useState<any[]>([])
  const [loading,       setLoading]       = useState(true)
  const [lastRefresh,   setLastRefresh]   = useState<Date | null>(null)
  const [refreshMs,     setRefreshMs]     = useState(30_000)

  const headers = { Authorization: `Bearer ${localStorage.getItem('dp_token')}` }

  const loadInstalls = useCallback(async () => {
    setLoading(true)
    try {
      const [ov, trend, active, ver, dev] = await Promise.all([
        fetch(`${CLOUD_API}/api/installs/overview?projectId=${projectId}`,  { headers }).then(r => r.json()),
        fetch(`${CLOUD_API}/api/installs/new-users?projectId=${projectId}&days=30`, { headers }).then(r => r.json()),
        fetch(`${CLOUD_API}/api/installs/active?projectId=${projectId}`,    { headers }).then(r => r.json()),
        fetch(`${CLOUD_API}/api/installs/versions?projectId=${projectId}`,  { headers }).then(r => r.json()),
        fetch(`${CLOUD_API}/api/installs/devices?projectId=${projectId}`,   { headers }).then(r => r.json()),
      ])
      setOverview(ov)
      setNewUserTrend(trend.trend || [])
      setActiveBuckets(active.buckets || [])
      setVersions(ver.versions || [])
      setDevices(dev)
      setLastRefresh(new Date())
    } catch (_) {}
    setLoading(false)
  }, [projectId])

  const loadFraud = useCallback(async () => {
    setLoading(true)
    try {
      const [ov, signals] = await Promise.all([
        fetch(`${CLOUD_API}/api/fraud/overview?projectId=${projectId}`,  { headers }).then(r => r.json()),
        fetch(`${CLOUD_API}/api/fraud/signals?projectId=${projectId}&limit=50`, { headers }).then(r => r.json()),
      ])
      setFraudOverview(ov)
      setFraudSignals(signals.signals || [])
      setLastRefresh(new Date())
    } catch (_) {}
    setLoading(false)
  }, [projectId])

  const load = useCallback(() => {
    if (view === 'installs') loadInstalls()
    else loadFraud()
  }, [view, loadInstalls, loadFraud])

  useEffect(() => { load() }, [view, projectId])

  // Auto-refresh
  useAutoRefresh(load, { intervalMs: refreshMs, enabled: refreshMs > 0, runOnMount: false })

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-mono font-bold text-white tracking-widest">
            {view === 'installs' ? 'GROWTH & INSTALLS' : 'FRAUD ANALYTICS'}
          </div>
          <div className="text-[10px] font-mono text-gray-500 mt-0.5">
            {view === 'installs'
              ? 'DAU · WAU · MAU · new users · version adoption · device breakdown'
              : 'Emulator detection · velocity · multi-account · account takeover'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Last refresh */}
          {lastRefresh && (
            <span className="text-[9px] font-mono text-gray-700">
              {lastRefresh.toLocaleTimeString('en-GB', { hour12: false })}
            </span>
          )}
          {/* Auto-refresh selector */}
          <select
            value={refreshMs}
            onChange={e => setRefreshMs(Number(e.target.value))}
            className="bg-[#161616] border border-[#2a2a2a] text-[10px] font-mono text-gray-400 rounded px-2 py-1.5 outline-none"
          >
            {REFRESH_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>
                {o.value === 0 ? 'AUTO: OFF' : `AUTO: ${o.label}`}
              </option>
            ))}
          </select>
          <button
            onClick={load}
            className="text-[10px] font-mono text-gray-500 hover:text-gray-300 border border-[#2a2a2a] px-3 py-1.5 rounded transition-colors"
          >
            {loading ? 'LOADING...' : 'REFRESH'}
          </button>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-1">
        {(['installs', 'fraud'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-3 py-1.5 text-[10px] font-mono font-bold tracking-widest rounded transition-colors ${
              view === v
                ? 'bg-[#1a2a3a] text-blue-400 border border-blue-900'
                : 'text-gray-600 hover:text-gray-400 border border-transparent'
            }`}>
            {v === 'installs' ? 'GROWTH & INSTALLS' : 'FRAUD ANALYTICS'}
          </button>
        ))}
      </div>

      {/* ── INSTALLS VIEW ─────────────────────────────────────────────────── */}
      {view === 'installs' && (
        <>
          {/* KPI cards */}
          {overview && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'DAU',            value: overview.dau?.toLocaleString() ?? '0',           color: 'text-blue-400' },
                { label: 'WAU',            value: overview.wau?.toLocaleString() ?? '0',           color: 'text-blue-400' },
                { label: 'MAU',            value: overview.mau?.toLocaleString() ?? '0',           color: 'text-blue-400' },
                { label: 'TOTAL INSTALLS', value: overview.totalInstalls?.toLocaleString() ?? '0', color: 'text-white' },
                { label: 'NEW THIS MONTH', value: overview.newThisMonth?.toLocaleString() ?? '0',  color: 'text-green-400' },
                { label: 'GROWTH RATE',    value: `${overview.growthRate > 0 ? '+' : ''}${overview.growthRate ?? 0}%`, color: overview.growthRate >= 0 ? 'text-green-400' : 'text-red-400' },
                { label: 'AVG SESSIONS',   value: `${overview.avgSessionsPerUser ?? 0}x`,          color: 'text-gray-300' },
                { label: 'CRASH-FREE',     value: `${overview.crashFreeRate ?? 0}%`,               color: overview.crashFreeRate >= 95 ? 'text-green-400' : 'text-yellow-400' },
              ].map(m => (
                <div key={m.label} className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4">
                  <div className="text-[9px] font-mono text-gray-500 tracking-widest mb-1">{m.label}</div>
                  <div className={`text-2xl font-black ${m.color}`}>{m.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* New users trend */}
          {newUserTrend.length > 0 && (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1e1e1e] text-[10px] font-mono text-gray-400 tracking-widest">
                NEW VS RETURNING USERS — LAST 30 DAYS
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={newUserTrend} margin={{ left: -20, right: 0 }}>
                    <XAxis dataKey="day" tick={{ fill: '#555', fontSize: 9, fontFamily: 'monospace' }} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fill: '#555', fontSize: 9, fontFamily: 'monospace' }} />
                    <Tooltip
                      contentStyle={{ background: '#111', border: '1px solid #2a2a2a', fontSize: 10, fontFamily: 'monospace' }}
                      cursor={{ fill: '#1a1a1a' }}
                    />
                    <Bar dataKey="new_users"       name="New"       fill="#3b82f6" stackId="a" radius={[0,0,0,0]} />
                    <Bar dataKey="returning_users" name="Returning" fill="#1e3a5f" stackId="a" radius={[2,2,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Active installs + Version adoption side by side */}
          <div className="grid grid-cols-2 gap-4">

            {/* Active installs buckets */}
            <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1e1e1e] text-[10px] font-mono text-gray-400 tracking-widest">
                ACTIVE INSTALLS BY WINDOW
              </div>
              <div className="divide-y divide-[#141414]">
                {activeBuckets.map((b, i) => {
                  const max = activeBuckets[activeBuckets.length - 1]?.active || 1
                  const pct = Math.round((b.active / max) * 100)
                  return (
                    <div key={i} className="px-4 py-3">
                      <div className="flex justify-between text-[10px] font-mono mb-1.5">
                        <span className="text-gray-400">{b.label.toUpperCase()}</span>
                        <span className="text-white font-bold">{b.active.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Version adoption */}
            <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1e1e1e] text-[10px] font-mono text-gray-400 tracking-widest">
                APP VERSION ADOPTION
              </div>
              {versions.length === 0 ? (
                <div className="p-6 text-center text-[10px] font-mono text-gray-700">NO DATA</div>
              ) : (
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#1a1a1a]">
                      {['VERSION','DEVICES','ADOPTION','STARTUP','CRASHES'].map(h => (
                        <th key={h} className="text-left px-4 py-2 text-[9px] text-gray-600 tracking-widest font-normal">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#141414]">
                    {versions.slice(0, 8).map((v, i) => (
                      <tr key={i} className="hover:bg-[#161616] transition-colors">
                        <td className="px-4 py-2 text-blue-400">{v.app_version}</td>
                        <td className="px-4 py-2 text-gray-300">{v.devices.toLocaleString()}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${v.adoption_pct}%` }} />
                            </div>
                            <span className="text-gray-400">{v.adoption_pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-gray-400">{v.avg_startup ? `${Math.round(v.avg_startup)}ms` : '—'}</td>
                        <td className="px-4 py-2">
                          <span className={v.total_crashes > 0 ? 'text-red-400' : 'text-gray-600'}>
                            {v.total_crashes || 0}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Device & OS breakdown */}
          {devices && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-[#1e1e1e] text-[10px] font-mono text-gray-400 tracking-widest">
                  ANDROID OS VERSIONS
                </div>
                <div className="divide-y divide-[#141414]">
                  {(devices.osVersions || []).slice(0, 8).map((os: any, i: number) => {
                    const max = devices.osVersions[0]?.devices || 1
                    return (
                      <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                        <span className="text-[10px] font-mono text-gray-300 w-20 flex-shrink-0">Android {os.os_version}</span>
                        <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(os.devices / max) * 100}%`, background: COLORS[i % COLORS.length] }} />
                        </div>
                        <span className="text-[10px] font-mono text-gray-500 w-8 text-right">{os.devices}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-[#1e1e1e] text-[10px] font-mono text-gray-400 tracking-widest">
                  TOP DEVICE MODELS
                </div>
                <div className="divide-y divide-[#141414]">
                  {(devices.deviceModels || []).slice(0, 8).map((d: any, i: number) => {
                    const max = devices.deviceModels[0]?.sessions || 1
                    return (
                      <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                        <span className="text-[10px] font-mono text-gray-300 w-28 truncate flex-shrink-0">{d.device_model}</span>
                        <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${(d.sessions / max) * 100}%` }} />
                        </div>
                        <span className="text-[10px] font-mono text-gray-500 w-8 text-right">{d.sessions}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Play Store note */}
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-4 py-3">
            <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1">NOTE — DOWNLOAD COUNTS</div>
            <div className="text-[10px] font-mono text-gray-500">
              The above shows users who <span className="text-gray-300">opened</span> the app.
              Raw Play Store / App Store download counts require connecting the store API separately
              (Google Play Developer API or App Store Connect API).
              Contact your Head of Engineering to set up the API credentials.
            </div>
          </div>
        </>
      )}

      {/* ── FRAUD VIEW ────────────────────────────────────────────────────── */}
      {view === 'fraud' && (
        <>
          {/* Risk score + signal counts */}
          {fraudOverview && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4 md:col-span-1">
                <div className="text-[9px] font-mono text-gray-500 tracking-widest mb-1">FRAUD RISK SCORE</div>
                <div className={`text-3xl font-black ${
                  fraudOverview.riskScore >= 50 ? 'text-red-400' :
                  fraudOverview.riskScore >= 20 ? 'text-yellow-400' : 'text-green-400'
                }`}>{fraudOverview.riskScore}/100</div>
                <div className="text-[9px] font-mono text-gray-600 mt-1">
                  {fraudOverview.totalFlagged} flagged / {fraudOverview.totalSessions} sessions
                </div>
              </div>
              {[
                { label: 'EMULATORS',        value: fraudOverview.signals?.emulators,          color: 'text-yellow-400' },
                { label: 'HIGH VELOCITY',     value: fraudOverview.signals?.highVelocity,       color: 'text-orange-400' },
                { label: 'MULTI-ACCOUNT',     value: fraudOverview.signals?.multiAccount,       color: 'text-red-400' },
                { label: 'IMPOSSIBLE SESSION',value: fraudOverview.signals?.impossibleSessions, color: 'text-red-400' },
                { label: 'CRASH LOOPS',       value: fraudOverview.signals?.crashLoops,         color: 'text-orange-400' },
                { label: 'ACCT TAKEOVER',     value: fraudOverview.signals?.accountTakeover,    color: 'text-red-400' },
              ].map(m => (
                <div key={m.label} className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4">
                  <div className="text-[9px] font-mono text-gray-500 tracking-widest mb-1">{m.label}</div>
                  <div className={`text-2xl font-black ${m.color}`}>{m.value ?? 0}</div>
                </div>
              ))}
            </div>
          )}

          {/* Signal list */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1e1e1e] flex items-center justify-between">
              <div className="text-[10px] font-mono text-gray-400 tracking-widest">
                FRAUD SIGNALS — {fraudSignals.length} DETECTED
              </div>
              <div className="text-[9px] font-mono text-gray-600">LAST 30 DAYS</div>
            </div>

            {fraudSignals.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-[10px] font-mono text-gray-600">
                  {loading ? 'LOADING...' : 'NO FRAUD SIGNALS DETECTED — system clean ✓'}
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[#141414] max-h-[500px] overflow-y-auto">
                {fraudSignals.map((s, i) => (
                  <div key={i} className="px-4 py-3 flex items-start justify-between hover:bg-[#161616] transition-colors">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${SEVERITY_CLS[s.severity] || SEVERITY_CLS.LOW}`}>
                        {s.severity}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[10px] font-mono text-white">
                          {SIGNAL_LABEL[s.signal_type] || s.signal_type}
                        </div>
                        <div className="text-[9px] font-mono text-gray-600 mt-0.5 truncate">
                          {s.device_model && `Device: ${s.device_model}`}
                          {s.session_id   && `Session: ${s.session_id?.slice(0, 12)}…`}
                          {s.event_count  && ` · ${s.event_count.toLocaleString()} events`}
                          {s.user_count   && ` · ${s.user_count} user IDs`}
                          {s.total_crashes && ` · ${s.total_crashes} crashes`}
                          {s.identify_count && ` · ${s.identify_count} identify calls`}
                        </div>
                      </div>
                    </div>
                    <div className="text-[9px] font-mono text-gray-700 flex-shrink-0 ml-3">
                      {s.last_seen || s.started_at
                        ? new Date(s.last_seen || s.started_at).toLocaleDateString()
                        : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* What each signal means */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1e1e1e] text-[10px] font-mono text-gray-400 tracking-widest">
              SIGNAL DEFINITIONS
            </div>
            <div className="divide-y divide-[#141414]">
              {[
                { signal: 'EMULATOR',          sev: 'MEDIUM',   desc: 'Device fingerprint matches known emulator patterns. May indicate automated testing or fraud bots.' },
                { signal: 'HIGH_VELOCITY',     sev: 'CRITICAL', desc: 'Session generated >500 events. Normal users generate 50–200. Likely a bot or automated script.' },
                { signal: 'MULTI_ACCOUNT',     sev: 'HIGH',     desc: 'Same physical device used with 3+ different user accounts. Indicates account farming or credential stuffing.' },
                { signal: 'ACCOUNT_TAKEOVER',  sev: 'CRITICAL', desc: 'identify() called 5+ times in one session. Attacker cycling through stolen credentials.' },
                { signal: 'CRASH_LOOP',        sev: 'HIGH',     desc: '>10 crashes from same device in 30 days. May indicate automated abuse or a compromised device.' },
                { signal: 'IMPOSSIBLE_SESSION',sev: 'HIGH',     desc: 'Session lasted >24 hours. Impossible for a real user — indicates a bot keeping a session alive.' },
              ].map(row => (
                <div key={row.signal} className="px-4 py-3 flex items-start gap-3">
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${SEVERITY_CLS[row.sev]}`}>
                    {row.sev}
                  </span>
                  <div>
                    <div className="text-[10px] font-mono text-gray-300">{SIGNAL_LABEL[row.signal] || row.signal}</div>
                    <div className="text-[9px] font-mono text-gray-600 mt-0.5">{row.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
