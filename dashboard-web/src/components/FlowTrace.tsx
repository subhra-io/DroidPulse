'use client'

import { useMemo } from 'react'

interface Props {
  events: any[]
  apiEvents: any[]
}

// ── helpers ───────────────────────────────────────────────────────────────────

function msBadge(ms: number): { label: string; cls: string } {
  if (ms < 200)  return { label: `${ms}ms`,              cls: 'bg-[#1a2a1a] text-green-400 border border-green-900' }
  if (ms < 1000) return { label: `${ms}ms`,              cls: 'bg-[#2a2a1a] text-yellow-400 border border-yellow-900' }
  return               { label: `${(ms/1000).toFixed(1)}s`, cls: 'bg-[#2a1a1a] text-red-400 border border-red-900' }
}

function offsetLabel(ms: number): string {
  if (ms < 1000) return `+${ms}ms`
  return `+${(ms / 1000).toFixed(1)}s`
}

function pathOf(url: string) {
  try { return new URL(url).pathname } catch { return url }
}

// ── demo data when no real events ─────────────────────────────────────────────

const DEMO_SCREENS = [
  {
    id: 'SCREEN_01',
    name: 'SPLASH_LAUNCH',
    offset: 0,
    items: [
      { kind: 'lifecycle', label: 'APPLICATION.ONCREATE()', ms: 142, indent: false },
      { kind: 'sub',       label: 'Init_Firebase_SDK',       ms: 42,  indent: true  },
      { kind: 'sub',       label: 'Dependency_Injection_Graph', ms: 290, indent: true },
      { kind: 'lifecycle', label: 'FIRST_RENDER_COMPLETE',   ms: 850, indent: false },
    ],
  },
  {
    id: 'SCREEN_02',
    name: 'MAIN_DASHBOARD',
    offset: 1200,
    items: [
      { kind: 'api',    label: 'GET /API/V1/METRICS',     ms: 189,  indent: false, error: false },
      { kind: 'api',    label: 'GET /API/V1/USER/CONFIG', ms: 1200, indent: false, error: true, errLabel: 'TIMEOUT' },
      { kind: 'sub',    label: 'Retrying attempt 1/3…',   ms: null, indent: true,  errLabel: 'TIMEOUT' },
      { kind: 'lifecycle', label: 'FRAGMENT_TRANSITION_END', ms: 400, indent: false },
    ],
  },
]

// ── Screen card ───────────────────────────────────────────────────────────────

function ScreenCard({ screen, isFirst }: { screen: typeof DEMO_SCREENS[0]; isFirst: boolean }) {
  return (
    <div className="flex items-start gap-0 flex-shrink-0">
      {/* connector arrow */}
      {!isFirst && (
        <div className="flex items-center self-start mt-[22px] mx-1 text-gray-600">
          <div className="w-4 h-px bg-[#2a2a2a]" />
          <svg width="6" height="8" viewBox="0 0 6 8" fill="#444">
            <path d="M0 0l6 4-6 4V0z" />
          </svg>
        </div>
      )}

      <div className="w-[340px] border border-[#2a2a2a] rounded-lg overflow-hidden">
        {/* Card header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-blue-600">
          <span className="text-[11px] font-mono font-bold text-white tracking-widest">
            {screen.id}: {screen.name}
          </span>
          {screen.offset > 0 && (
            <span className="text-[10px] font-mono text-blue-200">
              {offsetLabel(screen.offset)}
            </span>
          )}
          {screen.offset === 0 && (
            <span className="text-[10px] font-mono text-blue-200">0.0ms</span>
          )}
        </div>

        {/* Items */}
        <div className="bg-[#0f0f0f] px-4 py-3 space-y-2.5 min-h-[160px]">
          {screen.items.map((item, i) => {
            if (item.kind === 'sub') {
              return (
                <div key={i} className="flex items-center justify-between pl-4">
                  <span className="text-[11px] font-mono text-gray-500 italic">{item.label}</span>
                  {item.errLabel ? (
                    <span className="text-[10px] font-mono text-red-400">{item.errLabel}</span>
                  ) : item.ms !== null ? (
                    <span className="text-[10px] font-mono text-gray-600">{item.ms}ms</span>
                  ) : null}
                </div>
              )
            }

            if (item.kind === 'api') {
              const b = item.ms !== null ? msBadge(item.ms) : null
              return (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                    <span className="text-[11px] font-mono text-gray-200">{item.label}</span>
                  </div>
                  {item.error ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#2a1a1a] text-red-400 border border-red-900">
                      {item.ms !== null ? `${(item.ms / 1000).toFixed(1)}s` : item.errLabel}
                    </span>
                  ) : b ? (
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${b.cls}`}>{b.label}</span>
                  ) : null}
                </div>
              )
            }

            // lifecycle
            const b = item.ms !== null ? msBadge(item.ms) : null
            return (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                  <span className="text-[11px] font-mono text-gray-200">{item.label}</span>
                </div>
                {b && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${b.cls}`}>{b.label}</span>
                )}
              </div>
            )
          })}
        </div>

        {/* next arrow hint */}
        <div className="flex justify-end px-3 py-1.5 bg-[#0f0f0f] border-t border-[#1a1a1a]">
          <svg width="8" height="10" viewBox="0 0 8 10" fill="#444">
            <path d="M0 0l8 5-8 5V0z" />
          </svg>
        </div>
      </div>
    </div>
  )
}

// ── Real data → screen cards ──────────────────────────────────────────────────

function buildScreens(events: any[], apiEvents: any[]) {
  const timeline = [...events.map(e => ({ ...e, _kind: 'screen' })),
                    ...apiEvents.map(e => ({ ...e, _kind: 'api' }))]
    .sort((a, b) => a.timestamp - b.timestamp)

  const groups: typeof DEMO_SCREENS = []
  let current: typeof DEMO_SCREENS[0] | null = null
  const t0 = timeline[0]?.timestamp ?? 0

  timeline.forEach(e => {
    if (e._kind === 'screen' && e.eventType === 'RESUMED') {
      const idx = groups.length + 1
      current = {
        id:     `SCREEN_${String(idx).padStart(2, '0')}`,
        name:   (e.screenName ?? 'UNKNOWN').toUpperCase().replace(/\s+/g, '_'),
        offset: e.timestamp - t0,
        items:  [],
      }
      if (e.duration) {
        current.items.push({ kind: 'lifecycle', label: 'SCREEN_RESUME', ms: e.duration, indent: false })
      }
      groups.push(current)
    } else if (e._kind === 'api' && current) {
      const path = pathOf(e.url ?? '').toUpperCase()
      const isErr = !e.success || (e.responseCode ?? 200) >= 400
      current.items.push({
        kind: 'api',
        label: `${e.method ?? 'GET'} ${path}`,
        ms: e.duration ?? null,
        indent: false,
        error: isErr,
        errLabel: isErr ? (e.duration > 1000 ? 'TIMEOUT' : 'ERROR') : undefined,
      })
    } else if (e._kind === 'screen' && current) {
      current.items.push({
        kind: 'lifecycle',
        label: e.eventType ?? 'EVENT',
        ms: e.duration ?? null,
        indent: false,
      })
    }
  })

  return groups
}

// ── Main component ────────────────────────────────────────────────────────────

export function FlowTrace({ events, apiEvents }: Props) {
  const screens = useMemo(() => {
    const built = buildScreens(events, apiEvents)
    return built.length > 0 ? built : DEMO_SCREENS
  }, [events, apiEvents])

  const isDemo = events.length === 0 && apiEvents.length === 0

  const totalDuration = useMemo(() => {
    if (isDemo) return '12.4s'
    const all = [...events, ...apiEvents]
    if (all.length < 2) return '—'
    const span = Math.max(...all.map(e => e.timestamp)) - Math.min(...all.map(e => e.timestamp))
    return span < 1000 ? `${span}ms` : `${(span / 1000).toFixed(1)}s`
  }, [events, apiEvents, isDemo])

  const totalRequests = isDemo ? 42 : apiEvents.length

  const traceId = useMemo(() => {
    if (isDemo) return 'TRC-882-901-X'
    const h = Math.abs([...events, ...apiEvents].reduce((a, e) => a ^ e.timestamp, 0))
    return `TRC-${String(h).slice(0, 3)}-${String(h).slice(3, 6)}-X`
  }, [events, apiEvents, isDemo])

  const exportJSON = () => {
    const data = { traceId, screens: events, apiEvents }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${traceId}.json`
    a.click()
  }

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-112px)]">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">{traceId}</h1>
          <div className="text-[10px] font-mono text-gray-500 mt-1 tracking-widest">
            USER_JOURNEY_SESSION // CLIENT_ID: 0x2A9F
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border border-[#2a2a2a] rounded px-4 py-2">
            <span className="text-[9px] font-mono text-gray-500 tracking-widest">DURATION</span>
            <span className="text-sm font-mono font-bold text-white">{totalDuration}</span>
          </div>
          <div className="flex items-center gap-2 border border-[#2a2a2a] rounded px-4 py-2">
            <span className="text-[9px] font-mono text-gray-500 tracking-widest">REQUESTS</span>
            <span className="text-sm font-mono font-bold text-white">{totalRequests}</span>
          </div>
        </div>
      </div>

      {/* ── Scrollable screen cards ── */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex items-start gap-0 pb-4" style={{ minWidth: 'max-content' }}>
          {screens.map((s, i) => (
            <ScreenCard key={i} screen={s} isFirst={i === 0} />
          ))}
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="mt-auto pt-4 border-t border-[#1e1e1e] flex items-center justify-between">
        <div className="flex items-center gap-6 text-[10px] font-mono">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-gray-400">OPTIMAL (&lt;200ms)</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            <span className="text-gray-400">LATENT (200ms - 1s)</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-gray-400">CRITICAL (&gt;1s / ERROR)</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportJSON}
            className="px-5 py-2 border border-[#2a2a2a] text-[10px] font-mono font-bold text-gray-300 tracking-widest hover:border-gray-500 hover:text-white transition-colors rounded"
          >
            EXPORT JSON
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-[10px] font-mono font-bold text-gray-300 tracking-widest hover:border-gray-500 hover:text-white transition-colors rounded"
          >
            RERUN TRACE
          </button>
        </div>
      </div>

    </div>
  )
}
