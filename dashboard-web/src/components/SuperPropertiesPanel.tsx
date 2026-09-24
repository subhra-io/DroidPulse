'use client'
import { useState, useEffect } from 'react'

const CLOUD_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function SuperPropertiesPanel({ projectId }: { projectId: string }) {
  const [props,   setProps]   = useState<Record<string, any>>({})
  const [newKey,  setNewKey]  = useState('')
  const [newVal,  setNewVal]  = useState('')
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('dp_token')}`,
  }

  const load = () => {
    fetch(`${CLOUD_API}/api/super-properties?projectId=${projectId}`, { headers })
      .then(r => r.json())
      .then(d => setProps(d.superProperties || {}))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [projectId])

  const add = async () => {
    if (!newKey.trim()) return
    setSaving(true)
    let parsed: any = newVal
    try { parsed = JSON.parse(newVal) } catch { parsed = newVal }
    await fetch(`${CLOUD_API}/api/super-properties?projectId=${projectId}`, {
      method: 'POST', headers, body: JSON.stringify({ properties: { [newKey]: parsed } })
    })
    setNewKey(''); setNewVal('')
    load()
    setSaving(false)
  }

  const remove = async (key: string) => {
    await fetch(`${CLOUD_API}/api/super-properties/${encodeURIComponent(key)}?projectId=${projectId}`, {
      method: 'DELETE', headers
    })
    load()
  }

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1e1e1e] flex items-center justify-between">
        <div>
          <div className="text-[10px] font-mono text-gray-400 tracking-widest">SUPER PROPERTIES</div>
          <div className="text-[9px] font-mono text-gray-600 mt-0.5">
            Auto-attached to every event — equivalent to Mixpanel registerSuperProperties()
          </div>
        </div>
        <span className="text-[9px] font-mono text-gray-600">
          {Object.keys(props).length} SET
        </span>
      </div>

      {/* Add new */}
      <div className="px-4 py-3 border-b border-[#1e1e1e] flex items-center gap-2">
        <input
          value={newKey}
          onChange={e => setNewKey(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-[10px] font-mono text-gray-300 placeholder-gray-700 outline-none focus:border-blue-800"
          placeholder="key (e.g. plan)"
        />
        <input
          value={newVal}
          onChange={e => setNewVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-[10px] font-mono text-gray-300 placeholder-gray-700 outline-none focus:border-blue-800"
          placeholder='value (e.g. "premium" or true or 42)'
        />
        <button
          onClick={add}
          disabled={saving || !newKey.trim()}
          className="text-[10px] font-mono font-bold tracking-widest text-blue-400 border border-blue-800 px-3 py-1.5 rounded hover:bg-blue-950 disabled:opacity-40 transition-colors"
        >
          {saving ? '...' : 'SET'}
        </button>
      </div>

      {/* Current props */}
      {loading ? (
        <div className="px-4 py-4 text-[10px] font-mono text-gray-700 tracking-widest">LOADING...</div>
      ) : Object.keys(props).length === 0 ? (
        <div className="px-4 py-4 text-[10px] font-mono text-gray-700 text-center">
          NO SUPER PROPERTIES SET
        </div>
      ) : (
        <div className="divide-y divide-[#141414]">
          {Object.entries(props).map(([k, v]) => (
            <div key={k} className="px-4 py-2.5 flex items-center justify-between hover:bg-[#161616] transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-[10px] font-mono text-blue-400 flex-shrink-0">{k}</span>
                <span className="text-gray-700 text-[9px]">→</span>
                <span className="text-[10px] font-mono text-gray-300 truncate">{JSON.stringify(v)}</span>
              </div>
              <button
                onClick={() => remove(k)}
                className="text-[9px] font-mono text-gray-700 hover:text-red-400 transition-colors ml-3 flex-shrink-0"
              >
                REMOVE
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
