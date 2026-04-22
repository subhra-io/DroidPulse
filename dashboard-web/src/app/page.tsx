'use client'

import { useState } from 'react'
import { ScreenTimings }    from '@/components/ScreenTimings'
import { ApiCalls }         from '@/components/ApiCalls'
import { MemoryGraph }      from '@/components/MemoryGraph'
import { FpsGraph }         from '@/components/FpsGraph'
import { ConnectionStatus } from '@/components/ConnectionStatus'
import { FlowTrace }        from '@/components/FlowTrace'
import { HealthScore }      from '@/components/HealthScore'
import { ScreenHeatmap }    from '@/components/ScreenHeatmap'
import { SlowestApis }      from '@/components/SlowestApis'
import { ExportReport }     from '@/components/ExportReport'
import { useWebSocket }     from '@/hooks/useWebSocket'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080'

type Tab = 'overview' | 'flow' | 'network' | 'heatmap'

export default function Dashboard() {
  const { events, connected } = useWebSocket(WS_URL)
  const [tab, setTab] = useState<Tab>('overview')

  const screenEvents = events.filter(e => e.type === 'lifecycle')
  const apiEvents    = events.filter(e => e.type === 'network')
  const memoryEvents = events.filter(e => e.type === 'memory')
  const fpsEvents    = events.filter(e => e.type === 'fps')

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview',  icon: '📊' },
    { id: 'flow',     label: 'Flow Trace',icon: '🗺️' },
    { id: 'network',  label: 'Network',   icon: '🌐' },
    { id: 'heatmap',  label: 'Heatmap',   icon: '🔥' },
  ]

  return (
    <main className="min-h-screen bg-dark-bg">
      {/* Top Nav */}
      <div className="border-b border-dark-border bg-dark-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-black text-white">⚡ DroidPulse</span>
            <span className="text-xs text-gray-500 bg-dark-bg px-2 py-0.5 rounded">v1.1.0</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500 font-mono">{WS_URL}</span>
            <ConnectionStatus connected={connected} />
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-6 flex gap-1 pb-0">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* Connection hint */}
        {!connected && (
          <div className="mb-4 p-3 bg-yellow-950/30 border border-yellow-800 rounded-lg text-xs text-yellow-400">
            ⚠️ Not connected. Run: <span className="font-mono bg-dark-bg px-1 rounded">adb forward tcp:8080 tcp:8080</span>
            &nbsp;then open your app.
          </div>
        )}

        {/* ── OVERVIEW TAB ── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Row 1: Health Score + Memory */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2">
                <HealthScore events={events} />
              </div>
              <div className="lg:col-span-3">
                <MemoryGraph events={memoryEvents} />
              </div>
            </div>

            {/* Row 2: FPS + Screen Timings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FpsGraph events={fpsEvents} />
              <ScreenTimings events={screenEvents} />
            </div>

            {/* Row 3: Export */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <ExportReport events={events} />
              <div className="lg:col-span-2 bg-dark-card border border-dark-border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">📡 Live Event Stream</h2>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {events.length === 0 ? (
                    <p className="text-gray-500 text-sm">Waiting for events — open your app...</p>
                  ) : (
                    events.slice(-15).reverse().map((e, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs p-1.5 bg-dark-bg rounded">
                        <span className={`w-16 text-center rounded px-1 py-0.5 flex-shrink-0 ${
                          e.type === 'lifecycle' ? 'bg-blue-900 text-blue-300' :
                          e.type === 'network'   ? 'bg-green-900 text-green-300' :
                          e.type === 'memory'    ? 'bg-purple-900 text-purple-300' :
                          'bg-orange-900 text-orange-300'
                        }`}>{e.type}</span>
                        <span className="text-gray-300 flex-1 truncate">
                          {e.screenName || (e.url ? (() => { try { return new URL(e.url).pathname } catch { return e.url } })() : '')}
                        </span>
                        {e.duration && <span className="text-gray-500">{e.duration}ms</span>}
                        <span className="text-gray-600 flex-shrink-0">
                          {new Date(e.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── FLOW TRACE TAB ── */}
        {tab === 'flow' && (
          <FlowTrace events={screenEvents} apiEvents={apiEvents} />
        )}

        {/* ── NETWORK TAB ── */}
        {tab === 'network' && (
          <div className="space-y-6">
            <SlowestApis events={apiEvents} />
            <ApiCalls events={apiEvents} />
          </div>
        )}

        {/* ── HEATMAP TAB ── */}
        {tab === 'heatmap' && (
          <div className="space-y-6">
            <ScreenHeatmap screenEvents={screenEvents} apiEvents={apiEvents} />
            <ScreenTimings events={screenEvents} />
          </div>
        )}

      </div>
    </main>
  )
}
