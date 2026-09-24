'use client'
import { useState, useEffect } from 'react'

const CLOUD_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface CohortRow {
  cohort_date: string
  cohort_size: number
  day_1_pct:  number
  day_7_pct:  number
  day_14_pct: number
  day_30_pct: number
}
interface Overall {
  total_users:    number
  avg_day_1_pct:  number
  avg_day_7_pct:  number
  avg_day_14_pct: number
  avg_day_30_pct: number
}

const heatCls = (pct: number) => {
  if (pct >= 60) return 'bg-green-900 text-green-300'
  if (pct >= 40) return 'bg-green-950 text-green-400'
  if (pct >= 25) return 'bg-yellow-950 text-yellow-400'
  if (pct >= 10) return 'bg-orange-950 text-orange-400'
  if (pct >  0)  return 'bg-red-950 text-red-400'
  return 'bg-[#1a1a1a] text-gray-700'
}

export default function RetentionTab({ projectId }: { projectId: string }) {
  const [cohorts, setCohorts] = useState<CohortRow[]>([])
  const [overall, setOverall] = useState<Overall | null>(null)
  const [loading, setLoading] = useState(true)
  const [weeks,   setWeeks]   = useState(8)

  const load = () => {
    setLoading(true)
    const from = Date.now() - weeks * 7 * 24 * 60 * 60 * 1000
    fetch(`${CLOUD_API}/api/retention?from=${from}&limit=${weeks}&projectId=${projectId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('dp_token')}` }
    })
      .then(r => r.json())
      .then(d => { setCohorts(d.cohorts || []); setOverall(d.overall || null) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [projectId, weeks])

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-mono font-bold text-white tracking-widest">RETENTION</div>
          <div className="text-[10px] font-mono text-gray-500 mt-0.5">
            Day 1 / 7 / 14 / 30 cohort analysis
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={weeks}
            onChange={e => setWeeks(Number(e.target.value))}
            className="bg-[#161616] border border-[#2a2a2a] text-[10px] font-mono text-gray-400 rounded px-2 py-1.5 outline-none"
          >
            {[4, 8, 12, 16].map(w => (
              <option key={w} value={w}>{w} WEEKS</option>
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

      {/* Overall averages */}
      {overall && (
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: 'TOTAL USERS', value: overall.total_users?.toLocaleString() ?? '0',  color: 'text-white' },
            { label: 'DAY 1 AVG',   value: `${overall.avg_day_1_pct  ?? 0}%`, color: 'text-blue-400' },
            { label: 'DAY 7 AVG',   value: `${overall.avg_day_7_pct  ?? 0}%`, color: 'text-blue-400' },
            { label: 'DAY 14 AVG',  value: `${overall.avg_day_14_pct ?? 0}%`, color: 'text-blue-400' },
            { label: 'DAY 30 AVG',  value: `${overall.avg_day_30_pct ?? 0}%`, color: 'text-blue-400' },
          ].map(m => (
            <div key={m.label} className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4">
              <div className="text-[9px] font-mono text-gray-500 tracking-widest mb-1">{m.label}</div>
              <div className={`text-2xl font-black ${m.color}`}>{m.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Cohort heatmap table */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1e1e1e] flex items-center justify-between">
          <div className="text-[10px] font-mono text-gray-400 tracking-widest">COHORT HEATMAP</div>
          <div className="flex items-center gap-3 text-[9px] font-mono text-gray-600">
            {[
              { label: '≥60%', cls: 'bg-green-900' },
              { label: '40%',  cls: 'bg-green-950' },
              { label: '25%',  cls: 'bg-yellow-950' },
              { label: '10%',  cls: 'bg-orange-950' },
              { label: '<10%', cls: 'bg-red-950' },
            ].map(l => (
              <span key={l.label} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-sm ${l.cls}`} />
                {l.label}
              </span>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[10px] font-mono text-gray-700 tracking-widest">
            LOADING...
          </div>
        ) : cohorts.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-[10px] font-mono text-gray-600">
              NO DATA — call <span className="text-blue-400">DroidPulse.identify(userId)</span> to start tracking cohorts
            </div>
          </div>
        ) : (
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-[#1a1a1a]">
                {['COHORT DATE', 'USERS', 'DAY 1', 'DAY 7', 'DAY 14', 'DAY 30'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[9px] text-gray-600 tracking-widest font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141414]">
              {cohorts.map(row => (
                <tr key={row.cohort_date} className="hover:bg-[#161616] transition-colors">
                  <td className="px-4 py-3 text-gray-300">{row.cohort_date}</td>
                  <td className="px-4 py-3 text-gray-400">{row.cohort_size.toLocaleString()}</td>
                  {[row.day_1_pct, row.day_7_pct, row.day_14_pct, row.day_30_pct].map((pct, i) => (
                    <td key={i} className="px-4 py-3">
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${heatCls(pct ?? 0)}`}>
                        {pct ?? 0}%
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}
