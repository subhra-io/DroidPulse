'use client'

import { useEffect, useState } from 'react'
import { ScreenTimings } from '@/components/ScreenTimings'
import { ApiCalls } from '@/components/ApiCalls'
import { MemoryGraph } from '@/components/MemoryGraph'
import { FpsGraph } from '@/components/FpsGraph'
import { ConnectionStatus } from '@/components/ConnectionStatus'
import { PerformanceSummary } from '@/components/PerformanceSummary'
import { FlowTrace } from '@/components/FlowTrace'
import { useWebSocket } from '@/hooks/useWebSocket'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080'

export default function Dashboard() {
  const { events, connected } = useWebSocket(WS_URL)

  const screenEvents = events.filter(e => e.type === 'lifecycle')
  const apiEvents    = events.filter(e => e.type === 'network')
  const memoryEvents = events.filter(e => e.type === 'memory')
  const fpsEvents    = events.filter(e => e.type === 'fps')

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">DroidPulse Dashboard</h1>
            <p className="text-gray-500 mt-2">Real-time Android performance monitoring</p>
          </div>
          <ConnectionStatus connected={connected} />
        </div>

        {/* Connection info */}
        <div className="mb-6 p-4 bg-dark-card border border-dark-border rounded-lg">
          <p className="text-sm text-gray-400 mb-1">
            Connected to: <span className="text-blue-400 font-mono">{WS_URL}</span>
          </p>
          <p className="text-xs text-gray-500">
            📱 Physical device: <span className="font-mono text-yellow-400">adb forward tcp:8080 tcp:8080</span>
            &nbsp;|&nbsp;
            🖥️ Emulator: <span className="font-mono text-yellow-400">ws://10.0.2.2:8080</span>
          </p>
        </div>

        {/* Row 1: Summary + Memory */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-1">
            <PerformanceSummary events={events} />
          </div>
          <div className="lg:col-span-2">
            <MemoryGraph events={memoryEvents} />
          </div>
        </div>

        {/* Row 2: FPS + Screen Timings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <FpsGraph events={fpsEvents} />
          <ScreenTimings events={screenEvents} />
        </div>

        {/* Row 3: Flow Trace — full width, the star of the show */}
        <div className="mb-6">
          <FlowTrace events={screenEvents} apiEvents={apiEvents} />
        </div>

        {/* Row 4: API Calls + Event Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ApiCalls events={apiEvents} />

          <div className="bg-dark-card border border-dark-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Event Stream</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {events.length === 0 ? (
                <p className="text-gray-500 text-sm">Waiting for events...</p>
              ) : (
                events.slice(-10).reverse().map((event, i) => (
                  <div key={i} className="text-xs p-2 bg-dark-bg rounded border-l-2 border-blue-500">
                    <span className="text-blue-400 font-mono">{event.type}</span>
                    {event.screenName && (
                      <span className="text-gray-300 ml-2">{event.screenName}</span>
                    )}
                    {event.url && (
                      <span className="text-gray-300 ml-2 font-mono truncate">
                        {(() => { try { return new URL(event.url).pathname } catch { return event.url } })()}
                      </span>
                    )}
                    <span className="text-gray-600 ml-2 float-right">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}
