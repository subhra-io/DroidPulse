'use client'
import { useState, useEffect } from 'react'

const CLOUD_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Transition { from: string; to: string; count: number; avgMs: number }
interface SankeyLink  { source: string; target: string; value: number }
interface SankeyNode  { name: string }

export default function UserPathsTab({ projectId }: { projectId: string }) {
  const [view,        setView]        = useState<'top'|'from'|'sankey'>('top')
  const [transitions, setTransitions] = useState<Transition[]>([])
  const [sankey,      setSankey]      = useState<{ nodes: SankeyNode[]; links: SankeyLink[] } | null>(null)
  const [startEvent,  setStartEvent]  = useState('session_start')
  const [loading,     setLoading]     = useState(false)

  const headers = { Authorization: `Bearer ${localStorage.getItem('dp_token')}` }

  const loadTop = () => {
    setLoading(true)
    fetch(`${CLOUD_API}/api/paths/top?projectId=${projectId}&limit=30`, { headers })
      .then(r => r.json())
      .then(d => setTransitions(d.transitions || []))
      .finally(() => setLoading(false))
  }

  const loadFrom = () => {
    setLoading(true)
    fetch(`${CLOUD_API}/api/paths/from/${encodeURIComponent(startEvent)}?projectId=${projectId}&depth=3`, { headers })
      .then(r => r.json())
      .then(d => setTransitions(d.paths || []))
      .finally(() => setLoading(false))
  }

  const loadSankey = () => {
    setLoading(true)
    fetch(`${CLOUD_API}/api/paths/sankey?projectId=${projectId}&limit=40`, { headers })
      .then(r => r.json())
      .then(d => setSankey(d))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (view === 'top')    loadTop()
    if (view === 'from')   loadFrom()
    if (view === 'sankey') loadSankey()
  }, [view, projectId])

  const maxCount = transitions.length > 0 ? Math.max(...transitions.map(t => t.count)) : 1

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-mono font-bold text-white tracking-widest">USER PATHS</div>
          <div className="text-[10px] font-mono text-gray-500 mt-0.5">
            Actual event sequences users navigate — equivalent to Mixpanel Flows
          </div>
        </div>
        <button
          onClick={() => view === 'top' ? loadTop() : view === 'from' ? loadFrom() : loadSankey()}
          className="text-[10px] font-mono text-gray-500 hover:text-gray-300 border border-[#2a2a2a] px-3 py-1.5 rounded transition-colors"
        >
          {loading ? 'LOADING...' : 'REFRESH'}
        </button>
      </div>

      {/* View tabs */}
      <div className="flex items-center gap-1">
        {(['top','from','sankey'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1.5 text-[10px] font-mono font-bold tracking-widest rounded transition-colors ${
              view === v
                ? 'bg-[#1a2a3a] text-blue-400 border border-blue-900'
                : 'text-gray-600 hover:text-gray-400 border border-transparent'
            }`}
          >
            {v === 'top' ? 'TOP TRANSITIONS' : v === 'from' ? 'PATHS FROM EVENT' : 'FLOW MAP'}
          </button>
        ))}
      </div>

      {/* From-event input */}
      {view === 'from' && (
        <div className="flex items-center gap-2">
          <input
            value={startEvent}
            onChange={e => setStartEvent(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadFrom()}
            className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-[10px] font-mono text-gray-300 placeholder-gray-700 outline-none focus:border-blue-800"
            placeholder="Starting event name…"
          />
          <button
            onClick={loadFrom}
            className="text-[10px] font-mono font-bold tracking-widest text-blue-400 border border-blue-800 px-3 py-1.5 rounded hover:bg-blue-950 transition-colors"
          >
            TRACE
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-8 text-center">
          <div className="text-[10px] font-mono text-gray-700 tracking-widest">LOADING...</div>
        </div>

      ) : view === 'sankey' && sankey ? (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1e1e1e] flex items-center justify-between">
            <div className="text-[10px] font-mono text-gray-400 tracking-widest">
              FLOW MAP — {sankey.links.length} TRANSITIONS · {sankey.nodes.length} EVENTS
            </div>
          </div>
          <div className="p-4 space-y-1.5 max-h-[500px] overflow-y-auto">
            {sankey.links.map((link, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[9px] font-mono text-blue-400 w-40 truncate text-right flex-shrink-0">
                  {link.source}
                </span>
                <div className="flex-1 relative h-5 bg-[#0d0d0d] border border-[#1e1e1e] rounded overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-blue-900/60 rounded"
                    style={{ width: `${Math.max(4, (link.value / (sankey.links[0]?.value || 1)) * 100)}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono text-gray-300">
                    {link.value.toLocaleString()}
                  </span>
                </div>
                <span className="text-[9px] font-mono text-cyan-400 w-40 truncate flex-shrink-0">
                  {link.target}
                </span>
              </div>
            ))}
          </div>
        </div>

      ) : transitions.length === 0 ? (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-8 text-center">
          <div className="text-[10px] font-mono text-gray-600">
            NO PATH DATA — recorded automatically as users trigger analytics events
          </div>
        </div>

      ) : (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1e1e1e] text-[10px] font-mono text-gray-400 tracking-widest">
            {view === 'top'
              ? `TOP ${transitions.length} EVENT TRANSITIONS`
              : `PATHS FROM "${startEvent}" — ${transitions.length} ROUTES`}
          </div>
          <div className="divide-y divide-[#141414] max-h-[500px] overflow-y-auto">
            {transitions.map((t, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center gap-4 hover:bg-[#161616] transition-colors">
                <span className="text-[9px] font-mono text-gray-700 w-5 text-right flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-mono text-blue-400 truncate max-w-[180px]">{t.from}</span>
                  <span className="text-gray-700 text-[9px] flex-shrink-0">→</span>
                  <span className="text-[10px] font-mono text-cyan-400 truncate max-w-[180px]">{t.to}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="w-20 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${(t.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-white w-10 text-right">
                    {t.count.toLocaleString()}
                  </span>
                  {t.avgMs > 0 && (
                    <span className={`text-[9px] font-mono w-14 text-right ${
                      t.avgMs > 2000 ? 'text-red-400' : t.avgMs > 500 ? 'text-yellow-400' : 'text-gray-600'
                    }`}>
                      {Math.round(t.avgMs)}ms
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
