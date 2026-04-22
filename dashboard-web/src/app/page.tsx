'use client'

import { useEffect, useState } from 'react'
import { ScreenTimings } from '@/components/ScreenTimings'
import { ApiCalls } from '@/components/ApiCalls'
import { MemoryGraph } from '@/components/MemoryGraph'
import { FpsGraph } from '@/components/FpsGraph'
import { ConnectionStatus } from '@/components/ConnectionStatus'
import { PerformanceSummary } from '@/components/PerformanceSummary'
import { useWebSocket } from '@/hooks/useWebSocket'

// Auto-detect device IP or use localhost for emulator
// For physical device: change this to your computer's IP e.g. ws://192.168.1.x:8080
// For emulator: ws://10.0.2.2:8080 routes to host machine, but SDK runs on device so use localhost
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080'

export default function Dashboard() {
  const { events, connected } = useWebSocket(WS_URL)
  const [wsUrl, setWsUrl] = useState(WS_URL)
  const [customUrl, setCustomUrl] = useState('')
  
  const screenEvents = events.filter(e => e.type === 'lifecycle')
  const apiEvents = events.filter(e => e.type === 'network')
  const memoryEvents = events.filter(e => e.type === 'memory')
  const fpsEvents = events.filter(e => e.type === 'fps')

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">DroidPulse Dashboard</h1>
            <p className="text-gray-500 mt-2">Real-time Android performance monitoring</p>
          </div>
          <ConnectionStatus connected={connected} />
        </div>

        {/* Connection URL helper */}
        <div className="mb-6 p-4 bg-dark-card border border-dark-border rounded-lg">
          <p className="text-sm text-gray-400 mb-2">
            Connected to: <span className="text-blue-400 font-mono">{WS_URL}</span>
          </p>
          <p className="text-xs text-gray-500">
            📱 Physical device: set <span className="font-mono text-yellow-400">NEXT_PUBLIC_WS_URL=ws://YOUR_DEVICE_IP:8080</span> in .env.local
            &nbsp;|&nbsp;
            🖥️ Emulator: use <span className="font-mono text-yellow-400">ws://localhost:8080</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-1">
            <PerformanceSummary events={events} />
          </div>
          <div className="lg:col-span-2">
            <MemoryGraph events={memoryEvents} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FpsGraph events={fpsEvents} />
          <ScreenTimings events={screenEvents} />
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
                    <span className="text-gray-500 ml-2">
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
