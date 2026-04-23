'use client'

import { useEffect, useState } from 'react'

const STEPS = [
  { label: 'ESTABLISHING WEBSOCKET...', sub: 'KERNEL INITIALIZATION IN PROGRESS' },
  { label: 'LOADING PERFORMANCE ENGINE...', sub: 'ALLOCATING MEMORY BUFFERS' },
  { label: 'SYNCING CLOUD EVENTS...', sub: 'FETCHING SESSION DATA' },
  { label: 'READY', sub: 'ALL SYSTEMS OPERATIONAL' },
]

interface SplashScreenProps {
  onComplete: () => void
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const duration = 2800
    const interval = 30
    const steps = duration / interval
    let tick = 0
    let done = false

    const timer = setInterval(() => {
      tick++
      const pct = Math.min((tick / steps) * 100, 100)
      setProgress(pct)
      setStepIndex(Math.min(Math.floor((pct / 100) * STEPS.length), STEPS.length - 1))

      if (pct >= 100 && !done) {
        done = true
        clearInterval(timer)
        setTimeout(() => {
          setFadeOut(true)
          setTimeout(() => onComplete(), 600)
        }, 400)
      }
    }, interval)

    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0a] transition-opacity duration-600 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Logo + Name */}
      <div className="flex items-center gap-4 mb-6">
        {/* Chart icon — matches the image */}
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="28" width="7" height="14" rx="1.5" fill="#2563EB" />
          <rect x="13" y="18" width="7" height="24" rx="1.5" fill="#3B82F6" />
          <rect x="24" y="10" width="7" height="32" rx="1.5" fill="#60A5FA" />
          <polyline
            points="5,27 16,17 27,9 38,4"
            stroke="#93C5FD"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <circle cx="38" cy="4" r="3" fill="#93C5FD" />
        </svg>
        <span className="text-4xl font-black text-white tracking-tight">DroidPulse</span>
      </div>

      {/* Version badge */}
      <div className="mb-10 px-4 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-sm text-gray-400 font-mono">
        V1.5.0
      </div>

      {/* Progress bar */}
      <div className="w-64 h-0.5 bg-[#2a2a2a] rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-75 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Status text */}
      <div className="text-center space-y-1">
        <div className="flex items-center gap-2 justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-xs font-mono text-gray-300 tracking-widest">
            {STEPS[stepIndex].label}
          </span>
        </div>
        <p className="text-[10px] font-mono text-gray-600 tracking-widest">
          {STEPS[stepIndex].sub}
        </p>
      </div>

      {/* Footer */}
      <div className="absolute bottom-10 text-[10px] font-mono text-gray-700 tracking-[0.3em]">
        ANDROID PERFORMANCE ENGINE
      </div>
    </div>
  )
}
