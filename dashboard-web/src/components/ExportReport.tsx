'use client'

import { useState } from 'react'

interface Props {
  events: any[]
}

function getPath(url: string) {
  try { return new URL(url).pathname } catch { return url }
}

function grade(s: number) {
  if (s >= 90) return 'A+'
  if (s >= 80) return 'A'
  if (s >= 70) return 'B+'
  if (s >= 60) return 'B'
  if (s >= 50) return 'C'
  return 'D'
}

function calcScores(events: any[]) {
  const fpsEvents    = events.filter(e => e.type === 'fps')
  const memEvents    = events.filter(e => e.type === 'memory')
  const apiEvents    = events.filter(e => e.type === 'network')
  const screenEvents = events.filter(e => e.type === 'lifecycle' && e.eventType === 'RESUMED' && e.duration)

  const avgFps = fpsEvents.length ? fpsEvents.reduce((s, e) => s + e.fps, 0) / fpsEvents.length : 0
  const latestMem = memEvents[memEvents.length - 1]
  const avgApi = apiEvents.length ? apiEvents.reduce((s, e) => s + e.duration, 0) / apiEvents.length : 0
  const avgStartup = screenEvents.length ? screenEvents.reduce((s, e) => s + e.duration, 0) / screenEvents.length : 0
  const failedApis = apiEvents.filter(e => !e.success || e.responseCode >= 400).length

  const fpsScore     = avgFps >= 58 ? 100 : avgFps >= 45 ? 75 : avgFps >= 30 ? 50 : avgFps > 0 ? 25 : 0
  const memScore     = !latestMem ? 0 : latestMem.usagePercentage < 50 ? 100 : latestMem.usagePercentage < 70 ? 80 : latestMem.usagePercentage < 85 ? 55 : 30
  const netScore     = !apiEvents.length ? 0 : avgApi < 200 ? 100 : avgApi < 500 ? 80 : avgApi < 1000 ? 60 : 40
  const startupScore = avgStartup < 100 ? 100 : avgStartup < 300 ? 80 : avgStartup < 600 ? 55 : avgStartup > 0 ? 30 : 0

  const active = [fpsScore, memScore, netScore, startupScore].filter(s => s > 0)
  const overall = active.length ? Math.round(active.reduce((a, b) => a + b, 0) / active.length) : 0

  return { fpsScore, memScore, netScore, startupScore, overall, avgFps, latestMem, avgApi, avgStartup, failedApis, apiEvents, screenEvents }
}

export function ExportReport({ events }: Props) {
  const [exporting, setExporting] = useState(false)

  const generateHTML = () => {
    const s = calcScores(events)
    const now = new Date().toLocaleString()
    const apiEvents = events.filter(e => e.type === 'network')
    const screenEvents = events.filter(e => e.type === 'lifecycle' && e.eventType === 'RESUMED')

    // Top 5 slowest APIs
    const slowestApis = [...apiEvents].sort((a, b) => b.duration - a.duration).slice(0, 5)

    // Screen visit counts
    const screenVisits = new Map<string, number>()
    screenEvents.forEach(e => screenVisits.set(e.screenName, (screenVisits.get(e.screenName) || 0) + 1))
    const topScreens = Array.from(screenVisits.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DroidPulse Performance Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f0f; color: #e5e5e5; padding: 40px; }
  .header { border-bottom: 2px solid #3b82f6; padding-bottom: 24px; margin-bottom: 32px; }
  .header h1 { font-size: 28px; font-weight: 800; color: #fff; }
  .header p { color: #666; margin-top: 4px; }
  .grade-card { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 24px; margin-bottom: 24px; display: flex; align-items: center; gap: 24px; }
  .grade-big { font-size: 64px; font-weight: 900; color: ${s.overall >= 80 ? '#22c55e' : s.overall >= 60 ? '#3b82f6' : s.overall >= 40 ? '#eab308' : '#ef4444'}; }
  .score-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
  .score-card { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; padding: 16px; text-align: center; }
  .score-num { font-size: 32px; font-weight: 800; }
  .score-label { font-size: 12px; color: #666; margin-top: 4px; }
  .section { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; padding: 20px; margin-bottom: 16px; }
  .section h2 { font-size: 16px; font-weight: 700; margin-bottom: 16px; color: #fff; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 11px; color: #666; padding: 8px; border-bottom: 1px solid #2a2a2a; text-transform: uppercase; }
  td { padding: 10px 8px; font-size: 13px; border-bottom: 1px solid #1f1f1f; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }
  .green { color: #22c55e; } .yellow { color: #eab308; } .red { color: #ef4444; } .blue { color: #3b82f6; }
  .footer { margin-top: 32px; text-align: center; color: #444; font-size: 12px; }
</style>
</head>
<body>
<div class="header">
  <h1>🚀 DroidPulse Performance Report</h1>
  <p>Generated: ${now} · ${events.length} events captured</p>
</div>

<div class="grade-card">
  <div class="grade-big">${grade(s.overall)}</div>
  <div>
    <div style="font-size:36px;font-weight:900;color:#fff">${s.overall}<span style="font-size:18px;color:#666">/100</span></div>
    <div style="color:#666;margin-top:4px">Overall Performance Score</div>
    <div style="color:#888;font-size:13px;margin-top:8px">
      ${s.overall >= 80 ? '✅ App is performing well' : s.overall >= 60 ? '⚠️ Some areas need attention' : '🔴 Performance issues detected'}
    </div>
  </div>
</div>

<div class="score-grid">
  <div class="score-card">
    <div class="score-num ${s.fpsScore >= 80 ? 'green' : s.fpsScore >= 60 ? 'yellow' : 'red'}">${s.fpsScore}</div>
    <div class="score-label">🎮 FPS Score</div>
    <div style="font-size:11px;color:#555;margin-top:4px">${s.avgFps.toFixed(0)} avg fps</div>
  </div>
  <div class="score-card">
    <div class="score-num ${s.memScore >= 80 ? 'green' : s.memScore >= 60 ? 'yellow' : 'red'}">${s.memScore}</div>
    <div class="score-label">💾 Memory Score</div>
    <div style="font-size:11px;color:#555;margin-top:4px">${s.latestMem?.usagePercentage?.toFixed(0) ?? '—'}% used</div>
  </div>
  <div class="score-card">
    <div class="score-num ${s.netScore >= 80 ? 'green' : s.netScore >= 60 ? 'yellow' : 'red'}">${s.netScore}</div>
    <div class="score-label">🌐 Network Score</div>
    <div style="font-size:11px;color:#555;margin-top:4px">${s.avgApi.toFixed(0)}ms avg · ${s.failedApis} errors</div>
  </div>
  <div class="score-card">
    <div class="score-num ${s.startupScore >= 80 ? 'green' : s.startupScore >= 60 ? 'yellow' : 'red'}">${s.startupScore}</div>
    <div class="score-label">🚀 Startup Score</div>
    <div style="font-size:11px;color:#555;margin-top:4px">${s.avgStartup.toFixed(0)}ms avg open</div>
  </div>
</div>

${slowestApis.length > 0 ? `
<div class="section">
  <h2>🐢 Slowest API Calls</h2>
  <table>
    <tr><th>Method</th><th>Endpoint</th><th>Duration</th><th>Status</th></tr>
    ${slowestApis.map(a => `
    <tr>
      <td><span class="badge" style="background:#1e3a5f;color:#60a5fa">${a.method}</span></td>
      <td style="font-family:monospace;font-size:12px">${getPath(a.url)}</td>
      <td class="${a.duration > 1000 ? 'red' : a.duration > 500 ? 'yellow' : 'green'}">${a.duration}ms</td>
      <td class="${a.responseCode >= 400 ? 'red' : 'green'}">${a.responseCode ?? 'ERR'}</td>
    </tr>`).join('')}
  </table>
</div>` : ''}

${topScreens.length > 0 ? `
<div class="section">
  <h2>📱 Most Visited Screens</h2>
  <table>
    <tr><th>Screen</th><th>Visits</th></tr>
    ${topScreens.map(([name, visits]) => `
    <tr>
      <td>${name}</td>
      <td class="blue">${visits}</td>
    </tr>`).join('')}
  </table>
</div>` : ''}

<div class="footer">
  DroidPulse SDK · github.com/subhra-io/DroidPulse
</div>
</body>
</html>`
  }

  const exportHTML = () => {
    setExporting(true)
    try {
      const html = generateHTML()
      const blob = new Blob([html], { type: 'text/html' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `droidpulse-report-${new Date().toISOString().split('T')[0]}.html`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const exportJSON = () => {
    const s = calcScores(events)
    const data = {
      generatedAt: new Date().toISOString(),
      scores: { overall: s.overall, fps: s.fpsScore, memory: s.memScore, network: s.netScore, startup: s.startupScore },
      summary: { totalEvents: events.length, apiCalls: events.filter(e => e.type === 'network').length, screens: events.filter(e => e.type === 'lifecycle').length },
      events
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `droidpulse-data-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">📄 Export Report</h2>
          <p className="text-xs text-gray-500 mt-0.5">Share performance data with your team</p>
        </div>
        <span className="text-xs text-gray-500">{events.length} events</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* HTML Report */}
        <button
          onClick={exportHTML}
          disabled={events.length === 0 || exporting}
          className="flex flex-col items-center gap-2 p-4 bg-dark-bg border border-dark-border rounded-lg hover:border-blue-500 hover:bg-blue-950/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="text-2xl">📊</span>
          <div className="text-center">
            <div className="text-sm font-medium text-white">HTML Report</div>
            <div className="text-xs text-gray-500 mt-0.5">Beautiful report to share</div>
          </div>
        </button>

        {/* JSON Export */}
        <button
          onClick={exportJSON}
          disabled={events.length === 0}
          className="flex flex-col items-center gap-2 p-4 bg-dark-bg border border-dark-border rounded-lg hover:border-green-500 hover:bg-green-950/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="text-2xl">📦</span>
          <div className="text-center">
            <div className="text-sm font-medium text-white">JSON Data</div>
            <div className="text-xs text-gray-500 mt-0.5">Raw data for analysis</div>
          </div>
        </button>
      </div>

      {events.length === 0 && (
        <p className="text-center text-xs text-gray-600 mt-3">
          Use your app to generate data, then export
        </p>
      )}
    </div>
  )
}
