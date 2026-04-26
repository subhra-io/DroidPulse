'use client'

import { useState, useMemo } from 'react'
import { SplashScreen }    from '@/components/SplashScreen'
import { useWebSocket }    from '@/hooks/useWebSocket'
import { useCloudEvents }  from '@/hooks/useCloudEvents'
import { FlowTrace }       from '@/components/FlowTrace'
import { NetworkTab }      from '@/components/NetworkTab'
import { HeatmapTab }     from '@/components/HeatmapTab'
import { DiagnosticsTab }  from '@/components/DiagnosticsTab'
import { OverviewTab }        from '@/components/OverviewTab'
import { SessionHistoryTab }  from '@/components/SessionHistoryTab'
import { ReplayBanner }       from '@/components/ReplayBanner'
import { useReproduceTrace }  from '@/hooks/useReproduceTrace'
import { AnalyticsTab }      from '@/components/AnalyticsTab'
import { AlertsTab }         from '@/components/AlertsTab'
import { AdminPanel }        from '@/components/AdminPanel'
import { simulateEvents }     from '@/components/DeviceTwin'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080'

type Tab = 'overview' | 'analytics' | 'flow' | 'network' | 'heatmap' | 'diagnostics' | 'sessions' | 'alerts' | 'admin'

const NAV: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'overview', label: 'OVERVIEW',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <rect x="1" y="1" width="6" height="6" rx="1" /><rect x="9" y="1" width="6" height="6" rx="1" />
        <rect x="1" y="9" width="6" height="6" rx="1" /><rect x="9" y="9" width="6" height="6" rx="1" />
      </svg>
    ),
  },
  {
    id: 'analytics', label: 'ANALYTICS',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 12V8l3-3 3 2 4-4" />
        <circle cx="13" cy="3" r="1" fill="currentColor" />
        <rect x="1" y="14" width="14" height="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'flow', label: 'FLOW TRACE',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polyline points="1,12 5,6 9,9 13,3" /><circle cx="13" cy="3" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'network', label: 'NETWORK',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="6" /><ellipse cx="8" cy="8" rx="3" ry="6" />
        <line x1="2" y1="8" x2="14" y2="8" />
      </svg>
    ),
  },
  {
    id: 'heatmap', label: 'HEATMAP',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <rect x="1" y="1" width="4" height="4" rx="0.5" opacity="0.4" />
        <rect x="6" y="1" width="4" height="4" rx="0.5" opacity="0.7" />
        <rect x="11" y="1" width="4" height="4" rx="0.5" opacity="1" />
        <rect x="1" y="6" width="4" height="4" rx="0.5" opacity="0.6" />
        <rect x="6" y="6" width="4" height="4" rx="0.5" opacity="0.9" />
        <rect x="11" y="6" width="4" height="4" rx="0.5" opacity="0.5" />
        <rect x="1" y="11" width="4" height="4" rx="0.5" opacity="0.3" />
        <rect x="6" y="11" width="4" height="4" rx="0.5" opacity="0.5" />
        <rect x="11" y="11" width="4" height="4" rx="0.5" opacity="0.8" />
      </svg>
    ),
  },
  {
    id: 'diagnostics', label: 'DIAGNOSTICS',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="6" /><line x1="8" y1="5" x2="8" y2="8" /><circle cx="8" cy="10.5" r="0.75" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'sessions', label: 'SESSIONS',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="12" height="2.5" rx="0.5" /><rect x="2" y="7" width="12" height="2.5" rx="0.5" /><rect x="2" y="11" width="7" height="2.5" rx="0.5" />
      </svg>
    ),
  },
  {
    id: 'alerts', label: 'ALERTS',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 2L14 13H2L8 2z" />
        <line x1="8" y1="7" x2="8" y2="10" />
        <circle cx="8" cy="11.5" r="0.6" fill="currentColor" />
      </svg>
    ),
  },
]

export default function Dashboard() {
  const { events: liveEvents, connected, sendCommand } = useWebSocket(WS_URL)
  const { events, loading, latestSession, cloudConnected } = useCloudEvents(liveEvents)
  const [tab, setTab]               = useState<Tab>('overview')
  const [networkSub, setNetworkSub] = useState<'live' | 'analysis' | 'security'>('analysis')
  const [splashDone, setSplashDone] = useState(false)
  const { state: replay, reproduce, pause, resume, reset: exitReplay } = useReproduceTrace(sendCommand)

  // Auth state — in production this comes from a login flow / localStorage
  const [authToken] = useState<string>(
    typeof window !== 'undefined'
      ? localStorage.getItem('dp_token') || ''
      : ''
  )
  const [userRole] = useState<string>(
    typeof window !== 'undefined'
      ? localStorage.getItem('dp_role') || 'developer'
      : 'developer'
  )
  const isAdmin = ['super_admin', 'admin'].includes(userRole)

  // Device Twin simulation state
  const [twinEvents, setTwinEvents]   = useState<any[] | null>(null)
  const [twinProfile, setTwinProfile] = useState<string | null>(null)

  // Active events — twin simulation overrides real events when active
  const activeEvents = twinEvents ?? (replay.phase !== 'idle' ? replay.visibleEvents : events)

  const screenEvents = activeEvents.filter(e => e.type === 'lifecycle')
  const apiEvents    = activeEvents.filter(e => e.type === 'network')
  const memoryEvents = activeEvents.filter(e => e.type === 'memory')
  const fpsEvents    = activeEvents.filter(e => e.type === 'fps')

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white flex">
      {!splashDone && <SplashScreen onComplete={() => setSplashDone(true)} />}
      <ReplayBanner
        state={replay}
        onPause={pause}
        onResume={resume}
        onExit={() => { try { sendCommand({ cmd: 'stop_replay' }) } catch(_){} exitReplay() }}
      />

      {/* ── SIDEBAR ── */}
      <aside className="w-52 min-h-screen bg-[#0d0d0d] border-r border-[#1e1e1e] flex flex-col flex-shrink-0">
        {/* Brand */}
        <div className="px-5 pt-6 pb-8">
          <div className="text-[10px] font-mono text-gray-500 tracking-widest">SYSTEM_KERNEL</div>
          <div className="text-[10px] font-mono text-gray-700 mt-0.5">NODE_X88_01</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 space-y-0.5">
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-xs font-mono tracking-widest transition-colors ${
                tab === n.id
                  ? 'bg-[#1a2a3a] text-blue-400 border-l-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-[#161616]'
              }`}
            >
              {n.icon}
              {n.label}
            </button>
          ))}
          {/* Admin tab — only visible to admin+ */}
          {isAdmin && (
            <button
              onClick={() => setTab('admin')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-xs font-mono tracking-widest transition-colors ${
                tab === 'admin'
                  ? 'bg-[#2a1a1a] text-red-400 border-l-2 border-red-600'
                  : 'text-gray-600 hover:text-gray-400 hover:bg-[#161616]'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="8" cy="5" r="2.5" />
                <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
                <circle cx="13" cy="3" r="1.5" fill="currentColor" stroke="none" />
              </svg>
              ADMIN
            </button>
          )}
        </nav>

        {/* Bottom links */}
        <div className="px-2 pb-6 space-y-0.5">
          <div className="flex items-center gap-3 px-3 py-2.5 text-xs font-mono text-gray-600 tracking-widest">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="2" width="12" height="12" rx="1" /><line x1="5" y1="6" x2="11" y2="6" /><line x1="5" y1="9" x2="9" y2="9" />
            </svg>
            DOCS
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5 text-xs font-mono text-gray-600 tracking-widest">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 2H6L5 5H3a1 1 0 00-1 1v7a1 1 0 001 1h10a1 1 0 001-1V6a1 1 0 00-1-1h-2L10 2z" />
            </svg>
            LOGOUT
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">

        {/* Top bar */}
        <header className="h-12 border-b border-[#1e1e1e] flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-sm font-mono font-bold text-white tracking-widest">PERF_METRIC_V1</span>
            <span className="text-gray-700 text-xs">|</span>
            {tab === 'network' ? (
              <div className="flex items-center gap-5 text-[10px] font-mono tracking-widest">
                {(['live','analysis','security'] as const).map((s, i) => {
                  const labels = ['LIVE STREAM','NETWORK ANALYSIS','SECURITY']
                  return (
                    <button
                      key={s}
                      onClick={() => setNetworkSub(s)}
                      className={`transition-colors pb-0.5 ${
                        networkSub === s
                          ? 'text-blue-400 border-b border-blue-500'
                          : 'text-gray-600 hover:text-gray-400'
                      }`}
                    >
                      {labels[i]}
                    </button>
                  )
                })}
              </div>
            ) : (
              <span className="text-[10px] font-mono text-gray-500 tracking-widest">
                {tab === 'overview'    && 'SYSTEM OVERVIEW'}
                {tab === 'analytics'   && 'ANALYTICS + PERFORMANCE'}
                {tab === 'flow'        && 'FLOW TRACE JOURNEY'}
                {tab === 'heatmap'     && 'SCREEN HEATMAP'}
                {tab === 'diagnostics' && 'DIAGNOSTICS'}
                {tab === 'sessions'    && 'SESSION HISTORY'}
                {tab === 'alerts'      && 'REGRESSION ALERTS'}
                {tab === 'admin'       && 'ADMIN PANEL'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {tab === 'network' && (
              <div className="flex items-center gap-2 bg-[#161616] border border-[#2a2a2a] rounded px-3 py-1.5">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#555" strokeWidth="1.5">
                  <circle cx="5" cy="5" r="3.5" /><line x1="8" y1="8" x2="11" y2="11" />
                </svg>
                <input
                  className="bg-transparent text-[10px] font-mono text-gray-400 placeholder-gray-700 outline-none w-28"
                  placeholder="QUERY_EXEC..."
                />
              </div>
            )}
            {/* signal icon */}
            <div className={`flex items-center gap-1 ${connected ? 'text-gray-400' : 'text-gray-700'}`}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                <rect x="1" y="12" width="3" height="5" rx="0.5" opacity={connected ? 1 : 0.3} />
                <rect x="5.5" y="8" width="3" height="9" rx="0.5" opacity={connected ? 1 : 0.3} />
                <rect x="10" y="4" width="3" height="13" rx="0.5" opacity={connected ? 1 : 0.3} />
                <rect x="14.5" y="1" width="3" height="16" rx="0.5" opacity={connected ? 1 : 0.3} />
              </svg>
            </div>
            {/* grid icon */}
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" className="text-gray-500">
              <circle cx="4" cy="4" r="1.5" /><circle cx="9" cy="4" r="1.5" /><circle cx="14" cy="4" r="1.5" />
              <circle cx="4" cy="9" r="1.5" /><circle cx="9" cy="9" r="1.5" /><circle cx="14" cy="9" r="1.5" />
              <circle cx="4" cy="14" r="1.5" /><circle cx="9" cy="14" r="1.5" /><circle cx="14" cy="14" r="1.5" />
            </svg>
            {/* avatar */}
            <div className="w-7 h-7 rounded bg-[#1e3a5f] border border-blue-800 flex items-center justify-center text-[10px] font-mono font-bold text-blue-300">
              JD
            </div>
            {tab === 'heatmap' && (
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-green-400 ml-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                SYSTEM HEALTHY
              </span>
            )}
            {tab === 'diagnostics' && (
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-green-400 ml-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                LIVE_SYNC
              </span>
            )}
            {twinProfile && (
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-orange-400 ml-1">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                TWIN: {twinProfile}
              </span>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">

          {tab === 'overview' && (
            <OverviewTab
              events={events}
              fpsEvents={fpsEvents}
              memoryEvents={memoryEvents}
              screenEvents={screenEvents}
              connected={connected}
              cloudConnected={cloudConnected}
              loading={loading}
            />
          )}

          {tab === 'analytics' && (
            <AnalyticsTab events={events} allEvents={activeEvents} />
          )}

          {tab === 'flow' && (
            <FlowTrace events={screenEvents} apiEvents={apiEvents} />
          )}

          {tab === 'network' && (
            <NetworkTab events={apiEvents} subTab={networkSub} allEvents={activeEvents} />
          )}

          {tab === 'heatmap' && (
            <HeatmapTab
              screenEvents={screenEvents}
              apiEvents={apiEvents}
              memoryEvents={memoryEvents}
              connected={connected}
            />
          )}

          {tab === 'diagnostics' && (
            <DiagnosticsTab
              events={activeEvents}
              onReproduce={(crash) => { reproduce(crash, latestSession?.id); setTab('overview') }}
              twinEvents={twinEvents}
              twinProfile={twinProfile}
              onSimulate={(sim, profileName) => { setTwinEvents(sim); setTwinProfile(profileName) }}
              onResetTwin={() => { setTwinEvents(null); setTwinProfile(null) }}
              allEvents={events}
            />
          )}

          {tab === 'sessions' && (
            <SessionHistoryTab />
          )}

          {tab === 'alerts' && (
            <AlertsTab />
          )}

          {tab === 'admin' && isAdmin && (
            <AdminPanel token={authToken} />
          )}

        </div>
      </div>
    </main>
  )
}
