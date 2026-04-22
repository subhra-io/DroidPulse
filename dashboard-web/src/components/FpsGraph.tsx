'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'

interface Props {
  events: any[]
}

export function FpsGraph({ events }: Props) {
  // Transform events into chart data
  const chartData = events
    .slice(-20) // Last 20 data points
    .map((e, index) => ({
      time: index,
      fps: e.fps || 0,
      jank: e.jankCount || 0,
      dropped: e.droppedFrames || 0
    }))

  const latestEvent = events[events.length - 1]
  const currentFps = latestEvent?.fps?.toFixed(1) || 0
  const jankCount = latestEvent?.jankCount || 0
  const droppedFrames = latestEvent?.droppedFrames || 0

  // Determine FPS color
  const getFpsColor = (fps: number) => {
    if (fps >= 58) return 'text-green-400'
    if (fps >= 45) return 'text-yellow-400'
    if (fps >= 30) return 'text-orange-400'
    return 'text-red-400'
  }

  const fpsColor = getFpsColor(parseFloat(currentFps as string))

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">FPS Monitor</h2>
        {latestEvent && (
          <div className="text-right">
            <div className={`text-2xl font-bold ${fpsColor}`}>{currentFps} FPS</div>
            <div className="text-xs text-gray-500">
              Jank: {jankCount} | Dropped: {droppedFrames}
            </div>
          </div>
        )}
      </div>
      
      {chartData.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-500">
          No FPS data yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis dataKey="time" stroke="#666" />
            <YAxis stroke="#666" domain={[0, 60]} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
              labelStyle={{ color: '#fff' }}
            />
            <Legend />
            <ReferenceLine y={60} stroke="#10b981" strokeDasharray="3 3" label="60 FPS" />
            <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="3 3" label="30 FPS" />
            <Line type="monotone" dataKey="fps" stroke="#10b981" name="FPS" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
      
      {parseFloat(currentFps as string) < 30 && latestEvent && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-500/50 rounded text-red-400 text-sm">
          ⚠️ Poor performance detected - FPS below 30
        </div>
      )}
    </div>
  )
}
