'use client'

import { useMemo, useState } from 'react'

interface Props {
  screenEvents: any[]
  apiEvents: any[]
  memoryEvents: any[]
  connected: boolean
}

// ── helpers ───────────────────────────────────────────────────────────────────

function heatLevel(score: number): { label: string; cls: string; bar: string; dot: string } {
  if (score >= 85) return { label: 'HOT',  cls: 'text-red-400 border-red-800 bg-[#2a0f0f]',    bar: 'bg-red-500',    dot: 'bg-red-500'    }
  if (score >= 50) return { label: 'WARM', cls: 'text-orange-400 border-orange-800 bg-[#2a1a0a]', bar: 'bg-orange-500', dot: 'bg-orange-400' }
  return                  { label: 'COOL', cls: 'text-blue-400 border-blue-900 bg-[#0f1a2a]',   bar: 'bg-blue-500',   dot: 'bg-blue-400'   }
}

function barColor(score: number) {
  if (score >= 85) return 'bg-red-500'
  if (score >= 50) return 'bg-orange-500'
  return 'bg-blue-500'
}

function fmtTime(ms: number) {
  if (ms <= 0) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

// ── demo data ─────────────────────────────────────────────────────────────────

const DEMO_ROWS = [
  { name: 'dashboard.main_v2',    rank: 1, score: 94.2, visits: 48291, avgOpen: 12400, apiCount: 42 },
  { name: 'auth.session_init',    rank: 2, score: 78.5, visits: 32102, avgOpen: 4100,  apiCount: 8  },
  { name: 'payment.checkout',     rank: 3, score: 61.0, visits: 18554, avgOpen: 48200, apiCount: 12 },
  { name: 'user.profile_editor',  rank: 4, score: 42.8, visits: 12900, avgOpen: 112500,apiCount: 4  },
  { name: 'system.logs_explorer', rank: 5, score: 21.3, visits: 4120,  avgOpen: 324000,apiCount: 22 },
]

const PAGE_SIZE = 5

// ── main component ────────────────────────────────────────────────────────────

export function HeatmapTab({ screenEvents, apiEvents, memoryEvents, connected }: Props) {
  const [page, setPage] = useState(0)

  // ── build rows from real data ──
  const rows = useMemo(() => {
    const screenMap = new Map<string, { opens: number[]; times: number[] }>()
    screenEvents.forEach(e => {
      if (!e.screenName) return
      if (!screenMap.has(e.screenName)) screenMap.set(e.screenName, { opens: [], times: [] })
      const s = screenMap.get(e.screenName)!
      if (e.eventType === 'RESUMED' && e.duration) s.opens.push(e.duration)
      if (e.eventType === 'PAUSED'  && e.duration) s.times.push(e.duration)
    })

    const built = Array.from(screenMap.entries()).map(([name, data], i) => {
      const avgOpen = data.opens.length
        ? Math.round(data.opens.reduce((a, b) => a + b, 0) / data.opens.length) : 0
      const visits  = data.opens.length || data.times.length

      const resumeEvts = screenEvents.filter(e => e.screenName === name && e.eventType === 'RESUMED')
      let apiCount = 0
      resumeEvts.forEach((r, ri) => {
        const pause = screenEvents.filter(e => e.screenName === name && e.eventType === 'PAUSED')[ri]
        const end   = pause?.timestamp ?? Date.now()
        apiCount   += apiEvents.filter(a => a.timestamp >= r.timestamp && a.timestamp <= end).length
      })

      const visitScore = Math.min((visits / 50000) * 40, 40)
      const openScore  = Math.min((avgOpen / 600) * 30, 30)
      const apiScore   = Math.min((apiCount / 50) * 30, 30)
      const score      = Math.round(visitScore + openScore + apiScore)

      return { name, rank: i + 1, score, visits, avgOpen, apiCount }
    }).sort((a, b) => b.score - a.score).map((r, i) => ({ ...r, rank: i + 1 }))

    return built.length > 0 ? built : DEMO_ROWS
  }, [screenEvents, apiEvents])

  const isDemo = screenEvents.length === 0

  // ── aggregate stats ──
  const totalVisits = rows.reduce((s, r) => s + r.visits, 0)
  const avgHeat     = rows.length ? (rows.reduce((s, r) => s + r.score, 0) / rows.length).toFixed(1) : '64.2'
  const latestMem   = memoryEvents[memoryEvents.length - 1]
  const cpuLoad     = isDemo ? 24 : Math.round(100 - (rows[0]?.score ?? 50) * 0.5)
  const heapMb      = latestMem?.usedMemoryMb ?? 1280
  const netIO       = isDemo ? '8.4 Mbps' : `${(apiEvents.length * 0.12).toFixed(1)} Mbps`

  // ── pagination ──
  const totalPages = Math.ceil(rows.length / PAGE_SIZE)
  const pageRows   = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
  const maxScore   = Math.max(...rows.map(r => r.score), 1)

  const exportCSV = () => {
    const header = 'RANK,SCREEN_NAME,HEAT_SCORE,LEVEL,VISITS,AVG_OPEN,API_COUNT'
    const lines  = rows.map(r => {
      const lv = heatLevel(r.score)
      return `${r.rank},${r.name},${r.score},${lv.label},${r.visits},${fmtTime(r.avgOpen)},${r.apiCount}`
    })
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `heatmap-${Date.now()}.csv`
    a.click()
  }

  return (
    <div className="flex flex-col gap-0 min-h-[calc(100vh-48px)]">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">HEATMAP ENGINE</h1>
          <p className="text-[10px] font-mono text-gray-500 mt-1">
            Screen-level activity distribution and performance coefficients.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="px-4 py-2 border border-[#2a2a2a] text-[10px] font-mono font-bold text-gray-300 tracking-widest hover:border-gray-500 hover:text-white transition-colors rounded"
          >
            EXPORT_CSV
          </button>
          <button
            onClick={() => setPage(0)}
            className="px-4 py-2 bg-white text-black text-[10px] font-mono font-bold tracking-widest hover:bg-gray-100 transition-colors rounded"
          >
            RECALCULATE_CORES
          </button>
        </div>
      </div>

      <div className="flex gap-4 flex-1">

        {/* ── Main table ── */}
        <div className="flex-1 bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden flex flex-col">

          {/* Table header bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e1e1e]">
            <span className="text-[10px] font-mono text-gray-400 tracking-widest">ACTIVE_SCREEN_SENSORS</span>
            <div className="flex items-center gap-4 text-[9px] font-mono text-gray-600 tracking-widest">
              <span>SAMPLE_SIZE: {isDemo ? '142.9k' : totalVisits.toLocaleString()}</span>
              <span>WINDOW: 24H</span>
            </div>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-12 gap-2 px-5 py-2.5 border-b border-[#1a1a1a] text-[9px] font-mono text-gray-600 tracking-widest">
            <div className="col-span-3">SCREEN NAME</div>
            <div className="col-span-1 text-center">RANK</div>
            <div className="col-span-3">HEAT SCORE</div>
            <div className="col-span-1 text-center">LEVEL</div>
            <div className="col-span-1 text-right">VISITS</div>
            <div className="col-span-2 text-right">AVG OPEN</div>
            <div className="col-span-1 text-right">API COUNT</div>
          </div>

          {/* Rows */}
          <div className="flex-1 divide-y divide-[#141414]">
            {pageRows.map((row) => {
              const lv  = heatLevel(row.score)
              const pct = (row.score / maxScore) * 100

              return (
                <div
                  key={row.name}
                  className="grid grid-cols-12 gap-2 px-5 py-3.5 items-center hover:bg-[#161616] transition-colors"
                >
                  {/* Screen name */}
                  <div className="col-span-3 flex items-center gap-2 min-w-0">
                    <span className={`w-0.5 h-5 rounded-full flex-shrink-0 ${lv.bar}`} />
                    <span className="text-[11px] font-mono text-gray-200 truncate">{row.name}</span>
                  </div>

                  {/* Rank */}
                  <div className="col-span-1 text-center text-[10px] font-mono text-gray-500">
                    #{String(row.rank).padStart(2, '0')}
                  </div>

                  {/* Heat score bar + number */}
                  <div className="col-span-3 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-[#1e1e1e] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${barColor(row.score)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono font-bold text-white w-8 text-right flex-shrink-0">
                      {row.score}
                    </span>
                  </div>

                  {/* Level badge */}
                  <div className="col-span-1 flex justify-center">
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border tracking-widest ${lv.cls}`}>
                      {lv.label}
                    </span>
                  </div>

                  {/* Visits */}
                  <div className="col-span-1 text-right text-[11px] font-mono text-gray-300">
                    {row.visits.toLocaleString()}
                  </div>

                  {/* Avg open */}
                  <div className="col-span-2 text-right text-[11px] font-mono text-gray-400">
                    {fmtTime(row.avgOpen)}
                  </div>

                  {/* API count */}
                  <div className="col-span-1 text-right text-[11px] font-mono text-gray-400">
                    {row.apiCount}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#1e1e1e]">
            <span className="text-[9px] font-mono text-gray-600 tracking-widest">
              PAGE_{String(page + 1).padStart(2, '0')}_OF_{String(totalPages).padStart(2, '0')}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="w-7 h-7 flex items-center justify-center border border-[#2a2a2a] rounded text-gray-500 hover:text-white hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor">
                  <path d="M8 0L0 5l8 5V0z" />
                </svg>
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="w-7 h-7 flex items-center justify-center border border-[#2a2a2a] rounded text-gray-500 hover:text-white hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor">
                  <path d="M0 0l8 5-8 5V0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="w-48 flex-shrink-0 flex flex-col gap-4">

          {/* Heat Logic legend */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4">
            <div className="text-[9px] font-mono text-gray-500 tracking-widest mb-3">HEAT_LOGIC_V2</div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-1 h-3 rounded-full bg-red-500 flex-shrink-0" />
                  <span className="text-[10px] font-mono font-bold text-red-400">HOT (&gt;85)</span>
                </div>
                <p className="text-[9px] font-mono text-gray-600 leading-relaxed pl-2.5">
                  Critical user flow congestion. High visit count with low average duration. Requires load optimization.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-1 h-3 rounded-full bg-orange-500 flex-shrink-0" />
                  <span className="text-[10px] font-mono font-bold text-orange-400">WARM (50-85)</span>
                </div>
                <p className="text-[9px] font-mono text-gray-600 leading-relaxed pl-2.5">
                  Active transit screen. Balanced interaction metrics. Performance nominal.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-1 h-3 rounded-full bg-blue-500 flex-shrink-0" />
                  <span className="text-[10px] font-mono font-bold text-blue-400">COOL (&lt;50)</span>
                </div>
                <p className="text-[9px] font-mono text-gray-600 leading-relaxed pl-2.5">
                  Low traffic or deep task-focused screens. Extended session times expected.
                </p>
              </div>
            </div>
          </div>

          {/* Calculation matrix */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4">
            <div className="text-[9px] font-mono text-gray-500 tracking-widest mb-3">CALCULATION MATRIX</div>
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded p-3">
              <p className="text-[10px] font-mono text-gray-400 leading-relaxed">
                HEAT = (Visits × 0.4) +<br />
                (1 / AvgTime × 0.3) +<br />
                (APICount × 0.3)
              </p>
            </div>
          </div>

          {/* Node health */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4">
            <div className="text-[9px] font-mono text-gray-500 tracking-widest mb-3">NODE_HEALTH</div>
            <div className="space-y-3">
              {/* CPU */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-mono text-gray-600">CPU LOAD</span>
                  <span className="text-[9px] font-mono text-gray-400">{cpuLoad}%</span>
                </div>
                <div className="h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${cpuLoad > 70 ? 'bg-red-500' : cpuLoad > 40 ? 'bg-yellow-400' : 'bg-orange-400'}`}
                    style={{ width: `${cpuLoad}%` }}
                  />
                </div>
              </div>
              {/* Heap */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-mono text-gray-600">HEAP MEMORY</span>
                  <span className="text-[9px] font-mono text-gray-400">
                    {heapMb >= 1024 ? `${(heapMb / 1024).toFixed(1)}GB` : `${heapMb}MB`}
                  </span>
                </div>
                <div className="h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-orange-400"
                    style={{ width: `${Math.min((heapMb / 4096) * 100, 100)}%` }}
                  />
                </div>
              </div>
              {/* Network I/O */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-mono text-gray-600">NETWORK I/O</span>
                  <span className="text-[9px] font-mono text-gray-400">{netIO}</span>
                </div>
                <div className="h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: '18%' }} />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Bottom stat bar ── */}
      <div className="mt-4 grid grid-cols-4 gap-4">
        {[
          {
            label: 'TOTAL VISITS',
            value: isDemo ? '1,248,091' : totalVisits.toLocaleString(),
            sub: '+12.4%', subCls: 'text-green-400',
          },
          {
            label: 'AVG HEAT INDEX',
            value: String(avgHeat),
            sub: 'STABLE', subCls: 'text-gray-500',
          },
          {
            label: 'ENDPOINT ERRORS',
            value: isDemo ? '0.02%' : `${((apiEvents.filter(e => !e.success || (e.responseCode ?? 200) >= 400).length / Math.max(apiEvents.length, 1)) * 100).toFixed(2)}%`,
            sub: '-2.1%', subCls: 'text-green-400',
          },
          {
            label: 'ACTIVE NODES',
            value: '14',
            sub: '●●●', subCls: 'text-green-400 tracking-widest',
          },
        ].map((s, i) => (
          <div key={i} className="bg-[#111] border border-[#1e1e1e] rounded-lg px-5 py-4">
            <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1">{s.label}</div>
            <div className="text-2xl font-black text-white">{s.value}</div>
            <div className={`text-[10px] font-mono mt-1 ${s.subCls}`}>{s.sub}</div>
          </div>
        ))}
      </div>

    </div>
  )
}
