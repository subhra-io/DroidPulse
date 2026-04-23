'use client'

import { ReplayState, CrashAnalysis } from '@/hooks/useReproduceTrace'

interface Props {
  state: ReplayState
  onPause:  () => void
  onResume: () => void
  onExit:   () => void
}

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[9px] font-mono text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  )
}

export function ReplayBanner({ state, onPause, onResume, onExit }: Props) {
  if (state.phase === 'idle') return null

  const isRunning  = state.phase === 'replaying'
  const isFetching = state.phase === 'fetching'
  const isDone     = state.phase === 'done'
  const isPaused   = state.phase === 'paused'

  // Count event types in visible events
  const typeCounts: Record<string, number> = {}
  state.visibleEvents.forEach(e => { typeCounts[e.type] = (typeCounts[e.type] ?? 0) + 1 })

  return (
    <div className="fixed top-12 left-52 right-0 z-40 border-b border-red-900 bg-[#0d0d0d]">
      {/* main bar */}
      <div className="flex items-center gap-4 px-6 py-2.5">
        {/* status dot + label */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isFetching ? (
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          ) : isDone ? (
            <span className="w-2 h-2 rounded-full bg-green-400" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
          <span className="text-[10px] font-mono font-bold tracking-widest text-red-400">
            {isFetching ? 'LOADING TRACE…' : isDone ? 'REPLAY COMPLETE' : isPaused ? 'REPLAY PAUSED' : 'REPLAY MODE'}
          </span>
        </div>

        <span className="text-gray-700 text-xs">|</span>

        {/* crash type */}
        <span className="text-[10px] font-mono text-gray-400 truncate max-w-xs">
          {state.crash?.type ?? state.crash?.crashType ?? 'EXCEPTION'}
        </span>

        {/* progress */}
        {!isFetching && (
          <div className="flex-1 max-w-48">
            <ProgressBar value={state.stepIndex} total={state.totalSteps} />
          </div>
        )}

        {/* event counters */}
        {!isFetching && (
          <div className="flex items-center gap-3 text-[9px] font-mono">
            {Object.entries(typeCounts).map(([t, n]) => (
              <span key={t} className="text-gray-600">
                <span className="text-gray-400">{n}</span> {t}
              </span>
            ))}
          </div>
        )}

        {/* controls */}
        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
          {!isFetching && !isDone && (
            <button
              onClick={isRunning ? onPause : onResume}
              className="px-3 py-1 text-[9px] font-mono font-bold border border-[#2a2a2a] text-gray-400 hover:text-white hover:border-gray-500 rounded tracking-widest transition-colors"
            >
              {isRunning ? '⏸ PAUSE' : '▶ RESUME'}
            </button>
          )}
          <button
            onClick={onExit}
            className="px-3 py-1 text-[9px] font-mono font-bold border border-red-900 text-red-400 hover:bg-red-950 rounded tracking-widest transition-colors"
          >
            ✕ EXIT REPLAY
          </button>
        </div>
      </div>

      {/* analysis panel — shown when done */}
      {(isDone || isPaused) && state.analysis && (
        <ReplayAnalysisPanel analysis={state.analysis} crash={state.crash} />
      )}
    </div>
  )
}

// ── Analysis panel ────────────────────────────────────────────────────────────

function ReplayAnalysisPanel({ analysis, crash }: { analysis: CrashAnalysis; crash: any }) {
  return (
    <div className="border-t border-[#1e1e1e] px-6 py-4 grid grid-cols-4 gap-6 bg-[#0a0a0a]">

      {/* Root cause */}
      <div>
        <div className="text-[9px] font-mono text-red-500 tracking-widest mb-2">ROOT_CAUSE</div>
        <p className="text-[10px] font-mono text-gray-300 leading-relaxed">{analysis.rootCause}</p>
        {analysis.memoryPressure && (
          <div className="mt-2 flex items-center gap-1.5 text-[9px] font-mono text-yellow-400">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
            MEMORY PRESSURE DETECTED
          </div>
        )}
        {analysis.mainThreadBlock && (
          <div className="mt-1 flex items-center gap-1.5 text-[9px] font-mono text-orange-400">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            MAIN THREAD BLOCKED
          </div>
        )}
      </div>

      {/* Affected flow */}
      <div>
        <div className="text-[9px] font-mono text-gray-500 tracking-widest mb-2">AFFECTED_FLOW</div>
        <div className="space-y-1">
          {analysis.affectedFlow.length > 0
            ? analysis.affectedFlow.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px] font-mono text-gray-400">
                  {i > 0 && <span className="text-gray-700">→</span>}
                  <span className={i === analysis.affectedFlow.length - 1 ? 'text-red-400' : ''}>{s}</span>
                </div>
              ))
            : <span className="text-[10px] font-mono text-gray-700">No screen flow captured</span>
          }
        </div>
      </div>

      {/* Suspect APIs / queries */}
      <div>
        <div className="text-[9px] font-mono text-gray-500 tracking-widest mb-2">SUSPECT_CALLS</div>
        <div className="space-y-1">
          {analysis.suspectApis.map((a, i) => (
            <div key={i} className="text-[10px] font-mono text-orange-400 truncate">{a}</div>
          ))}
          {analysis.suspectQueries.map((q, i) => (
            <div key={i} className="text-[10px] font-mono text-yellow-400 truncate">{q.slice(0, 40)}</div>
          ))}
          {analysis.suspectApis.length === 0 && analysis.suspectQueries.length === 0 && (
            <span className="text-[10px] font-mono text-gray-700">None detected</span>
          )}
        </div>
      </div>

      {/* Recommendations */}
      <div>
        <div className="text-[9px] font-mono text-green-600 tracking-widest mb-2">RECOMMENDATIONS</div>
        <div className="space-y-1.5">
          {analysis.recommendation.map((r, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[10px] font-mono text-gray-400 leading-relaxed">
              <span className="text-green-600 flex-shrink-0 mt-0.5">›</span>
              {r}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
