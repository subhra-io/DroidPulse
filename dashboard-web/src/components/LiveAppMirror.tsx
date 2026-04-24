'use client'

import { useEffect, useState, useCallback } from 'react'
import { DeviceProfile } from './DeviceTwin'

interface LiveAppMirrorProps {
  profile: DeviceProfile
  events: any[]
  isActive: boolean
}

interface MirroredApiCall {
  id: string
  method: string
  url: string
  originalDuration: number
  simulatedDuration: number
  status: 'loading' | 'success' | 'error' | 'timeout'
  responseSize: number
  timestamp: number
  data?: any
}

interface AppScreen {
  name: string
  component: string
  apiCalls: string[]
  isLoading: boolean
  data: any
}

// Real app screens that mirror your actual e-commerce app
const APP_SCREENS: Record<string, AppScreen> = {
  home: {
    name: 'Home',
    component: 'MainActivity',
    apiCalls: ['/api/products/featured', '/api/user/profile', '/api/cart/count'],
    isLoading: false,
    data: null
  },
  products: {
    name: 'Products',
    component: 'ProductListActivity',
    apiCalls: ['/api/products/search', '/api/categories', '/api/filters'],
    isLoading: false,
    data: null
  },
  detail: {
    name: 'Product Detail',
    component: 'ProductDetailActivity',
    apiCalls: ['/api/products/123', '/api/reviews/123', '/api/recommendations/123'],
    isLoading: false,
    data: null
  },
  cart: {
    name: 'Cart',
    component: 'CartActivity',
    apiCalls: ['/api/cart', '/api/shipping/calculate', '/api/payment/methods'],
    isLoading: false,
    data: null
  }
}

export function LiveAppMirror({ profile, events, isActive }: LiveAppMirrorProps) {
  const [currentScreen, setCurrentScreen] = useState<keyof typeof APP_SCREENS>('home')
  const [mirroredCalls, setMirroredCalls] = useState<MirroredApiCall[]>([])
  const [screenData, setScreenData] = useState(APP_SCREENS)
  const [realTimeEvents, setRealTimeEvents] = useState<any[]>([])

  // Listen to real events from your app
  useEffect(() => {
    if (!isActive) return

    // Filter and process real network events - look for any network-related events
    const networkEvents = events.filter(e => 
      e.type === 'network' || 
      e.type === 'api' || 
      e.endpoint || 
      e.url || 
      e.method
    ).slice(-10)
    
    console.log('Network events found:', networkEvents) // Debug log
    setRealTimeEvents(networkEvents)

    // If no real network events, create demo events to show the concept
    if (networkEvents.length === 0) {
      // Create demo API calls that simulate your e-commerce app
      const demoEvents = [
        {
          id: `demo-${Date.now()}-1`,
          type: 'network',
          method: 'GET',
          url: '/api/products/featured',
          duration: 180,
          responseCode: 200,
          responseSize: 15000,
          timestamp: Date.now() - 3000
        },
        {
          id: `demo-${Date.now()}-2`,
          type: 'network',
          method: 'GET',
          url: '/api/user/profile',
          duration: 120,
          responseCode: 200,
          responseSize: 2500,
          timestamp: Date.now() - 2000
        },
        {
          id: `demo-${Date.now()}-3`,
          type: 'network',
          method: 'POST',
          url: '/api/cart/add',
          duration: 250,
          responseCode: 201,
          responseSize: 800,
          timestamp: Date.now() - 1000
        }
      ]
      
      demoEvents.forEach(event => {
        const simulatedCall = simulateApiCall(event, profile)
        setMirroredCalls(prev => {
          // Check if this call already exists to prevent duplicates
          if (prev.find(c => c.id === simulatedCall.id)) return prev
          return [...prev.slice(-9), simulatedCall]
        })
        updateScreenFromApiCall(simulatedCall)
      })
      
      setRealTimeEvents(demoEvents)
    } else {
      // Process real network events
      networkEvents.forEach(event => {
        const simulatedCall = simulateApiCall(event, profile)
        setMirroredCalls(prev => {
          // Check if this call already exists to prevent duplicates
          if (prev.find(c => c.id === simulatedCall.id)) return prev
          return [...prev.slice(-9), simulatedCall]
        })
        
        // Update screen state based on API call
        updateScreenFromApiCall(simulatedCall)
      })
    }
  }, [events, profile, isActive]) // Removed mirroredCalls from dependencies

  // Simulate API call with device-specific performance
  const simulateApiCall = useCallback((originalEvent: any, deviceProfile: DeviceProfile): MirroredApiCall => {
    const c = deviceProfile.coefficients
    const originalDuration = originalEvent.duration || 200
    const simulatedDuration = Math.round(originalDuration * c.apiLatency)
    
    // Determine if call fails based on device network
    let status: MirroredApiCall['status'] = 'success'
    if (c.apiLatency > 5 && simulatedDuration > 8000) {
      status = 'timeout'
    } else if (c.apiLatency > 3 && (originalEvent.timestamp % 10 < 2)) {
      status = 'error'
    } else if (simulatedDuration > 1000) {
      status = 'loading'
    }

    return {
      id: originalEvent.id || `${Date.now()}-${Math.random()}`,
      method: originalEvent.method || 'GET',
      url: originalEvent.url || originalEvent.endpoint || '/api/unknown',
      originalDuration,
      simulatedDuration,
      status,
      responseSize: originalEvent.responseSize || Math.round(Math.random() * 50000),
      timestamp: Date.now(),
      data: originalEvent.responseData
    }
  }, [])

  // Update screen state based on API calls
  const updateScreenFromApiCall = useCallback((call: MirroredApiCall) => {
    setScreenData(prev => {
      const screenKey = Object.keys(prev).find(key => 
        prev[key as keyof typeof prev].apiCalls.some(api => 
          call.url.includes(api.replace('/api/', ''))
        )
      ) as keyof typeof APP_SCREENS

      if (screenKey) {
        return {
          ...prev,
          [screenKey]: {
            ...prev[screenKey],
            isLoading: call.status === 'loading',
            data: call.status === 'success' ? call.data : null
          }
        }
      }
      return prev
    })
  }, [])

  // Auto-cycle through screens and simulate API calls
  useEffect(() => {
    if (!isActive) return

    const interval = setInterval(() => {
      setCurrentScreen(prev => {
        const screens = Object.keys(screenData) as (keyof typeof APP_SCREENS)[]
        const currentIndex = screens.indexOf(prev)
        const nextScreen = screens[(currentIndex + 1) % screens.length]
        
        // Simulate API calls when changing screens (only if no real events)
        if (realTimeEvents.length === 0) {
          const screenApis = APP_SCREENS[nextScreen].apiCalls
          screenApis.forEach((apiPath, index) => {
            setTimeout(() => {
              const demoCall = {
                id: `screen-${nextScreen}-${Date.now()}-${index}`,
                type: 'network',
                method: apiPath.includes('search') || apiPath.includes('products') ? 'GET' : 
                       apiPath.includes('add') || apiPath.includes('calculate') ? 'POST' : 'GET',
                url: apiPath,
                duration: 150 + Math.random() * 200,
                responseCode: Math.random() > 0.95 ? 500 : 200,
                responseSize: 1000 + Math.random() * 20000,
                timestamp: Date.now()
              }
              
              const simulatedCall = simulateApiCall(demoCall, profile)
              setMirroredCalls(prev => {
                // Check if this call already exists to prevent duplicates
                if (prev.find(c => c.id === simulatedCall.id)) return prev
                return [...prev.slice(-9), simulatedCall]
              })
              updateScreenFromApiCall(simulatedCall)
            }, index * 300) // Stagger API calls
          })
        }
        
        return nextScreen
      })
    }, 5000) // Slower screen transitions

    return () => clearInterval(interval)
  }, [isActive, profile, realTimeEvents.length]) // Use realTimeEvents.length instead of the full array

  const screen = screenData[currentScreen]
  const recentCalls = mirroredCalls.slice(-3)

  return (
    <div className="relative">
      {/* Device Frame */}
      <div className="w-48 h-96 relative">
        <svg viewBox="0 0 180 360" className="w-full h-full">
          <rect x="10" y="10" width="160" height="340" rx="25" ry="25" 
                fill="#1a1a1a" stroke="#333" strokeWidth="2"/>
          <rect x="15" y="25" width="150" height="310" rx="20" ry="20" 
                fill="#000" stroke="#444" strokeWidth="1"/>
        </svg>

        {/* Live App Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[150px] h-[310px] mt-[25px] ml-[15px] bg-gradient-to-b from-gray-900/90 to-black rounded-[20px] p-3 overflow-hidden">
            
            {/* Status Bar */}
            <div className="flex justify-between items-center mb-2 text-[6px] font-mono text-gray-400">
              <span>{new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}</span>
              <div className="flex items-center gap-1">
                {/* Network strength based on device */}
                <div className="flex gap-0.5">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`w-0.5 h-${i} ${
                      profile.network === 'wifi' ? 'bg-green-400' :
                      profile.network === '4g' ? (i <= 3 ? 'bg-blue-400' : 'bg-gray-600') :
                      profile.network === 'weak4g' ? (i <= 2 ? 'bg-yellow-400' : 'bg-gray-600') :
                      profile.network === '3g' ? (i <= 2 ? 'bg-orange-400' : 'bg-gray-600') :
                      (i === 1 ? 'bg-red-400' : 'bg-gray-600')
                    }`} />
                  ))}
                </div>
                <div className={`w-3 h-1.5 border border-gray-400 rounded-sm ${
                  profile.battery === 'saver' ? 'bg-yellow-400' : 'bg-green-400'
                }`} />
              </div>
            </div>

            {/* App Header */}
            <div className="text-[8px] font-bold text-white text-center py-1 bg-blue-600/80 rounded mb-2">
              {screen.name} - {screen.component}
            </div>

            {/* Loading Overlay for slow devices */}
            {screen.isLoading && profile.coefficients.apiLatency > 2 && (
              <div className="absolute inset-3 bg-black/50 rounded-[17px] flex items-center justify-center z-10">
                <div className="text-center">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-1" />
                  <div className="text-[6px] text-blue-400 font-mono">Loading...</div>
                </div>
              </div>
            )}

            {/* Screen Content */}
            <div className="space-y-2 flex-1">
              {currentScreen === 'home' && (
                <div className="space-y-2">
                  <div className="text-[6px] text-gray-400 bg-gray-800 rounded px-2 py-1">
                    Search products...
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {Array.from({length: 4}).map((_, i) => (
                      <div key={i} className={`aspect-square bg-white/5 rounded border border-white/10 flex items-center justify-center ${
                        screen.isLoading ? 'animate-pulse' : ''
                      }`}>
                        <div className="text-[5px] text-gray-500">IMG</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentScreen === 'products' && (
                <div className="space-y-1">
                  <div className="text-[6px] text-gray-400 text-center py-1 border border-gray-600 rounded">
                    Filter & Sort
                  </div>
                  {Array.from({length: 3}).map((_, i) => (
                    <div key={i} className={`flex gap-2 p-1 bg-white/5 rounded ${
                      screen.isLoading ? 'animate-pulse' : ''
                    }`}>
                      <div className="w-4 h-4 bg-white/10 rounded" />
                      <div className="flex-1 space-y-0.5">
                        <div className="h-1 bg-white/20 rounded w-3/4" />
                        <div className="h-1 bg-white/10 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {currentScreen === 'detail' && (
                <div className="space-y-2">
                  <div className={`aspect-square bg-white/10 rounded border border-white/20 flex items-center justify-center ${
                    screen.isLoading ? 'animate-pulse' : ''
                  }`}>
                    <div className="text-[6px] text-gray-500">PRODUCT</div>
                  </div>
                  <div className="text-[7px] font-bold text-white">Product Name</div>
                  <div className="text-[8px] font-bold text-green-400">$99.99</div>
                  <div className="text-[6px] text-center py-1 bg-blue-600 text-white rounded">
                    Add to Cart
                  </div>
                </div>
              )}

              {currentScreen === 'cart' && (
                <div className="space-y-2">
                  {Array.from({length: 2}).map((_, i) => (
                    <div key={i} className={`flex gap-2 p-1 bg-white/5 rounded ${
                      screen.isLoading ? 'animate-pulse' : ''
                    }`}>
                      <div className="w-3 h-3 bg-white/10 rounded" />
                      <div className="flex-1 text-[6px] text-gray-300">Item {i + 1}</div>
                      <div className="text-[6px] text-green-400">$49.99</div>
                    </div>
                  ))}
                  <div className="text-[7px] font-bold text-white text-right">Total: $99.98</div>
                  <div className="text-[6px] text-center py-1 bg-green-600 text-white rounded">
                    Checkout
                  </div>
                </div>
              )}
            </div>

            {/* Live API Calls Indicator */}
            <div className="absolute bottom-1 left-1 right-1">
              <div className="bg-black/80 rounded px-1 py-0.5">
                <div className="text-[5px] font-mono text-gray-500 mb-0.5">LIVE API CALLS</div>
                {recentCalls.map((call, i) => (
                  <div key={call.id} className="flex items-center justify-between text-[4px] font-mono mb-0.5">
                    <span className="text-gray-400 truncate flex-1">
                      {call.method} {call.url.split('/').pop()}
                    </span>
                    <span className={`ml-1 ${
                      call.status === 'success' ? 'text-green-400' :
                      call.status === 'loading' ? 'text-yellow-400' :
                      call.status === 'error' ? 'text-red-400' :
                      'text-red-500'
                    }`}>
                      {call.status === 'loading' ? '...' : `${call.simulatedDuration}ms`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Performance Metrics - moved further right to avoid overlap */}
      <div className="absolute -right-24 top-0 space-y-2 w-20">
        {/* API Performance */}
        <div className="bg-[#111] border border-[#333] rounded px-2 py-1 text-center">
          <div className="text-[6px] font-mono text-gray-600">API</div>
          <div className={`text-[8px] font-mono font-bold ${
            profile.coefficients.apiLatency <= 1.5 ? 'text-green-400' :
            profile.coefficients.apiLatency <= 3 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {profile.coefficients.apiLatency}×
          </div>
        </div>

        {/* Network Status */}
        <div className="bg-[#111] border border-[#333] rounded px-2 py-1 text-center">
          <div className="text-[6px] font-mono text-gray-600">NET</div>
          <div className={`text-[7px] font-mono font-bold ${
            profile.network === 'wifi' ? 'text-green-400' :
            profile.network === '4g' ? 'text-blue-400' :
            profile.network === 'weak4g' ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            {profile.network.toUpperCase()}
          </div>
        </div>

        {/* Active Calls */}
        <div className="bg-[#111] border border-[#333] rounded px-2 py-1 text-center">
          <div className="text-[6px] font-mono text-gray-600">CALLS</div>
          <div className="text-[8px] font-mono font-bold text-blue-400">
            {recentCalls.filter(c => c.status === 'loading').length}
          </div>
        </div>

        {/* Error Rate */}
        <div className="bg-[#111] border border-[#333] rounded px-2 py-1 text-center">
          <div className="text-[6px] font-mono text-gray-600">ERR</div>
          <div className={`text-[8px] font-mono font-bold ${
            recentCalls.filter(c => c.status === 'error' || c.status === 'timeout').length === 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {Math.round((recentCalls.filter(c => c.status === 'error' || c.status === 'timeout').length / Math.max(recentCalls.length, 1)) * 100)}%
          </div>
        </div>
      </div>

      {/* Screen Info */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-center">
        <div className="text-[8px] font-mono text-gray-600 mb-1">
          {screen.name} • {realTimeEvents.length} API calls mirrored
        </div>
        <div className="flex gap-1 justify-center">
          {Object.keys(screenData).map((key, i) => (
            <div key={key} className={`w-1 h-1 rounded-full ${
              key === currentScreen ? 'bg-blue-400' : 'bg-gray-700'
            }`} />
          ))}
        </div>
      </div>
    </div>
  )
}