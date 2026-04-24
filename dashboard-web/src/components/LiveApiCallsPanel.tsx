'use client'

import { useEffect, useState } from 'react'
import { DeviceProfile } from './DeviceTwin'

interface LiveApiCallsPanelProps {
  events: any[]
  profile: DeviceProfile | null
  isSimulating: boolean
}

interface ProcessedApiCall {
  id: string
  timestamp: number
  method: string
  url: string
  originalDuration: number
  simulatedDuration: number
  originalStatus: number
  simulatedStatus: number
  responseSize: number
  deviceImpact: {
    latencyMultiplier: number
    failureRisk: number
    timeoutRisk: number
  }
}

export function LiveApiCallsPanel({ events, profile, isSimulating }: LiveApiCallsPanelProps) {
  const [processedCalls, setProcessedCalls] = useState<ProcessedApiCall[]>([])
  const [selectedCall, setSelectedCall] = useState<ProcessedApiCall | null>(null)

  useEffect(() => {
    if (!profile) return

    // Look for network events from multiple possible sources
    const networkEvents = events
      .filter(e => 
        e.type === 'network' || 
        e.type === 'api' || 
        e.endpoint || 
        e.url || 
        e.method ||
        (e.type === 'lifecycle' && e.url) // Sometimes API calls are logged as lifecycle events
      )
      .slice(-20) // Keep last 20 calls
      .map(event => processApiCall(event, profile))

    // If no real events, show demo message
    if (networkEvents.length === 0) {
      console.log('No network events found. Make sure your Android app is running and making API calls.')
    }

    setProcessedCalls(networkEvents)
  }, [events, profile])

  const processApiCall = (event: any, deviceProfile: DeviceProfile): ProcessedApiCall => {
    const c = deviceProfile.coefficients
    const originalDuration = event.duration || 200
    const simulatedDuration = Math.round(originalDuration * c.apiLatency)
    
    // Calculate failure and timeout risks
    const failureRisk = c.apiLatency > 3 ? Math.min(30, (c.apiLatency - 1) * 10) : 0
    const timeoutRisk = simulatedDuration > 8000 ? 80 : simulatedDuration > 5000 ? 40 : 0
    
    // Determine simulated status
    let simulatedStatus = event.responseCode || 200
    if (timeoutRisk > 50) {
      simulatedStatus = 408 // Timeout
    } else if (failureRisk > 20 && (event.timestamp % 10 < 2)) {
      simulatedStatus = 500 // Server error due to network issues
    }

    return {
      id: event.id || `${event.timestamp}-${Math.random()}`,
      timestamp: event.timestamp || Date.now(),
      method: event.method || 'GET',
      url: event.url || event.endpoint || '/api/unknown',
      originalDuration,
      simulatedDuration,
      originalStatus: event.responseCode || 200,
      simulatedStatus,
      responseSize: event.responseSize || Math.round(Math.random() * 50000),
      deviceImpact: {
        latencyMultiplier: c.apiLatency,
        failureRisk,
        timeoutRisk
      }
    }
  }

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-400'
    if (status >= 300 && status < 400) return 'text-yellow-400'
    if (status >= 400 && status < 500) return 'text-orange-400'
    return 'text-red-400'
  }

  const getDurationColor = (duration: number) => {
    if (duration < 500) return 'text-green-400'
    if (duration < 2000) return 'text-yellow-400'
    if (duration < 5000) return 'text-orange-400'
    return 'text-red-400'
  }

  const recentCalls = processedCalls.slice(-10).reverse()
  const avgOriginalDuration = processedCalls.length ? 
    Math.round(processedCalls.reduce((sum, call) => sum + call.originalDuration, 0) / processedCalls.length) : 0
  const avgSimulatedDuration = processedCalls.length ? 
    Math.round(processedCalls.reduce((sum, call) => sum + call.simulatedDuration, 0) / processedCalls.length) : 0

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-[#1e1e1e] flex items-center justify-between">
        <div>
          <div className="text-[10px] font-mono text-gray-400 tracking-widest">LIVE API MIRROR</div>
          <div className="text-[9px] font-mono text-gray-600 mt-0.5">
            {isSimulating && profile ? 
              `Simulating on ${profile.name} • ${processedCalls.length} calls mirrored` :
              'Select a device to start mirroring API calls'
            }
          </div>
        </div>
        {isSimulating && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            <span className="text-[9px] font-mono text-orange-400 font-bold tracking-widest">
              LIVE
            </span>
          </div>
        )}
      </div>

      {isSimulating && profile && (
        <>
          {/* Performance Summary */}
          <div className="px-5 py-3 border-b border-[#1a1a1a] bg-[#0d0d0d]">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1">AVG LATENCY</div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm font-mono text-gray-400">{avgOriginalDuration}ms</span>
                  <span className="text-gray-700">→</span>
                  <span className={`text-sm font-mono font-bold ${getDurationColor(avgSimulatedDuration)}`}>
                    {avgSimulatedDuration}ms
                  </span>
                </div>
                <div className="text-[8px] font-mono text-gray-600 mt-1">
                  {profile.coefficients.apiLatency}× slower
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1">FAILURE RATE</div>
                <div className="text-sm font-mono font-bold text-red-400">
                  {Math.round((recentCalls.filter(c => c.simulatedStatus >= 400).length / Math.max(recentCalls.length, 1)) * 100)}%
                </div>
                <div className="text-[8px] font-mono text-gray-600 mt-1">
                  vs 0% original
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1">TIMEOUT RISK</div>
                <div className="text-sm font-mono font-bold text-yellow-400">
                  {recentCalls.length ? Math.round(recentCalls.reduce((sum, call) => sum + call.deviceImpact.timeoutRisk, 0) / recentCalls.length) : 0}%
                </div>
                <div className="text-[8px] font-mono text-gray-600 mt-1">
                  {profile.network} network
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1">DATA USAGE</div>
                <div className="text-sm font-mono font-bold text-blue-400">
                  {Math.round(recentCalls.reduce((sum, call) => sum + call.responseSize, 0) / 1024)}KB
                </div>
                <div className="text-[8px] font-mono text-gray-600 mt-1">
                  last 10 calls
                </div>
              </div>
            </div>
          </div>

          {/* API Calls List */}
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-xs font-mono">
              <thead className="sticky top-0 bg-[#111] border-b border-[#1a1a1a]">
                <tr>
                  <th className="text-left px-3 py-2 text-[9px] text-gray-600 tracking-widest font-normal">TIME</th>
                  <th className="text-left px-3 py-2 text-[9px] text-gray-600 tracking-widest font-normal">METHOD</th>
                  <th className="text-left px-3 py-2 text-[9px] text-gray-600 tracking-widest font-normal">ENDPOINT</th>
                  <th className="text-right px-3 py-2 text-[9px] text-gray-600 tracking-widest font-normal">ORIGINAL</th>
                  <th className="text-right px-3 py-2 text-[9px] text-gray-600 tracking-widest font-normal">SIMULATED</th>
                  <th className="text-center px-3 py-2 text-[9px] text-gray-600 tracking-widest font-normal">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {recentCalls.map((call, i) => (
                  <tr 
                    key={call.id} 
                    className="border-b border-[#141414] hover:bg-[#161616] transition-colors cursor-pointer"
                    onClick={() => setSelectedCall(call)}
                  >
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                      {new Date(call.timestamp).toLocaleTimeString('en-US', { 
                        hour12: false, 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        second: '2-digit' 
                      })}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        call.method === 'GET' ? 'bg-blue-900 text-blue-400' :
                        call.method === 'POST' ? 'bg-green-900 text-green-400' :
                        call.method === 'PUT' ? 'bg-yellow-900 text-yellow-400' :
                        call.method === 'DELETE' ? 'bg-red-900 text-red-400' :
                        'bg-gray-800 text-gray-400'
                      }`}>
                        {call.method}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-300 max-w-[200px] truncate">
                      {call.url}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-400">
                      {call.originalDuration}ms
                    </td>
                    <td className={`px-3 py-2 text-right font-bold ${getDurationColor(call.simulatedDuration)}`}>
                      {call.simulatedDuration}ms
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`text-[9px] font-mono ${getStatusColor(call.originalStatus)}`}>
                          {call.originalStatus}
                        </span>
                        <span className="text-gray-700">→</span>
                        <span className={`text-[9px] font-mono font-bold ${getStatusColor(call.simulatedStatus)}`}>
                          {call.simulatedStatus}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Selected Call Details */}
          {selectedCall && (
            <div className="border-t border-[#1a1a1a] p-4 bg-[#0d0d0d]">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] font-mono text-gray-400 tracking-widest">CALL DETAILS</div>
                <button 
                  onClick={() => setSelectedCall(null)}
                  className="text-[9px] font-mono text-gray-600 hover:text-gray-400"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-[10px] font-mono">
                <div>
                  <div className="text-gray-600 mb-1">Original Performance</div>
                  <div className="space-y-1">
                    <div>Duration: <span className="text-gray-300">{selectedCall.originalDuration}ms</span></div>
                    <div>Status: <span className={getStatusColor(selectedCall.originalStatus)}>{selectedCall.originalStatus}</span></div>
                    <div>Size: <span className="text-gray-300">{Math.round(selectedCall.responseSize / 1024)}KB</span></div>
                  </div>
                </div>
                
                <div>
                  <div className="text-gray-600 mb-1">Simulated on {profile.name}</div>
                  <div className="space-y-1">
                    <div>Duration: <span className={getDurationColor(selectedCall.simulatedDuration)}>{selectedCall.simulatedDuration}ms</span></div>
                    <div>Status: <span className={getStatusColor(selectedCall.simulatedStatus)}>{selectedCall.simulatedStatus}</span></div>
                    <div>Multiplier: <span className="text-yellow-400">{selectedCall.deviceImpact.latencyMultiplier}×</span></div>
                  </div>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-[#1a1a1a]">
                <div className="text-gray-600 mb-2 text-[10px] font-mono">Device Impact Analysis</div>
                <div className="space-y-1 text-[9px] font-mono">
                  <div>Failure Risk: <span className="text-red-400">{selectedCall.deviceImpact.failureRisk}%</span></div>
                  <div>Timeout Risk: <span className="text-yellow-400">{selectedCall.deviceImpact.timeoutRisk}%</span></div>
                  <div>Network: <span className="text-blue-400">{profile.network.toUpperCase()}</span></div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!isSimulating && (
        <div className="px-5 py-8 text-center">
          <div className="text-gray-600 text-sm mb-2">No device simulation active</div>
          <div className="text-gray-700 text-xs">
            Select a device profile and start simulation to see live API call mirroring
          </div>
        </div>
      )}
    </div>
  )
}