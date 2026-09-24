'use client'

import React, { useMemo } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'

interface FaceAuthMetricsProps {
  events: any[]
}

const SCORE_BUCKETS = [0, 40, 60, 75, 85, 100]

function bucketScores(scores: number[]) {
  const buckets: Record<string, number> = {}
  for (let i = 0; i < SCORE_BUCKETS.length - 1; i++) {
    const k = `${SCORE_BUCKETS[i]}-${SCORE_BUCKETS[i + 1]}`
    buckets[k] = 0
  }
  for (const s of scores) {
    for (let i = 0; i < SCORE_BUCKETS.length - 1; i++) {
      if (s >= SCORE_BUCKETS[i] && s <= SCORE_BUCKETS[i + 1]) {
        buckets[`${SCORE_BUCKETS[i]}-${SCORE_BUCKETS[i + 1]}`]++
        break
      }
    }
  }
  return Object.entries(buckets).map(([range, count]) => ({ range, count }))
}

export default function FaceAuthMetrics({ events }: FaceAuthMetricsProps) {
  const faceEvents = useMemo(() => {
    return events.filter(e => {
      const name = (e.event_name || e.event || '').toString().toLowerCase()
      const props = e.properties || e.payload || {}
      return (
        name.includes('face') ||
        name.includes('liveness') ||
        props.liveness_score !== undefined ||
        props.retry_count !== undefined ||
        props.livenessAttempts !== undefined
      )
    })
  }, [events])

  const livenessScores = useMemo(() => (
    faceEvents.map(e => Number(e.properties?.liveness_score ?? e.properties?.livenessScore ?? e.liveness_score)).filter(Number.isFinite)
  ), [faceEvents])

  const retryValues = useMemo(() => (
    faceEvents.map(e => Number(e.properties?.retry_count ?? e.properties?.retryCount ?? e.retry_count)).filter(Number.isFinite)
  ), [faceEvents])

  const avgLiveness = livenessScores.length ? Math.round(livenessScores.reduce((a, b) => a + b, 0) / livenessScores.length) : 0
  const successCount = faceEvents.filter(e => ((e.event_name||e.event||'').toLowerCase().includes('success')) || e.properties?.status === 'success').length
  const failCount = faceEvents.length - successCount

  const scoreBuckets = bucketScores(livenessScores)

  const retryBuckets = useMemo(() => {
    const map: Record<number, number> = {}
    for (const r of retryValues) map[r] = (map[r] || 0) + 1
    return Object.keys(map).sort((a, b) => Number(a) - Number(b)).map(k => ({ retries: Number(k), count: map[Number(k)] }))
  }, [retryValues])

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1e1e1e] flex items-center justify-between">
        <div>
          <div className="text-[10px] font-mono text-gray-400 tracking-widest">FACE AUTH METRICS</div>
          <div className="text-[9px] font-mono text-gray-600 mt-0.5">Liveness score, retries and success rates</div>
        </div>
        <div className="text-[10px] font-mono text-gray-600">LAST 24H</div>
      </div>

      <div className="p-4 grid grid-cols-3 gap-4">
        <div className="col-span-1 bg-[#0d0d0d] border border-[#1e1e1e] rounded p-3 text-center">
          <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1">AVG LIVENESS</div>
          <div className="text-2xl font-black text-green-400">{avgLiveness}</div>
          <div className="text-[10px] text-gray-500 mt-1">based on {livenessScores.length} samples</div>
        </div>

        <div className="col-span-1 bg-[#0d0d0d] border border-[#1e1e1e] rounded p-3 text-center">
          <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1">SUCCESS / FAIL</div>
          <div className="text-2xl font-black text-white">{faceEvents.length}</div>
          <div className="mt-2 text-[10px] font-mono">
            <span className="text-green-400 font-bold">{successCount}</span>
            <span className="text-gray-500 mx-2"> / </span>
            <span className="text-red-400 font-bold">{failCount}</span>
          </div>
        </div>

        <div className="col-span-1 bg-[#0d0d0d] border border-[#1e1e1e] rounded p-3 text-center">
          <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1">RETRY SAMPLES</div>
          <div className="text-lg font-black text-white">{retryValues.length}</div>
          <div className="text-[10px] text-gray-500 mt-1">unique retries: {retryBuckets.length}</div>
        </div>

        <div className="col-span-2 bg-[#0d0d0d] border border-[#1e1e1e] rounded p-3">
          <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-2">LIVENESS SCORE DISTRIBUTION</div>
          {scoreBuckets.length === 0 ? (
            <div className="text-[10px] font-mono text-gray-600">No liveness scores yet</div>
          ) : (
            <div style={{ width: '100%', height: 140 }}>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={scoreBuckets} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#111', border: '1px solid #2a2a2a', fontSize: 10 }} />
                  <Bar dataKey="count" fill="#3b82f6">
                    {scoreBuckets.map((s, i) => (
                      <Cell key={i} fill={i === scoreBuckets.length - 1 ? '#ef4444' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="col-span-1 bg-[#0d0d0d] border border-[#1e1e1e] rounded p-3">
          <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-2">RETRY COUNT HISTOGRAM</div>
          {retryBuckets.length === 0 ? (
            <div className="text-[10px] font-mono text-gray-600">No retry data</div>
          ) : (
            <div style={{ width: '100%', height: 140 }}>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={retryBuckets} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="retries" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#111', border: '1px solid #2a2a2a', fontSize: 10 }} />
                  <Bar dataKey="count" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
