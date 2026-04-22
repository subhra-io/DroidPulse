'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface Props {
  events: any[]
}

export function MemoryGraph({ events }: Props) {
  // Transform events into chart data
  const chartData = events
    .slice(-20) // Last 20 data points
    .map((e, index) => ({
      time: index,
      used: e.usedMemoryMb || 0,
      max: e.maxMemoryMb || 0,
      heap: e.heapUsedMb || 0,
      percentage: e.usagePercentage || 0
    }))

  const latestEvent = events[events.length - 1]
  const usagePercentage = latestEvent?.usagePercentage?.toFixed(1) || 0
  const usedMb = latestEvent?.usedMemoryMb || 0
  const maxMb = latestEvent?.maxMemoryMb || 0

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Memory Usage</h2>
        {latestEvent && (
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-400">{usagePercentage}%</div>
            <div className="text-xs text-gray-500">{usedMb}MB / {maxMb}MB</div>
          </div>
        )}
      </div>
      
      {chartData.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-500">
          No memory data yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis dataKey="time" stroke="#666" />
            <YAxis stroke="#666" label={{ value: 'MB', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
              labelStyle={{ color: '#fff' }}
            />
            <Legend />
            <Line type="monotone" dataKey="used" stroke="#3b82f6" name="Used Memory" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="heap" stroke="#8b5cf6" name="Heap" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
      
      {latestEvent?.isLowMemory && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-500/50 rounded text-red-400 text-sm">
          ⚠️ Low memory warning detected
        </div>
      )}
    </div>
  )
}
