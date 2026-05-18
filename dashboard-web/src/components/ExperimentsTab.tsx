'use client'
import { useState, useEffect } from 'react'

const CLOUD_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Variant  { name: string; weight: number; description?: string }
interface Experiment {
  id: string; name: string; description?: string; status: string
  variants: Variant[]; total_assigned: number; created_at: number
}
interface VResult {
  variant: string; users: number; eventCount: number
  totalRevenue: number; avgPerfScore: number; avgStartupMs: number
  avgFps: number; crashes: number; conversionRate: number
}
interface Significance {
  zScore: number; significant: boolean; confidence: number | null; lift: number | null
}

const STATUS_CLS: Record<string, string> = {
  draft:     'bg-[#1a1a1a] text-gray-500 border border-[#2a2a2a]',
  running:   'bg-green-950 text-green-400 border border-green-900',
  paused:    'bg-yellow-950 text-yellow-400 border border-yellow-900',
  completed: 'bg-blue-950 text-blue-400 border border-blue-900',
}

export default function ExperimentsTab({ projectId }: { projectId: string }) {
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [selected,    setSelected]    = useState<string | null>(null)
  const [results,     setResults]     = useState<{ results: VResult[]; significance: Significance | null; totalUsers: number } | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [creating,    setCreating]    = useState(false)
  const [form, setForm] = useState({
    name: '', description: '',
    variants: [
      { name: 'control',   weight: 50, description: '' },
      { name: 'treatment', weight: 50, description: '' },
    ]
  })

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('dp_token')}`,
  }

  const load = () => {
    setLoading(true)
    fetch(`${CLOUD_API}/api/experiments?projectId=${projectId}`, { headers })
      .then(r => r.json())
      .then(d => setExperiments(d.experiments || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [projectId])

  const loadResults = (id: string) => {
    setSelected(id)
    fetch(`${CLOUD_API}/api/experiments/${id}/results?projectId=${projectId}`, { headers })
      .then(r => r.json())
      .then(d => setResults(d))
  }

  const updateStatus = async (id: string, status: string) => {
    await fetch(`${CLOUD_API}/api/experiments/${id}?projectId=${projectId}`, {
      method: 'PATCH', headers, body: JSON.stringify({ status })
    })
    load()
    if (selected === id) loadResults(id)
  }

  const create = async () => {
    const total = form.variants.reduce((s, v) => s + v.weight, 0)
    if (total !== 100) { alert('Variant weights must sum to 100'); return }
    if (!form.name.trim()) { alert('Name required'); return }
    await fetch(`${CLOUD_API}/api/experiments?projectId=${projectId}`, {
      method: 'POST', headers, body: JSON.stringify({ ...form, projectId })
    })
    setCreating(false)
    setForm({ name: '', description: '', variants: [{ name: 'control', weight: 50, description: '' }, { name: 'treatment', weight: 50, description: '' }] })
    load()
  }

  const totalWeight = form.variants.reduce((s, v) => s + v.weight, 0)

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-mono font-bold text-white tracking-widest">A/B EXPERIMENTS</div>
          <div className="text-[10px] font-mono text-gray-500 mt-0.5">
            Create experiments · assign users · measure results with performance impact
          </div>
        </div>
        <button
          onClick={() => setCreating(c => !c)}
          className="text-[10px] font-mono font-bold tracking-widest text-blue-400 border border-blue-800 px-3 py-1.5 rounded hover:bg-blue-950 transition-colors"
        >
          {creating ? 'CANCEL' : '+ NEW EXPERIMENT'}
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="bg-[#111] border border-blue-900 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1e1e1e] text-[10px] font-mono text-gray-400 tracking-widest">
            NEW EXPERIMENT
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1.5">NAME</div>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-[10px] font-mono text-gray-300 placeholder-gray-700 outline-none focus:border-blue-800"
                  placeholder="checkout_redesign"
                />
              </div>
              <div>
                <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1.5">DESCRIPTION</div>
                <input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-[10px] font-mono text-gray-300 placeholder-gray-700 outline-none focus:border-blue-800"
                  placeholder="Optional description"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[9px] font-mono text-gray-600 tracking-widest">
                  VARIANTS — weights must sum to 100 (current: {totalWeight})
                </div>
                <button
                  onClick={() => setForm(f => ({ ...f, variants: [...f.variants, { name: '', weight: 0, description: '' }] }))}
                  className="text-[9px] font-mono text-blue-400 hover:text-blue-300"
                >
                  + ADD VARIANT
                </button>
              </div>
              <div className="space-y-2">
                {form.variants.map((v, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={v.name}
                      onChange={e => setForm(f => { const vs = [...f.variants]; vs[i] = { ...vs[i], name: e.target.value }; return { ...f, variants: vs } })}
                      className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-[10px] font-mono text-gray-300 placeholder-gray-700 outline-none"
                      placeholder="Variant name"
                    />
                    <input
                      type="number" value={v.weight} min={1} max={99}
                      onChange={e => setForm(f => { const vs = [...f.variants]; vs[i] = { ...vs[i], weight: Number(e.target.value) }; return { ...f, variants: vs } })}
                      className="w-16 bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-[10px] font-mono text-gray-300 outline-none text-center"
                    />
                    <span className="text-[9px] font-mono text-gray-600">%</span>
                    {form.variants.length > 2 && (
                      <button
                        onClick={() => setForm(f => ({ ...f, variants: f.variants.filter((_, j) => j !== i) }))}
                        className="text-gray-700 hover:text-red-400 text-[10px] font-mono"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={create}
                className="px-4 py-1.5 text-[10px] font-mono font-bold tracking-widest text-blue-400 border border-blue-800 rounded hover:bg-blue-950 transition-colors"
              >
                CREATE
              </button>
              <button
                onClick={() => setCreating(false)}
                className="px-4 py-1.5 text-[10px] font-mono text-gray-500 border border-[#2a2a2a] rounded hover:text-gray-300 transition-colors"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Experiment list */}
      {loading ? (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-8 text-center">
          <div className="text-[10px] font-mono text-gray-700 tracking-widest">LOADING...</div>
        </div>
      ) : experiments.length === 0 ? (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-8 text-center">
          <div className="text-[10px] font-mono text-gray-600">
            NO EXPERIMENTS — create your first A/B test above
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {experiments.map(exp => (
            <div key={exp.id} className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">

              {/* Experiment row */}
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${STATUS_CLS[exp.status] || STATUS_CLS.draft}`}>
                    {exp.status.toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-mono font-bold text-white truncate">{exp.name}</div>
                    {exp.description && (
                      <div className="text-[9px] font-mono text-gray-600 truncate">{exp.description}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-[9px] font-mono text-gray-600">
                    {(exp.total_assigned || 0).toLocaleString()} USERS
                  </span>
                  <div className="flex items-center gap-1">
                    {exp.status === 'draft'     && <button onClick={() => updateStatus(exp.id, 'running')}   className="px-2.5 py-1 text-[9px] font-mono font-bold text-green-400 border border-green-900 rounded hover:bg-green-950 transition-colors">START</button>}
                    {exp.status === 'running'   && <button onClick={() => updateStatus(exp.id, 'paused')}    className="px-2.5 py-1 text-[9px] font-mono font-bold text-yellow-400 border border-yellow-900 rounded hover:bg-yellow-950 transition-colors">PAUSE</button>}
                    {exp.status === 'paused'    && <button onClick={() => updateStatus(exp.id, 'running')}   className="px-2.5 py-1 text-[9px] font-mono font-bold text-green-400 border border-green-900 rounded hover:bg-green-950 transition-colors">RESUME</button>}
                    {exp.status !== 'completed' && <button onClick={() => updateStatus(exp.id, 'completed')} className="px-2.5 py-1 text-[9px] font-mono font-bold text-blue-400 border border-blue-900 rounded hover:bg-blue-950 transition-colors">COMPLETE</button>}
                    <button
                      onClick={() => selected === exp.id ? setSelected(null) : loadResults(exp.id)}
                      className={`px-2.5 py-1 text-[9px] font-mono font-bold rounded transition-colors ${
                        selected === exp.id
                          ? 'bg-[#1a2a3a] text-blue-400 border border-blue-900'
                          : 'text-gray-500 border border-[#2a2a2a] hover:text-gray-300'
                      }`}
                    >
                      RESULTS
                    </button>
                  </div>
                </div>
              </div>

              {/* Variant pills */}
              <div className="px-4 pb-3 flex items-center gap-2">
                {exp.variants.map(v => (
                  <span key={v.name} className="text-[9px] font-mono text-gray-600 bg-[#0d0d0d] border border-[#1e1e1e] px-2 py-0.5 rounded">
                    {v.name} · {v.weight}%
                  </span>
                ))}
              </div>

              {/* Results panel */}
              {selected === exp.id && results && (
                <div className="border-t border-[#1e1e1e]">

                  {/* Significance banner */}
                  {results.significance && (
                    <div className={`px-4 py-2.5 text-[10px] font-mono border-b border-[#1e1e1e] ${
                      results.significance.significant
                        ? 'bg-green-950/30 text-green-400'
                        : 'bg-[#0d0d0d] text-gray-500'
                    }`}>
                      {results.significance.significant
                        ? `✓ SIGNIFICANT at ${results.significance.confidence}% confidence — lift: ${results.significance.lift}%`
                        : `⏳ NOT YET SIGNIFICANT (z=${results.significance.zScore}) — collect more data`}
                    </div>
                  )}

                  {/* Results table */}
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="border-b border-[#1a1a1a]">
                        {['VARIANT','USERS','CONVERSION','REVENUE','PERF SCORE','STARTUP','FPS','CRASHES'].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-[9px] text-gray-600 tracking-widest font-normal whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#141414]">
                      {results.results.map((r, i) => (
                        <tr key={r.variant} className={`hover:bg-[#161616] transition-colors ${i === 0 ? '' : 'text-white'}`}>
                          <td className="px-4 py-2.5 text-gray-300">
                            {r.variant}
                            {i === 0 && <span className="text-[9px] text-gray-600 ml-1">(control)</span>}
                          </td>
                          <td className="px-4 py-2.5 text-gray-400">{r.users.toLocaleString()}</td>
                          <td className="px-4 py-2.5">
                            <span className={i > 0 && r.conversionRate > (results.results[0]?.conversionRate ?? 0) ? 'text-green-400' : 'text-gray-300'}>
                              {r.conversionRate}%
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-300">${r.totalRevenue.toFixed(2)}</td>
                          <td className="px-4 py-2.5">
                            <span className={r.avgPerfScore >= 85 ? 'text-green-400' : r.avgPerfScore >= 70 ? 'text-blue-400' : r.avgPerfScore >= 50 ? 'text-yellow-400' : 'text-red-400'}>
                              {r.avgPerfScore}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-400">{r.avgStartupMs}ms</td>
                          <td className="px-4 py-2.5 text-gray-400">{r.avgFps}</td>
                          <td className="px-4 py-2.5">
                            <span className={r.crashes > 0 ? 'text-red-400 font-bold' : 'text-gray-600'}>
                              {r.crashes}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
