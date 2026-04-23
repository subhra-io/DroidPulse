'use client'

import { useState } from 'react'
import { useSessionHistory, SessionRecord } from '@/hooks/useSessionHistory'

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDate(ts: number) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
}

function fmtDuration(start: number, end: number | null) {
  if (!start || !end) return '—'
  const ms = end - start
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

function buildTypeCls(t: string) {
  if (t === 'release') return 'bg-[#0f2a1a] text-green-400 border border-green-900'
  if (t === 'debug')   return 'bg-[#1a1a2a] text-blue-400 border border-blue-900'
  return 'bg-[#1a1a1a] text-gray-500 border border-gray-800'
}

function eventTypeSummary(events: any[]) {
  const counts: Record<string, number> = {}
  events.forEach(e => { counts[e.type] = (counts[e.type] ?? 0) + 1 })
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
}

const TYPE_CLS: Record<string, string> = {
  lifecycle: 'bg-blue-900/40 text-blue-300',
  network:   'bg-green-900/40 text-green-300',
  memory:    'bg-purple-900/40 text-purple-300',
  fps:       'bg-orange-900/40 text-orange-300',
  crash:     'bg-red-900/40 text-red-300',
  startup:   'bg-yellow-900/40 text-yellow-300',
  database:  'bg-cyan-900/40 text-cyan-300',
}

// ── Session detail drawer ─────────────────────────────────────────────────────

function SessionDrawer({
  session, onClose, onExport,
}: {
  session: SessionRecord
  onClose: () => void
  onExport: (id: string, fmt: 'json' | 'csv') => void
}) {
  const { fetchEvents } = useSessionHistory()
  const [events, setEvents]   = useState<any[]>([])
  const [loaded, setLoaded]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const load = async () => {
    if (loaded) return
    setLoading(true)
    const evts = await fetchEvents(session.id)
    setEvents(evts)
    setLoaded(true)
    setLoading(false)
  }

  // auto-load on mount
  if (!loaded && !loading) load()

  const types = ['all', ...Array.from(new Set(events.map(e => e.type)))]
  const filtered = typeFilter === 'all' ? events : events.filter(e => e.type === typeFilter)

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* backdrop */}
      <div className="flex-1 bg-black/60" onClick={onClose} />

      {/* drawer */}
      <div className="w-[600px] bg-[#0d0d0d] border-l border-[#1e1e1e] flex flex-col h-full overflow-hidden">

        {/* header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-[#1e1e1e]">
          <div>
            <div className="text-[10px] font-mono text-gray-600 tracking-widest mb-1">SESSION_DETAIL</div>
            <div className="text-sm font-mono font-bold text-white">{session.id.slice(0, 16)}…</div>
            <div className="text-[10px] font-mono text-gray-500 mt-0.5">
              {fmtDate(session.started_at)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onExport(session.id, 'json')}
              className="px-3 py-1.5 text-[9px] font-mono font-bold tracking-widest border border-[#2a2a2a] text-gray-400 hover:text-white hover:border-gray-500 rounded transition-colors"
            >
              JSON
            </button>
            <button
              onClick={() => onExport(session.id, 'csv')}
              className="px-3 py-1.5 text-[9px] font-mono font-bold tracking-widest border border-[#2a2a2a] text-gray-400 hover:text-white hover:border-gray-500 rounded transition-colors"
            >
              CSV
            </button>
            <button onClick={onClose} className="ml-2 text-gray-600 hover:text-white transition-colors">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="3" y1="3" x2="13" y2="13" /><line x1="13" y1="3" x2="3" y2="13" />
              </svg>
            </button>
          </div>
        </div>

        {/* meta grid */}
        <div className="grid grid-cols-3 gap-3 px-6 py-4 border-b border-[#1e1e1e]">
          {[
            { label: 'DEVICE',    value: session.device_model ?? '—' },
            { label: 'VERSION',   value: session.app_version  ?? '—' },
            { label: 'OS',        value: session.os_version   ?? '—' },
            { label: 'EVENTS',    value: String(session.event_count ?? 0) },
            { label: 'CRASHES',   value: String(session.crash_count ?? 0) },
            { label: 'STARTUP',   value: session.startup_ms ? `${session.startup_ms}ms` : '—' },
          ].map((m, i) => (
            <div key={i} className="bg-[#111] border border-[#1e1e1e] rounded p-3">
              <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1">{m.label}</div>
              <div className="text-xs font-mono font-bold text-white truncate">{m.value}</div>
            </div>
          ))}
        </div>

        {/* event type filter */}
        <div className="flex items-center gap-1.5 px-6 py-3 border-b border-[#1e1e1e] overflow-x-auto">
          {types.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`flex-shrink-0 px-2.5 py-1 text-[9px] font-mono font-bold rounded tracking-widest transition-colors ${
                typeFilter === t
                  ? 'bg-[#1a2a3a] text-blue-400 border border-blue-900'
                  : 'text-gray-600 hover:text-gray-400 border border-transparent'
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* event list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-[10px] font-mono text-gray-600 tracking-widest">
              LOADING EVENTS…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-[10px] font-mono text-gray-700 tracking-widest">
              NO EVENTS
            </div>
          ) : (
            <div className="divide-y divide-[#141414]">
              {filtered.map((e, i) => (
                <div key={i} className="px-6 py-2.5 hover:bg-[#111] transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${TYPE_CLS[e.type] ?? 'bg-gray-900 text-gray-400'}`}>
                      {e.type}
                    </span>
                    <span className="text-[10px] font-mono text-gray-600 ml-auto">
                      {new Date(e.timestamp).toLocaleTimeString('en-GB', { hour12: false, fractionalSecondDigits: 3 })}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-gray-400 truncate">
                    {e.screenName ?? e.url ?? e.message ?? e.query ?? JSON.stringify(e).slice(0, 80)}
                  </div>
                  {e.duration && (
                    <div className={`text-[9px] font-mono mt-0.5 ${e.duration > 1000 ? 'text-red-400' : e.duration > 300 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {e.duration}ms
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function SessionHistoryTab() {
  const {
    sessions, total, loading,
    page, setPage, PAGE_SIZE,
    refresh, exportSession, deleteSession,
  } = useSessionHistory()

  const [selected, setSelected]   = useState<SessionRecord | null>(null)
  const [search, setSearch]       = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const filtered = sessions.filter(s =>
    !search ||
    s.id.includes(search) ||
    (s.device_model ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.app_version  ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">

      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">SESSION HISTORY</h1>
          <p className="text-[10px] font-mono text-gray-500 mt-1">
            Every recorded session — {total.toLocaleString()} total
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* search */}
          <div className="flex items-center gap-2 bg-[#161616] border border-[#2a2a2a] rounded px-3 py-1.5">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#555" strokeWidth="1.5">
              <circle cx="5" cy="5" r="3.5" /><line x1="8" y1="8" x2="11" y2="11" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-[10px] font-mono text-gray-400 placeholder-gray-700 outline-none w-36"
              placeholder="SEARCH SESSION / DEVICE…"
            />
          </div>
          <button
            onClick={refresh}
            className="px-4 py-2 border border-[#2a2a2a] text-[10px] font-mono font-bold text-gray-400 tracking-widest hover:text-white hover:border-gray-500 rounded transition-colors"
          >
            REFRESH
          </button>
        </div>
      </div>

      {/* table */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-[#1a1a1a]">
              {['SESSION ID','STARTED','DEVICE','VERSION','BUILD','EVENTS','CRASHES','STARTUP','DURATION','ACTIONS'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-[9px] text-gray-600 tracking-widest font-normal whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-[10px] font-mono text-gray-700 tracking-widest">
                  LOADING…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-[10px] font-mono text-gray-700 tracking-widest">
                  NO SESSIONS FOUND
                </td>
              </tr>
            )}
            {filtered.map((s, i) => (
              <tr
                key={s.id}
                className="border-b border-[#141414] hover:bg-[#161616] transition-colors cursor-pointer"
                onClick={() => setSelected(s)}
              >
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                  {s.id.slice(0, 12)}…
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {fmtDate(s.started_at)}
                </td>
                <td className="px-4 py-3 text-gray-300 max-w-[120px] truncate">
                  {s.device_model ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {s.app_version ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${buildTypeCls(s.build_type)}`}>
                    {(s.build_type ?? 'unknown').toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {(s.event_count ?? 0).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span className={s.crash_count > 0 ? 'text-red-400 font-bold' : 'text-gray-600'}>
                    {s.crash_count ?? 0}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {s.startup_ms ? `${s.startup_ms}ms` : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {fmtDuration(s.started_at, s.ended_at)}
                </td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => exportSession(s.id, 'json')}
                      title="Export JSON"
                      className="p-1.5 text-gray-600 hover:text-blue-400 transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M6 1v7M3 5l3 3 3-3" /><path d="M1 9v1.5a.5.5 0 00.5.5h9a.5.5 0 00.5-.5V9" />
                      </svg>
                    </button>
                    <button
                      onClick={() => exportSession(s.id, 'csv')}
                      title="Export CSV"
                      className="p-1.5 text-gray-600 hover:text-green-400 transition-colors text-[9px] font-mono font-bold"
                    >
                      CSV
                    </button>
                    <button
                      onClick={() => setConfirmDel(s.id)}
                      title="Delete"
                      className="p-1.5 text-gray-700 hover:text-red-400 transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M2 3h8M5 3V2h2v1M4 3v6h4V3" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#1e1e1e]">
            <span className="text-[9px] font-mono text-gray-600 tracking-widest">
              PAGE {page + 1} OF {totalPages} — {total} SESSIONS
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="w-7 h-7 flex items-center justify-center border border-[#2a2a2a] rounded text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor"><path d="M8 0L0 5l8 5V0z" /></svg>
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="w-7 h-7 flex items-center justify-center border border-[#2a2a2a] rounded text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor"><path d="M0 0l8 5-8 5V0z" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* delete confirm */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-6 w-80">
            <div className="text-[10px] font-mono text-gray-500 tracking-widest mb-3">CONFIRM DELETE</div>
            <p className="text-sm text-gray-300 mb-4">
              Delete session <span className="font-mono text-white">{confirmDel.slice(0, 12)}…</span>?
              This removes all events and cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { deleteSession(confirmDel); setConfirmDel(null) }}
                className="flex-1 py-2 bg-red-900 border border-red-700 text-red-300 text-[10px] font-mono font-bold tracking-widest rounded hover:bg-red-800 transition-colors"
              >
                DELETE
              </button>
              <button
                onClick={() => setConfirmDel(null)}
                className="flex-1 py-2 border border-[#2a2a2a] text-gray-400 text-[10px] font-mono font-bold tracking-widest rounded hover:text-white transition-colors"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* session detail drawer */}
      {selected && (
        <SessionDrawer
          session={selected}
          onClose={() => setSelected(null)}
          onExport={exportSession}
        />
      )}
    </div>
  )
}
