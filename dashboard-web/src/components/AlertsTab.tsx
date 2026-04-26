'use client'
import { useState, useEffect, useCallback } from 'react'

const CLOUD_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const CLOUD_KEY = process.env.NEXT_PUBLIC_API_KEY || 'dp_live_demo_key_12345'

interface Alert {
  id: number
  metric: string
  baseline_version: string
  current_version: string
  baseline_value: number
  current_value: number
  change_percent: number
  severity: 'critical' | 'warning' | 'info'
  created_at: number
}

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'border-l-red-500 bg-red-950/20',
  warning:  'border-l-yellow-500 bg-yellow-950/20',
  info:     'border-l-blue-500 bg-blue-950/20',
}

const METRIC_LABEL: Record<string, string> = {
  fps:     'FPS dropped',
  startup: 'Startup time increased',
  crash:   'Crash detected',
  memory:  'Memory usage spiked',
  api:     'API latency increased',
}

const METRIC_UNIT: Record<string, string> = {
  fps: 'fps', startup: 'ms', crash: 'crashes', memory: 'MB', api: 'ms',
}

export function AlertsTab() {
  const [alerts, setAlerts]   = useState<Alert[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${CLOUD_API}/api/alerts`, {
        headers: { Authorization: `Bearer ${CLOUD_KEY}` }
      })
      if (res.ok) {
        const d = await res.json()
        setAlerts(d.alerts || [])
      }
    } catch (_) {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const criticals = alerts.filter(a => a.severity === 'critical')
  const warnings  = alerts.filter(a => a.severity === 'warning')

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-mono font-bold text-white tracking-widest">ALERTS</div>
          <div className="text-[10px] font-mono text-gray-500 mt-0.5">
            Regression detection across versions
          </div>
        </div>
        <button
          onClick={load}
          className="text-[10px] font-mono text-gray-500 hover:text-gray-300 border border-[#2a2a2a] px-3 py-1.5 rounded transition-colors"
        >
          {loading ? 'LOADING...' : 'REFRESH'}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4">
          <div className="text-[9px] font-mono text-gray-500 tracking-widest mb-1">CRITICAL</div>
          <div className="text-2xl font-black text-red-400">{criticals.length}</div>
        </div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4">
          <div className="text-[9px] font-mono text-gray-500 tracking-widest mb-1">WARNINGS</div>
          <div className="text-2xl font-black text-yellow-400">{warnings.length}</div>
        </div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4">
          <div className="text-[9px] font-mono text-gray-500 tracking-widest mb-1">TOTAL</div>
          <div className="text-2xl font-black text-white">{alerts.length}</div>
        </div>
      </div>

      {/* Alert list */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1e1e1e] text-[10px] font-mono text-gray-400 tracking-widest">
          REGRESSION ALERTS
        </div>

        {alerts.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-[10px] font-mono text-gray-600">
              {loading ? 'LOADING...' : 'NO ALERTS — all metrics within normal range ✓'}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`border-l-2 px-4 py-3 ${SEVERITY_STYLE[alert.severity] || SEVERITY_STYLE.info}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                        alert.severity === 'critical' ? 'bg-red-900 text-red-300' :
                        alert.severity === 'warning'  ? 'bg-yellow-900 text-yellow-300' :
                        'bg-blue-900 text-blue-300'
                      }`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className="text-xs font-mono text-white">
                        {METRIC_LABEL[alert.metric] || alert.metric}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-gray-400">
                      {alert.baseline_version} → {alert.current_version}
                      {' · '}
                      {Math.round(alert.baseline_value)}{METRIC_UNIT[alert.metric] || ''}
                      {' → '}
                      {Math.round(alert.current_value)}{METRIC_UNIT[alert.metric] || ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-black ${
                      alert.change_percent > 0 ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {alert.change_percent > 0 ? '+' : ''}{Math.round(alert.change_percent)}%
                    </div>
                    <div className="text-[9px] font-mono text-gray-600">
                      {new Date(alert.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How alerts work */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4">
        <div className="text-[10px] font-mono text-gray-400 tracking-widest mb-3">HOW ALERTS WORK</div>
        <div className="space-y-2 text-[10px] font-mono text-gray-500">
          <div className="flex items-start gap-2">
            <span className="text-red-400 flex-shrink-0">CRITICAL</span>
            <span>FPS drops &gt;15% · Startup increases &gt;20% · Any crash detected</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-yellow-400 flex-shrink-0">WARNING</span>
            <span>FPS drops &gt;10% · Startup increases &gt;10% · Memory spikes &gt;20%</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-400 flex-shrink-0">AUTO</span>
            <span>Triggered automatically when events arrive from device — no setup needed</span>
          </div>
        </div>
      </div>

    </div>
  )
}
