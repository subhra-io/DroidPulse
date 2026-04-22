'use client'

import { useState } from 'react'

interface VersionMetrics {
  version: string
  sessions: number
  avgFps: number
  avgStartupMs: number
  avgMemoryMb: number
  avgApiMs: number
  crashCount: number
}

interface CompareResult {
  v1: VersionMetrics
  v2: VersionMetrics
  regressions: { metric: string; v1: number; v2: number; change: number }[]
  improvements: { metric: string; v1: number; v2: number; change: number }[]
}

interface Props {
  apiKey?: string
  apiEndpoint?: string
}

function MetricRow({ label, v1, v2, unit, higherIsBetter }: {
  label: string; v1: number; v2: number; unit: string; higherIsBetter: boolean
}) {
  const change = v1 > 0 ? ((v2 - v1) / v1) * 100 : 0
  const isRegression  = higherIsBetter ? change < -10 : change > 10
  const isImprovement = higherIsBetter ? change > 5   : change < -5

  return (
    <div className="flex items-center gap-3 py-2 border-b border-dark-border">
      <span className="text-sm text-gray-400 w-28 flex-shrink-0">{label}</span>
      <span className="text-sm font-mono text-gray-300 w-20 text-right">{v1}{unit}</span>
      <span className="text-gray-600">→</span>
      <span className={`text-sm font-mono font-bold w-20 text-right ${
        isRegression ? 'text-red-400' : isImprovement ? 'text-green-400' : 'text-gray-300'
      }`}>{v2}{unit}</span>
      <span className={`text-xs px-2 py-0.5 rounded ml-auto ${
        isRegression  ? 'bg-red-900 text-red-300' :
        isImprovement ? 'bg-green-900 text-green-300' :
        'bg-dark-bg text-gray-500'
      }`}>
        {change > 0 ? '+' : ''}{change.toFixed(1)}%
        {isRegression ? ' ⚠️' : isImprovement ? ' ✅' : ''}
      </span>
    </div>
  )
}

export function VersionCompare({ apiKey, apiEndpoint = 'http://localhost:3001' }: Props) {
  const [v1, setV1] = useState('')
  const [v2, setV2] = useState('')
  const [result, setResult] = useState<CompareResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const compare = async () => {
    if (!v1 || !v2 || !apiKey) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(
        `${apiEndpoint}/api/compare?v1=${v1}&v2=${v2}`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      )
      if (!res.ok) throw new Error(await res.text())
      setResult(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">📊 Version Comparison</h2>
        <p className="text-xs text-gray-500 mt-0.5">Compare performance between app versions</p>
      </div>

      {/* Input */}
      <div className="flex gap-3 mb-4">
        <input
          value={v1}
          onChange={e => setV1(e.target.value)}
          placeholder="Baseline (e.g. 1.2)"
          className="flex-1 bg-dark-bg border border-dark-border rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
        />
        <span className="text-gray-500 self-center">vs</span>
        <input
          value={v2}
          onChange={e => setV2(e.target.value)}
          placeholder="Current (e.g. 1.3)"
          className="flex-1 bg-dark-bg border border-dark-border rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={compare}
          disabled={!v1 || !v2 || !apiKey || loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
        >
          {loading ? '...' : 'Compare'}
        </button>
      </div>

      {!apiKey && (
        <div className="text-xs text-yellow-400 bg-yellow-950/30 border border-yellow-800 rounded p-3 mb-4">
          ⚠️ Cloud API key required. Add to DroidPulseConfig:
          <div className="font-mono mt-1 text-yellow-300">
            {`cloud = CloudConfig(apiKey = "dp_live_...", projectId = "...")`}
          </div>
        </div>
      )}

      {error && (
        <div className="text-xs text-red-400 bg-red-950/30 border border-red-800 rounded p-3 mb-4">
          ❌ {error}
        </div>
      )}

      {result && (
        <div>
          {/* Regression/Improvement summary */}
          {result.regressions.length > 0 && (
            <div className="mb-4 p-3 bg-red-950/30 border border-red-800 rounded-lg">
              <div className="text-red-300 font-medium text-sm mb-2">
                ⚠️ {result.regressions.length} Regression{result.regressions.length > 1 ? 's' : ''} Detected
              </div>
              {result.regressions.map((r, i) => (
                <div key={i} className="text-xs text-red-400">
                  • {r.metric}: {r.v1} → {r.v2} ({r.change > 0 ? '+' : ''}{r.change}%)
                </div>
              ))}
            </div>
          )}

          {result.improvements.length > 0 && (
            <div className="mb-4 p-3 bg-green-950/30 border border-green-800 rounded-lg">
              <div className="text-green-300 font-medium text-sm mb-2">
                ✅ {result.improvements.length} Improvement{result.improvements.length > 1 ? 's' : ''}
              </div>
              {result.improvements.map((r, i) => (
                <div key={i} className="text-xs text-green-400">
                  • {r.metric}: {r.v1} → {r.v2} ({r.change > 0 ? '+' : ''}{r.change}%)
                </div>
              ))}
            </div>
          )}

          {/* Metrics table */}
          <div className="mb-2 flex items-center gap-3 text-xs text-gray-500">
            <span className="w-28">Metric</span>
            <span className="w-20 text-right">v{result.v1.version}</span>
            <span className="w-4" />
            <span className="w-20 text-right">v{result.v2.version}</span>
            <span className="ml-auto">Change</span>
          </div>

          <MetricRow label="FPS"         v1={result.v1.avgFps}       v2={result.v2.avgFps}       unit=" fps" higherIsBetter={true}  />
          <MetricRow label="Startup"     v1={result.v1.avgStartupMs} v2={result.v2.avgStartupMs} unit="ms"   higherIsBetter={false} />
          <MetricRow label="Memory"      v1={result.v1.avgMemoryMb}  v2={result.v2.avgMemoryMb}  unit="MB"   higherIsBetter={false} />
          <MetricRow label="API Speed"   v1={result.v1.avgApiMs}     v2={result.v2.avgApiMs}     unit="ms"   higherIsBetter={false} />
          <MetricRow label="Crashes"     v1={result.v1.crashCount}   v2={result.v2.crashCount}   unit=""     higherIsBetter={false} />

          <div className="mt-3 flex justify-between text-xs text-gray-500">
            <span>v{result.v1.version}: {result.v1.sessions} sessions</span>
            <span>v{result.v2.version}: {result.v2.sessions} sessions</span>
          </div>
        </div>
      )}
    </div>
  )
}
