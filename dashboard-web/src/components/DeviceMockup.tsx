'use client'

import { DeviceProfile } from './DeviceTwin'
import { DeviceSimulationDisplay } from './DeviceSimulationDisplay'
import { useEffect, useState } from 'react'

// Hook to prevent hydration mismatches
function useIsClient() {
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  return isClient
}

interface DeviceMockupProps {
  profile: DeviceProfile
  isActive: boolean
  events?: any[]
  children?: React.ReactNode
}

// Device SVG components with realistic proportions and bezels
const DeviceSVGs = {
  // Flagship devices - minimal bezels, premium look
  pixel8: (
    <svg viewBox="0 0 180 360" className="w-full h-full">
      {/* Device body */}
      <rect x="10" y="10" width="160" height="340" rx="25" ry="25" 
            fill="#1a1a1a" stroke="#333" strokeWidth="2"/>
      {/* Screen */}
      <rect x="15" y="25" width="150" height="310" rx="20" ry="20" 
            fill="#000" stroke="#444" strokeWidth="1"/>
      {/* Camera bar */}
      <rect x="50" y="15" width="80" height="8" rx="4" ry="4" fill="#333"/>
      {/* Speaker */}
      <rect x="70" y="345" width="40" height="3" rx="1.5" ry="1.5" fill="#666"/>
    </svg>
  ),

  // Mid-range devices - moderate bezels
  samsung_a54: (
    <svg viewBox="0 0 180 360" className="w-full h-full">
      {/* Device body */}
      <rect x="8" y="8" width="164" height="344" rx="22" ry="22" 
            fill="#2a2a3a" stroke="#444" strokeWidth="2"/>
      {/* Screen */}
      <rect x="18" y="35" width="144" height="290" rx="18" ry="18" 
            fill="#000" stroke="#555" strokeWidth="1"/>
      {/* Top bezel with camera */}
      <circle cx="90" cy="25" r="4" fill="#333"/>
      {/* Bottom bezel */}
      <rect x="18" y="325" width="144" height="20" rx="10" ry="10" fill="#1a1a1a"/>
      {/* Samsung logo area */}
      <text x="90" y="340" textAnchor="middle" fontSize="8" fill="#666">SAMSUNG</text>
    </svg>
  ),

  moto_g32: (
    <svg viewBox="0 0 180 360" className="w-full h-full">
      {/* Device body */}
      <rect x="12" y="12" width="156" height="336" rx="20" ry="20" 
            fill="#1a1a2e" stroke="#333" strokeWidth="2"/>
      {/* Screen */}
      <rect x="22" y="40" width="136" height="280" rx="15" ry="15" 
            fill="#000" stroke="#444" strokeWidth="1"/>
      {/* Top bezel */}
      <rect x="22" y="20" width="136" height="20" rx="10" ry="10" fill="#0f0f23"/>
      {/* Camera notch */}
      <circle cx="90" cy="30" r="3" fill="#222"/>
      {/* Motorola logo */}
      <circle cx="90" cy="335" r="8" fill="#333" stroke="#555" strokeWidth="1"/>
      <text x="90" y="340" textAnchor="middle" fontSize="6" fill="#666">M</text>
    </svg>
  ),

  // Low-end devices - larger bezels, thicker design
  samsung_a13: (
    <svg viewBox="0 0 180 360" className="w-full h-full">
      {/* Device body */}
      <rect x="15" y="15" width="150" height="330" rx="18" ry="18" 
            fill="#2a2a2a" stroke="#444" strokeWidth="3"/>
      {/* Screen */}
      <rect x="25" y="45" width="130" height="250" rx="12" ry="12" 
            fill="#000" stroke="#555" strokeWidth="1"/>
      {/* Large top bezel */}
      <rect x="25" y="25" width="130" height="20" rx="8" ry="8" fill="#1a1a1a"/>
      {/* Camera */}
      <circle cx="90" cy="35" r="3" fill="#333"/>
      {/* Large bottom bezel */}
      <rect x="25" y="295" width="130" height="35" rx="8" ry="8" fill="#1a1a1a"/>
      {/* Home button */}
      <rect x="80" y="308" width="20" height="8" rx="4" ry="4" fill="#333"/>
    </svg>
  ),

  redmi_9a: (
    <svg viewBox="0 0 180 360" className="w-full h-full">
      {/* Device body */}
      <rect x="18" y="18" width="144" height="324" rx="15" ry="15" 
            fill="#1a1a1a" stroke="#333" strokeWidth="3"/>
      {/* Screen */}
      <rect x="28" y="50" width="124" height="240" rx="10" ry="10" 
            fill="#000" stroke="#444" strokeWidth="1"/>
      {/* Large top bezel */}
      <rect x="28" y="28" width="124" height="22" rx="6" ry="6" fill="#0f0f0f"/>
      {/* Camera and speaker */}
      <circle cx="90" cy="39" r="2.5" fill="#222"/>
      <rect x="70" y="36" width="15" height="2" rx="1" ry="1" fill="#333"/>
      {/* Large bottom bezel */}
      <rect x="28" y="290" width="124" height="40" rx="6" ry="6" fill="#0f0f0f"/>
      {/* Xiaomi logo */}
      <text x="90" y="315" textAnchor="middle" fontSize="7" fill="#555">Mi</text>
    </svg>
  ),

  // Special case - good device representation
  weak_network: (
    <svg viewBox="0 0 180 360" className="w-full h-full">
      {/* Device body - premium look */}
      <rect x="10" y="10" width="160" height="340" rx="25" ry="25" 
            fill="#1a1a1a" stroke="#333" strokeWidth="2"/>
      {/* Screen */}
      <rect x="15" y="25" width="150" height="310" rx="20" ry="20" 
            fill="#000" stroke="#444" strokeWidth="1"/>
      {/* Network signal overlay - weak bars */}
      <g transform="translate(140, 35)">
        <rect x="0" y="15" width="3" height="5" fill="#ff4444"/>
        <rect x="5" y="12" width="3" height="8" fill="#333"/>
        <rect x="10" y="8" width="3" height="12" fill="#333"/>
        <rect x="15" y="5" width="3" height="15" fill="#333"/>
      </g>
      {/* WiFi icon with X */}
      <g transform="translate(120, 35)">
        <path d="M5 15 Q10 10 15 15" stroke="#ff4444" strokeWidth="2" fill="none"/>
        <line x1="2" y1="12" x2="18" y2="18" stroke="#ff4444" strokeWidth="2"/>
        <line x1="18" y1="12" x2="2" y2="18" stroke="#ff4444" strokeWidth="2"/>
      </g>
    </svg>
  ),
}

// Device screen size information
const DeviceSpecs = {
  pixel8: { width: '6.7"', height: '3.0"', resolution: '2992×1344', density: '489 PPI' },
  samsung_a54: { width: '6.4"', height: '2.9"', resolution: '2340×1080', density: '403 PPI' },
  moto_g32: { width: '6.5"', height: '3.0"', resolution: '2400×1080', density: '405 PPI' },
  samsung_a13: { width: '6.6"', height: '3.0"', resolution: '2408×1080', density: '400 PPI' },
  redmi_9a: { width: '6.53"', height: '3.0"', resolution: '1600×720', density: '269 PPI' },
  weak_network: { width: '6.4"', height: '2.9"', resolution: '2340×1080', density: '403 PPI' },
}

export function DeviceMockup({ profile, isActive, events = [], children }: DeviceMockupProps) {
  const isClient = useIsClient()
  const specs = DeviceSpecs[profile.id as keyof typeof DeviceSpecs] || DeviceSpecs.pixel8

  // Use the advanced simulation display when active and client-side
  if (isActive && isClient) {
    return (
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <DeviceSimulationDisplay 
            profile={profile} 
            events={events} 
            isActive={isActive} 
          />
        </div>
        
        {/* Device Info */}
        <div className="text-center space-y-1">
          <div className="text-sm font-mono font-bold text-white">{profile.name}</div>
          <div className="text-xs font-mono text-gray-400">
            {specs.width} × {specs.height} • {specs.resolution}
          </div>
          <div className="text-xs font-mono text-gray-600">{specs.density}</div>
          
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            <span className="text-[10px] font-mono text-orange-400 font-bold tracking-widest">
              LIVE SIMULATION
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Static device preview when not active
  const deviceSvg = DeviceSVGs[profile.id as keyof typeof DeviceSVGs] || DeviceSVGs.pixel8

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Device Frame */}
      <div className={`relative transition-all duration-500 ${
        isActive 
          ? 'scale-110 drop-shadow-2xl' 
          : 'scale-100 opacity-60'
      }`}>
        <div className="w-48 h-96 relative">
          {deviceSvg}
          
          {/* Screen content overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[150px] h-[310px] mt-[25px] ml-[15px] bg-gradient-to-b from-gray-900/20 to-gray-800/20 rounded-[20px] flex flex-col items-center justify-center text-center p-4">
              {children || (
                <div className="space-y-2">
                  <div className="w-8 h-8 rounded-full bg-gray-600 mx-auto" />
                  <div className="text-[8px] font-mono text-gray-400">
                    {profile.name}
                  </div>
                  <div className="text-[6px] font-mono text-gray-600">
                    {profile.ram} • {profile.network.toUpperCase()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Device Info */}
      <div className="text-center space-y-1">
        <div className="text-sm font-mono font-bold text-white">{profile.name}</div>
        <div className="text-xs font-mono text-gray-400">
          {specs.width} × {specs.height} • {specs.resolution}
        </div>
        <div className="text-xs font-mono text-gray-600">{specs.density}</div>
      </div>
    </div>
  )
}

// Device selector with visual previews
interface DeviceSelectorProps {
  profiles: DeviceProfile[]
  selected: string | null
  onSelect: (id: string) => void
  activeProfile?: string | null
}

export function DeviceSelector({ profiles, selected, onSelect, activeProfile }: DeviceSelectorProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {profiles.map(profile => (
        <button
          key={profile.id}
          onClick={() => onSelect(profile.id)}
          className={`relative p-3 rounded-lg border transition-all hover:scale-105 ${
            selected === profile.id
              ? 'border-blue-600 bg-[#0f1a2a] shadow-lg'
              : 'border-[#1e1e1e] hover:border-[#2a2a2a] bg-[#0d0d0d]'
          } ${activeProfile === profile.id ? 'ring-2 ring-orange-400' : ''}`}
        >
          {/* Mini device preview */}
          <div className="w-12 h-24 mx-auto mb-2 relative">
            <div className="scale-[0.25] origin-top-left">
              {DeviceSVGs[profile.id as keyof typeof DeviceSVGs] || DeviceSVGs.pixel8}
            </div>
            {activeProfile === profile.id && (
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-orange-400 animate-pulse" />
            )}
          </div>
          
          {/* Device name */}
          <div className="text-[10px] font-mono font-bold text-white text-center leading-tight">
            {profile.name}
          </div>
          
          {/* Quick specs */}
          <div className="text-[8px] font-mono text-gray-600 text-center mt-1">
            {profile.ram} • {profile.network.toUpperCase()}
          </div>
          
          {/* Tier badge */}
          <div className={`absolute top-1 right-1 text-[6px] font-mono font-bold px-1 py-0.5 rounded ${
            profile.tier === 'flagship' ? 'bg-blue-900 text-blue-400' :
            profile.tier === 'mid' ? 'bg-yellow-900 text-yellow-400' :
            profile.tier === 'low' ? 'bg-red-900 text-red-400' :
            'bg-gray-800 text-gray-400'
          }`}>
            {profile.tier.charAt(0).toUpperCase()}
          </div>
        </button>
      ))}
    </div>
  )
}