'use client'

import { useEffect, useState } from 'react'
import { DeviceProfile } from './DeviceTwin'
import { RealAppMirror } from './RealAppMirror'

// Hook to prevent hydration mismatches
function useIsClient() {
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  return isClient
}

interface SimulationDisplayProps {
  profile: DeviceProfile
  events: any[]
  isActive: boolean
}

// Simulated app screens that cycle through
const APP_SCREENS = [
  {
    name: 'Home Screen',
    color: 'from-blue-900/30 to-blue-800/20',
    elements: [
      { type: 'header', text: 'E-Commerce App' },
      { type: 'search', text: 'Search products...' },
      { type: 'grid', items: 6 },
    ]
  },
  {
    name: 'Product List',
    color: 'from-green-900/30 to-green-800/20',
    elements: [
      { type: 'header', text: 'Products' },
      { type: 'filter', text: 'Filter & Sort' },
      { type: 'list', items: 4 },
    ]
  },
  {
    name: 'Product Detail',
    color: 'from-purple-900/30 to-purple-800/20',
    elements: [
      { type: 'image', text: 'Product Image' },
      { type: 'title', text: 'Product Name' },
      { type: 'price', text: '$99.99' },
      { type: 'button', text: 'Add to Cart' },
    ]
  },
  {
    name: 'Cart',
    color: 'from-orange-900/30 to-orange-800/20',
    elements: [
      { type: 'header', text: 'Shopping Cart' },
      { type: 'list', items: 2 },
      { type: 'total', text: 'Total: $199.98' },
      { type: 'button', text: 'Checkout' },
    ]
  }
]

export function DeviceSimulationDisplay({ profile, events, isActive }: SimulationDisplayProps) {
  const isClient = useIsClient()

  // Don't render dynamic content during SSR
  if (!isClient) {
    return (
      <div className="w-48 h-96 relative">
        <svg viewBox="0 0 180 360" className="w-full h-full">
          <rect x="10" y="10" width="160" height="340" rx="25" ry="25" 
                fill="#1a1a1a" stroke="#333" strokeWidth="2"/>
          <rect x="15" y="25" width="150" height="310" rx="20" ry="20" 
                fill="#000" stroke="#444" strokeWidth="1"/>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[150px] h-[310px] mt-[25px] ml-[15px] bg-gradient-to-b from-gray-900/20 to-gray-800/20 rounded-[20px] flex flex-col items-center justify-center">
            <div className="text-[8px] font-mono text-gray-400">Loading...</div>
          </div>
        </div>
      </div>
    )
  }

  // Use the real app mirror for authentic app mirroring
  return <RealAppMirror profile={profile} events={events} isActive={isActive} />
}