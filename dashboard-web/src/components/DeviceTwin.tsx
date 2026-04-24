'use client'

import { useMemo, useState } from 'react'
import { DeviceMockup, DeviceSelector } from './DeviceMockup'

// ── Device profiles ───────────────────────────────────────────────────────────

export interface DeviceProfile {
  id: string
  name: string
  tier: 'flagship' | 'mid' | 'low' | 'custom'
  ram: string
  cpu: string
  network: 'wifi' | '4g' | '3g' | '2g' | 'weak4g'
  battery: 'normal' | 'saver'
  // Simulation coefficients — multipliers applied to real event durations
  coefficients: {
    screenOpen:   number   // lifecycle duration multiplier
    apiLatency:   number   // network duration multiplier
    memoryPct:    number   // memory usage % adder (absolute)
    fpsReduction: number   // fps subtracted
    dbQuery:      number   // db duration multiplier
    jankMulti:    number   // jank count multiplier
  }
  notes: string[]          // what makes this device slow
}

export const DEVICE_PROFILES: DeviceProfile[] = [
  {
    id: 'pixel8',
    name: 'Pixel 8 Pro',
    tier: 'flagship',
    ram: '12GB', cpu: 'Tensor G3',
    network: 'wifi', battery: 'normal',
    coefficients: { screenOpen: 1.0, apiLatency: 1.0, memoryPct: 0, fpsReduction: 0, dbQuery: 1.0, jankMulti: 1.0 },
    notes: ['Baseline — your dev device'],
  },
  {
    id: 'samsung_a13',
    name: 'Samsung Galaxy A13',
    tier: 'low',
    ram: '2GB', cpu: 'Exynos 850',
    network: 'weak4g', battery: 'saver',
    coefficients: { screenOpen: 2.8, apiLatency: 3.2, memoryPct: 35, fpsReduction: 22, dbQuery: 4.1, jankMulti: 5.0 },
    notes: [
      '2GB RAM — system kills background apps aggressively',
      'Exynos 850 is 3× slower than Tensor G3 for image decode',
      'Battery saver cuts CPU to 70% max clock',
      'Weak 4G adds ~800ms to every API call',
    ],
  },
  {
    id: 'redmi_9a',
    name: 'Redmi 9A',
    tier: 'low',
    ram: '2GB', cpu: 'Helio G25',
    network: '3g', battery: 'normal',
    coefficients: { screenOpen: 3.5, apiLatency: 4.8, memoryPct: 42, fpsReduction: 28, dbQuery: 5.2, jankMulti: 6.5 },
    notes: [
      'Entry-level device — 15% of Indian Android market',
      'Helio G25 struggles with Compose recompositions',
      '3G network — API calls often timeout',
      'Only 2GB RAM shared with MIUI background services',
    ],
  },
  {
    id: 'samsung_a54',
    name: 'Samsung Galaxy A54',
    tier: 'mid',
    ram: '6GB', cpu: 'Exynos 1380',
    network: '4g', battery: 'normal',
    coefficients: { screenOpen: 1.4, apiLatency: 1.8, memoryPct: 12, fpsReduction: 8, dbQuery: 1.6, jankMulti: 1.8 },
    notes: [
      'Most popular mid-range in South Asia',
      'One UI adds ~15% overhead vs stock Android',
      '4G with moderate latency',
    ],
  },
  {
    id: 'moto_g32',
    name: 'Moto G32',
    tier: 'mid',
    ram: '4GB', cpu: 'Snapdragon 680',
    network: '4g', battery: 'saver',
    coefficients: { screenOpen: 1.9, apiLatency: 2.1, memoryPct: 20, fpsReduction: 14, dbQuery: 2.3, jankMulti: 2.8 },
    notes: [
      'Budget mid-range — common in tier-2/3 cities',
      'Battery saver mode active (common for budget users)',
      'Snapdragon 680 — decent but not fast',
    ],
  },
  {
    id: 'weak_network',
    name: 'Good Device, Bad Network',
    tier: 'mid',
    ram: '6GB', cpu: 'Fast',
    network: '2g', battery: 'normal',
    coefficients: { screenOpen: 1.1, apiLatency: 8.0, memoryPct: 0, fpsReduction: 0, dbQuery: 1.0, jankMulti: 1.0 },
    notes: [
      'Simulates rural/basement/elevator network',
      'API calls take 8× longer — timeouts likely',
      'Device itself is fine — network is the bottleneck',
    ],
  },
]

// ── Simulation engine ─────────────────────────────────────────────────────────

export function simulateEvents(events: any[], profile: DeviceProfile): any[] {
  const c = profile.coefficients
  return events.map(e => {
    switch (e.type) {
      case 'lifecycle':
        return {
          ...e,
          duration:   e.duration   ? Math.round(e.duration   * c.screenOpen) : e.duration,
          _simulated: true,
        }
      case 'network':
        // Use deterministic failure based on event properties instead of random
        const shouldFail = c.apiLatency > 5 && (e.timestamp % 10 < 3) // 30% fail based on timestamp
        const shouldTimeout = c.apiLatency > 5 && (e.timestamp % 10 < 7) // 70% timeout based on timestamp
        return {
          ...e,
          duration:    e.duration    ? Math.round(e.duration    * c.apiLatency) : e.duration,
          success:     shouldFail ? false : e.success,
          responseCode: shouldTimeout ? 408 : e.responseCode,
          _simulated:  true,
        }
      case 'memory':
        return {
          ...e,
          usagePercentage: Math.min(100, (e.usagePercentage ?? 0) + c.memoryPct),
          isLowMemory:     ((e.usagePercentage ?? 0) + c.memoryPct) > 85,
          _simulated:      true,
        }
      case 'fps':
        return {
          ...e,
          fps:          Math.max(5, (e.fps ?? 60) - c.fpsReduction),
          jankCount:    Math.round((e.jankCount ?? 0) * c.jankMulti),
          droppedFrames: Math.round((e.droppedFrames ?? 0) * c.jankMulti),
          _simulated:   true,
        }
      case 'database':
        return {
          ...e,
          durationMs: e.durationMs ? Math.round(e.durationMs * c.dbQuery) : e.durationMs,
          isSlow:     e.durationMs ? (e.durationMs * c.dbQuery) > 100 : e.isSlow,
          _simulated: true,
        }
      default:
        return e
    }
  })
}

// ── Diff summary ──────────────────────────────────────────────────────────────

function diffSummary(original: any[], simulated: any[]) {
  const orig = {
    avgScreen: avg(original.filter(e => e.type === 'lifecycle' && e.duration).map(e => e.duration)),
    avgApi:    avg(original.filter(e => e.type === 'network').map(e => e.duration)),
    avgFps:    avg(original.filter(e => e.type === 'fps').map(e => e.fps)),
    avgMem:    avg(original.filter(e => e.type === 'memory').map(e => e.usagePercentage)),
    apiErrors: original.filter(e => e.type === 'network' && (!e.success || (e.responseCode ?? 200) >= 400)).length,
  }
  const sim = {
    avgScreen: avg(simulated.filter(e => e.type === 'lifecycle' && e.duration).map(e => e.duration)),
    avgApi:    avg(simulated.filter(e => e.type === 'network').map(e => e.duration)),
    avgFps:    avg(simulated.filter(e => e.type === 'fps').map(e => e.fps)),
    avgMem:    avg(simulated.filter(e => e.type === 'memory').map(e => e.usagePercentage)),
    apiErrors: simulated.filter(e => e.type === 'network' && (!e.success || (e.responseCode ?? 200) >= 400)).length,
  }
  return { orig, sim }
}

function avg(arr: number[]) {
  return arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0
}

function pct(a: number, b: number) {
  if (!a || !b) return 0
  return Math.round(((b - a) / a) * 100)
}

// ── Tier badge ────────────────────────────────────────────────────────────────

const TIER_CLS: Record<string, string> = {
  flagship: 'text-blue-400 border-blue-900 bg-[#0f1a2a]',
  mid:      'text-yellow-400 border-yellow-900 bg-[#2a2a0a]',
  low:      'text-red-400 border-red-900 bg-[#2a0f0f]',
  custom:   'text-gray-400 border-gray-700 bg-[#1a1a1a]',
}

const NET_LABEL: Record<string, string> = {
  wifi: 'WiFi', '4g': '4G', 'weak4g': '4G Weak', '3g': '3G', '2g': '2G Edge',
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  events: any[]
  onSimulate: (simulated: any[], profileName: string) => void
  onReset: () => void
  isSimulating: boolean
  activeProfile?: string | null
}

export function DeviceTwin({ events, onSimulate, onReset, isSimulating, activeProfile }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const profile = DEVICE_PROFILES.find(p => p.id === selected)

  const { diff, simEvents } = useMemo(() => {
    if (!profile || events.length === 0) return { diff: null, simEvents: [] }
    const sim = simulateEvents(events, profile)
    return { diff: diffSummary(events, sim), simEvents: sim }
  }, [events, profile])

  const activate = () => {
    if (!simEvents.length || !profile) return
    onSimulate(simEvents, profile.name)
  }

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">

      {/* Header */}
      <div
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#161616] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          {isSimulating && (
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
          )}
          <div className="text-left">
            <div className="text-[10px] font-mono font-bold text-white tracking-widest">
              DEVICE TWIN SIMULATOR
            </div>
            <div className="text-[9px] font-mono text-gray-600 mt-0.5">
              {isSimulating && profile
                ? `Simulating: ${profile.name} — ${NET_LABEL[profile.network]}, ${profile.battery === 'saver' ? 'Battery Saver' : 'Normal Battery'}`
                : 'Replay your session as a low-end device user'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isSimulating && (
            <button
              onClick={e => { e.stopPropagation(); onReset() }}
              className="text-[9px] font-mono text-orange-400 border border-orange-900 px-3 py-1 rounded hover:bg-orange-950 transition-colors"
            >
              EXIT TWIN
            </button>
          )}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#555" strokeWidth="1.5"
            className={`transition-transform ${expanded ? 'rotate-180' : ''}`}>
            <polyline points="2,4 6,8 10,4" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#1a1a1a] p-5 space-y-6">

          {/* Active device mockup */}
          {profile && (
            <div className="flex justify-center">
              <DeviceMockup 
                profile={profile} 
                isActive={isSimulating && activeProfile === profile.id}
                events={events}
              />
            </div>
          )}

          {/* Device selector with visual previews */}
          <div>
            <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-3">SELECT DEVICE TO SIMULATE</div>
            <DeviceSelector
              profiles={DEVICE_PROFILES}
              selected={selected}
              onSelect={setSelected}
              activeProfile={activeProfile}
            />
          </div>

          {/* Selected profile detail */}
          {profile && (
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4 space-y-3">

              {/* What makes it slow */}
              <div>
                <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-2">WHY THIS DEVICE IS SLOWER</div>
                <div className="space-y-1">
                  {profile.notes.map((n, i) => (
                    <div key={i} className="flex items-start gap-2 text-[10px] font-mono text-gray-400">
                      <span className="text-gray-700 flex-shrink-0">›</span>
                      {n}
                    </div>
                  ))}
                </div>
              </div>

              {/* Coefficients */}
              <div>
                <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-2">SIMULATION COEFFICIENTS</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Screen Open', val: `${profile.coefficients.screenOpen}×` },
                    { label: 'API Latency', val: `${profile.coefficients.apiLatency}×` },
                    { label: 'DB Queries',  val: `${profile.coefficients.dbQuery}×` },
                    { label: 'Memory +',    val: `+${profile.coefficients.memoryPct}%` },
                    { label: 'FPS −',       val: `−${profile.coefficients.fpsReduction}` },
                    { label: 'Jank ×',      val: `${profile.coefficients.jankMulti}×` },
                  ].map((c, i) => (
                    <div key={i} className="bg-[#111] border border-[#1e1e1e] rounded p-2 text-center">
                      <div className="text-[9px] font-mono text-gray-600">{c.label}</div>
                      <div className={`text-sm font-black font-mono mt-0.5 ${
                        parseFloat(c.val) > 3 ? 'text-red-400' :
                        parseFloat(c.val) > 1.5 ? 'text-yellow-400' : 'text-gray-300'
                      }`}>{c.val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Predicted impact */}
              {diff && (
                <div>
                  <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-2">PREDICTED IMPACT ON YOUR SESSION</div>
                  <div className="space-y-2">
                    {[
                      { label: 'Screen open time', orig: `${diff.orig.avgScreen}ms`, sim: `${diff.sim.avgScreen}ms`, delta: pct(diff.orig.avgScreen, diff.sim.avgScreen) },
                      { label: 'API response time', orig: `${diff.orig.avgApi}ms`,    sim: `${diff.sim.avgApi}ms`,    delta: pct(diff.orig.avgApi,    diff.sim.avgApi)    },
                      { label: 'Average FPS',       orig: `${diff.orig.avgFps}`,      sim: `${diff.sim.avgFps}`,      delta: pct(diff.orig.avgFps,    diff.sim.avgFps)    },
                      { label: 'Memory usage',      orig: `${diff.orig.avgMem}%`,     sim: `${diff.sim.avgMem}%`,     delta: pct(diff.orig.avgMem,    diff.sim.avgMem)    },
                      { label: 'API errors',        orig: String(diff.orig.apiErrors), sim: String(diff.sim.apiErrors), delta: pct(diff.orig.apiErrors, diff.sim.apiErrors) },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center gap-3 text-[10px] font-mono">
                        <span className="text-gray-600 w-32 flex-shrink-0">{row.label}</span>
                        <span className="text-gray-400">{row.orig}</span>
                        <span className="text-gray-700">→</span>
                        <span className={row.delta > 50 ? 'text-red-400 font-bold' : row.delta > 20 ? 'text-yellow-400' : 'text-gray-300'}>
                          {row.sim}
                        </span>
                        {row.delta !== 0 && (
                          <span className={`text-[9px] ${row.delta > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {row.delta > 0 ? '+' : ''}{row.delta}%
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activate button */}
              <button
                onClick={activate}
                disabled={events.length === 0}
                className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[10px] font-mono font-bold tracking-widest rounded transition-colors"
              >
                SIMULATE ON {profile.name.toUpperCase()}
              </button>
              <p className="text-[9px] font-mono text-gray-700 text-center">
                All dashboard tabs will reflect {profile.name} performance. Real device unaffected.
              </p>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
