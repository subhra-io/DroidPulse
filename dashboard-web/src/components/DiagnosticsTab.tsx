'use client'

import { useMemo, useState } from 'react'

interface Props {
  events: any[]
  onReproduce: (crash: any, sessionId?: string) => void
}

// ── helpers ───────────────────────────────────────────────────────────────────

function threadCls(t: string) {
  if (t?.includes('MAIN')) return 'bg-[#2a1a0a] text-orange-400 border border-orange-800'
  if (t?.includes('IO'))   return 'bg-[#0f1a2a] text-blue-400 border border-blue-900'
  return 'bg-[#1a1a1a] text-gray-400 border border-gray-700'
}

function durationCls(ms: number) {
  if (ms > 100) return 'text-red-400'
  if (ms > 40)  return 'text-yellow-400'
  return 'text-green-400'
}

// ── demo data ─────────────────────────────────────────────────────────────────

const DEMO_CRASH = {
  type:    'FATAL EXCEPTION: main',
  message: "java.lang.NullPointerException: Attempt to invoke virtual method 'void com.droidpulse.data.Profiler.start()' on a null object reference",
  stack: [
    'at com.droidpulse.ui.MainActivity.onCreate(MainActivity.java:142)',
    'at android.app.ActivityThread.performLaunchActivity(ActivityThread.java:3449)',
  ],
  time: '09:42:12 UTC',
}

const DEMO_MILESTONES = [
  { label: 'PROCESS_START', ms: 0   },
  { label: 'CLASS_LOAD',    ms: 42  },
  { label: 'UI_INFLATE',    ms: 156 },
  { label: 'LAYOUT_DRAW',   ms: 284 },
  { label: 'FIRST_IDLE',    ms: 338 },
]

const DEMO_DB = [
  { time: '14:02:22.104', query: 'SELECT * FROM users WHERE last_login > ? ORDER BY id DESC',          thread: 'IO_THREAD_4',   ms: 4   },
  { time: '14:02:21.882', query: "UPDATE settings SET value = ? WHERE key = 'sync_status'",            thread: 'MAIN_THREAD',   ms: 142 },
  { time: '14:02:21.401', query: 'INSERT INTO telemetry_logs (event, timestamp) VALUES (?, ?)',         thread: 'WORKER_POOL_1', ms: 12  },
  { time: '14:02:20.993', query: "SELECT id, name, blob_data FROM assets_cache WHERE type = 'icon'",   thread: 'IO_THREAD_2',   ms: 88  },
]

// ── Crash panel ───────────────────────────────────────────────────────────────

function CrashPanel({ events, onReproduce }: { events: any[]; onReproduce: (crash: any) => void }) {
  const [open, setOpen] = useState(true)
  const isDemo = events.length === 0

  const crashes = isDemo
    ? [{ ...DEMO_CRASH, _isDemo: true }]
    : events.filter(e => e.type === 'crash').reverse().slice(0, 3).map(e => ({
        ...e,
        type:    e.isFatal ? 'FATAL EXCEPTION: main' : e.crashType ?? 'EXCEPTION',
        message: e.message ?? '—',
        stack:   e.stackTrace ? e.stackTrace.split('\n').slice(0, 3) : [],
        time:    new Date(e.timestamp).toLocaleTimeString('en-GB', { hour12: false }) + ' UTC',
      }))

  const crashFree = isDemo ? 99.92 : Math.max(0, 100 - (crashes.length / 100) * 0.1)
  const anrRate   = isDemo ? 0.04  : 0
  const activeEx  = isDemo ? 12    : crashes.length

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#111] border border-[#1e1e1e] rounded-lg px-5 py-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-mono text-gray-600 tracking-widest">CRASH-FREE USERS</span>
            <span className="w-2 h-2 rounded-full bg-green-400" />
          </div>
          <div className="text-3xl font-black text-white mt-1">{crashFree.toFixed(2)}%</div>
          <div className="h-0.5 w-full bg-blue-600 rounded-full mt-3" />
        </div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-lg px-5 py-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-mono text-gray-600 tracking-widest">ANR INCIDENCE RATE</span>
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
          </div>
          <div className="text-3xl font-black text-white mt-1">{anrRate.toFixed(2)}%</div>
          <div className="text-[9px] font-mono text-gray-600 mt-2">Threshold: &lt; 0.10%</div>
        </div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-lg px-5 py-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-mono text-gray-600 tracking-widest">ACTIVE EXCEPTIONS</span>
            <span className="w-2 h-2 rounded-full bg-red-500" />
          </div>
          <div className="text-3xl font-black text-white mt-1">{activeEx}</div>
          {activeEx > 0 && (
            <div className="text-[9px] font-mono text-red-400 mt-2 tracking-widest">ACTION REQUIRED</div>
          )}
        </div>
      </div>

      {/* Crash log */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-3 border-b border-[#1e1e1e] hover:bg-[#161616] transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-gray-300 tracking-widest">
              ACTIVE CRASH LOGS ({crashes.length})
            </span>
            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-[#2a0f0f] text-red-400 border border-red-900 tracking-widest">
              PRIORITY_CRITICAL
            </span>
          </div>
          <svg
            width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#555" strokeWidth="1.5"
            className={`transition-transform ${open ? '' : '-rotate-90'}`}
          >
            <polyline points="2,4 6,8 10,4" />
          </svg>
        </button>

        {open && crashes.map((c, i) => (
          <div key={i} className="px-5 py-4 border-b border-[#141414] bg-[#0f0f0f]">
            <div className="flex items-start justify-between mb-2">
              <span className="text-[11px] font-mono font-bold text-red-400">{c.type}</span>
              <span className="text-[10px] font-mono text-gray-600 flex-shrink-0 ml-4">{c.time}</span>
            </div>
            <p className="text-[11px] font-mono text-gray-300 leading-relaxed mb-2">{c.message}</p>
            <div className="space-y-0.5 mb-4">
              {c.stack.map((line: string, j: number) => (
                <div key={j} className="text-[10px] font-mono text-gray-600">{line}</div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onReproduce(c)}
                className="px-4 py-1.5 border border-red-900 bg-[#1a0a0a] text-[10px] font-mono font-bold text-red-400 tracking-widest hover:bg-red-950 hover:border-red-700 transition-colors rounded"
              >
                REPRODUCE_TRACE
              </button>
              <button className="px-4 py-1.5 text-[10px] font-mono text-gray-600 tracking-widest hover:text-gray-400 transition-colors">
                IGNORE_ISSUE
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Startup profiler ──────────────────────────────────────────────────────────

function StartupPanel({ events }: { events: any[] }) {
  const isDemo = events.length === 0
  const latest = events[events.length - 1]

  const totalMs  = isDemo ? 338 : (latest?.totalMs ?? 0)
  const deltaMs  = isDemo ? -12 : 0
  const milestones = isDemo
    ? DEMO_MILESTONES
    : (latest?.milestones ?? []).filter((m: any) => m != null).map((m: any) => ({ label: (m.name ?? m.label ?? 'EVENT').toUpperCase(), ms: m.elapsedMs ?? m.ms ?? 0 }))

  const maxMs = Math.max(...(milestones.length ? milestones.map((m: any) => m.ms) : [totalMs]), 1)

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-[#1e1e1e]">
        <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1">COLD_START_LATENCY</div>
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-black text-white">{totalMs}ms</span>
          <span className={`text-[10px] font-mono ${deltaMs <= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {deltaMs <= 0 ? '' : '+'}{deltaMs}ms vs avg
          </span>
          {/* mini sparkline placeholder */}
          <div className="ml-auto flex items-end gap-0.5 h-8">
            {[3,5,4,6,5,7,5,6].map((h, i) => (
              <div key={i} className="w-1.5 rounded-sm bg-[#1e3a5f]" style={{ height: `${h * 4}px` }} />
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="px-5 py-4">
        <div className="relative">
          {/* track line */}
          <div className="absolute top-[7px] left-0 right-0 h-px bg-[#1e1e1e]" />
          <div className="flex justify-between relative">
            {(milestones.length ? milestones : DEMO_MILESTONES).map((m: any, i: number) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 border-2 border-[#111] relative z-10" />
                <div className="text-[9px] font-mono text-gray-500 tracking-widest text-center">{m.label}</div>
                <div className="text-[10px] font-mono text-gray-400">{m.ms}ms</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Database / Query explorer ─────────────────────────────────────────────────

function QueryExplorer({ events }: { events: any[] }) {
  const [filter, setFilter] = useState<'all' | 'slow' | 'main'>('all')
  const isDemo = events.length === 0

  const stats = useMemo(() => {
    if (isDemo) return { total: 1402, slow: 18, main: 3, cacheHit: 84 }
    const total    = events.length
    const slow     = events.filter(e => e.isSlow || e.durationMs > 100).length
    const main     = events.filter(e => e.isMainThread).length
    const cacheHit = total ? Math.round(((total - slow) / total) * 100) : 0
    return { total, slow, main, cacheHit }
  }, [events, isDemo])

  const rows = useMemo(() => {
    if (isDemo) return DEMO_DB
    let list = [...events].reverse()
    if (filter === 'slow') list = list.filter(e => e.isSlow || e.durationMs > 100)
    if (filter === 'main') list = list.filter(e => e.isMainThread)
    return list.slice(0, 10).map(e => ({
      time:   new Date(e.timestamp).toLocaleTimeString('en-GB', { hour12: false, fractionalSecondDigits: 3 }),
      query:  e.query ?? '—',
      thread: e.isMainThread ? 'MAIN_THREAD' : (e.threadName ?? 'IO_THREAD'),
      ms:     e.durationMs ?? 0,
    }))
  }, [events, filter, isDemo])

  const STAT_CARDS = [
    { label: 'TOTAL_QUERIES',   value: stats.total.toLocaleString(), icon: '⊞', cls: 'text-white'        },
    { label: 'SLOW_QUERIES',    value: String(stats.slow),           icon: '⚠', cls: 'text-yellow-400'   },
    { label: 'MAIN_THREAD_TX',  value: String(stats.main),           icon: '⚡', cls: 'text-orange-400'  },
    { label: 'CACHE_HIT_RATE',  value: `${stats.cacheHit}%`,         icon: '◎', cls: 'text-gray-300'     },
  ]

  return (
    <div className="space-y-3">
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {STAT_CARDS.map((s, i) => (
          <div key={i} className="bg-[#111] border border-[#1e1e1e] rounded-lg px-4 py-3 flex items-center justify-between">
            <div>
              <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1">{s.label}</div>
              <div className={`text-2xl font-black ${s.cls}`}>{s.value}</div>
            </div>
            <span className="text-xl text-gray-700">{s.icon}</span>
          </div>
        ))}
      </div>

      {/* Query table */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e1e1e]">
          <span className="text-[10px] font-mono text-gray-400 tracking-widest">QUERY_EXPLORER</span>
          <div className="flex items-center gap-2">
            {(['slow', 'main'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(filter === f ? 'all' : f)}
                className={`text-[9px] font-mono font-bold px-3 py-1 rounded border tracking-widest transition-colors ${
                  filter === f
                    ? 'bg-[#1a2a3a] text-blue-400 border-blue-900'
                    : 'border-[#2a2a2a] text-gray-600 hover:text-gray-400'
                }`}
              >
                FILTER: {f === 'slow' ? 'SLOW' : 'MAIN THREAD'}
              </button>
            ))}
          </div>
        </div>

        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-[#1a1a1a]">
              <th className="text-left px-5 py-2.5 text-[9px] text-gray-600 tracking-widest font-normal">TIMESTAMP</th>
              <th className="text-left px-3 py-2.5 text-[9px] text-gray-600 tracking-widest font-normal">QUERY_STRUCTURE</th>
              <th className="text-left px-3 py-2.5 text-[9px] text-gray-600 tracking-widest font-normal">THREAD</th>
              <th className="text-right px-5 py-2.5 text-[9px] text-gray-600 tracking-widest font-normal">DURATION</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-[#141414] hover:bg-[#161616] transition-colors">
                <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{r.time}</td>
                <td className="px-3 py-3 text-gray-300 max-w-[340px] truncate">{r.query}</td>
                <td className="px-3 py-3">
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded tracking-widest ${threadCls(r.thread)}`}>
                    {r.thread}
                  </span>
                </td>
                <td className={`px-5 py-3 text-right font-bold ${durationCls(r.ms)}`}>{r.ms}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function DiagnosticsTab({ events, onReproduce }: Props) {
  const crashEvents   = events.filter(e => e.type === 'crash')
  const startupEvents = events.filter(e => e.type === 'startup')
  const dbEvents      = events.filter(e => e.type === 'database')

  return (
    <div className="space-y-4">
      <CrashPanel   events={crashEvents} onReproduce={onReproduce} />
      <StartupPanel events={startupEvents} />
      <QueryExplorer events={dbEvents} />
    </div>
  )
}
