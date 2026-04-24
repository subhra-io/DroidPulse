'use client'

import { useEffect, useState, useCallback } from 'react'
import { DeviceProfile } from './DeviceTwin'

interface RealAppMirrorProps {
  profile: DeviceProfile
  events: any[]
  isActive: boolean
}

interface AppScreenData {
  screenName: string
  activityName: string
  elements: UIElement[]
  timestamp: number
  screenshot?: string // Base64 encoded screenshot
}

interface UIElement {
  type: 'text' | 'button' | 'image' | 'input' | 'list' | 'card'
  id: string
  text?: string
  bounds: { x: number, y: number, width: number, height: number }
  isClickable: boolean
  isVisible: boolean
}

export function RealAppMirror({ profile, events, isActive }: RealAppMirrorProps) {
  const [currentScreen, setCurrentScreen] = useState<AppScreenData | null>(null)
  const [screenHistory, setScreenHistory] = useState<AppScreenData[]>([])
  const [isConnected, setIsConnected] = useState(false)

  // Process lifecycle events to detect screen changes
  useEffect(() => {
    if (!isActive) return

    const lifecycleEvents = events.filter(e => 
      e.type === 'lifecycle' || 
      e.type === 'screen' || 
      e.activity || 
      e.screen ||
      e.fragment
    )

    console.log('Lifecycle events for screen detection:', lifecycleEvents)

    if (lifecycleEvents.length > 0) {
      const latestEvent = lifecycleEvents[lifecycleEvents.length - 1]
      
      // Create screen data from lifecycle event
      const screenData: AppScreenData = {
        screenName: latestEvent.screen || latestEvent.fragment || 'Unknown Screen',
        activityName: latestEvent.activity || latestEvent.activityName || 'MainActivity',
        elements: extractUIElements(latestEvent),
        timestamp: latestEvent.timestamp || Date.now(),
        screenshot: latestEvent.screenshot
      }

      setCurrentScreen(screenData)
      setScreenHistory(prev => [...prev.slice(-4), screenData])
      setIsConnected(true)
    } else {
      // No real screen data available - show connection instructions
      setIsConnected(false)
    }
  }, [events, isActive])

  // Extract UI elements from event data
  const extractUIElements = useCallback((event: any): UIElement[] => {
    const elements: UIElement[] = []

    // Try to extract UI elements from various event properties
    if (event.uiElements) {
      return event.uiElements
    }

    if (event.viewHierarchy) {
      // Parse view hierarchy if available
      return parseViewHierarchy(event.viewHierarchy)
    }

    // Create basic elements based on activity/screen type
    const activityName = event.activity || event.activityName || ''
    
    if (activityName.includes('MainActivity') || activityName.includes('Home')) {
      elements.push(
        { type: 'text', id: 'title', text: 'Home', bounds: { x: 20, y: 60, width: 200, height: 30 }, isClickable: false, isVisible: true },
        { type: 'input', id: 'search', text: 'Search...', bounds: { x: 20, y: 100, width: 280, height: 40 }, isClickable: true, isVisible: true },
        { type: 'list', id: 'products', bounds: { x: 20, y: 160, width: 280, height: 200 }, isClickable: true, isVisible: true }
      )
    } else if (activityName.includes('Product') || activityName.includes('Detail')) {
      elements.push(
        { type: 'image', id: 'product_image', bounds: { x: 20, y: 60, width: 280, height: 200 }, isClickable: false, isVisible: true },
        { type: 'text', id: 'product_name', text: 'Product Name', bounds: { x: 20, y: 280, width: 200, height: 25 }, isClickable: false, isVisible: true },
        { type: 'text', id: 'price', text: '$99.99', bounds: { x: 20, y: 310, width: 100, height: 25 }, isClickable: false, isVisible: true },
        { type: 'button', id: 'add_to_cart', text: 'Add to Cart', bounds: { x: 20, y: 350, width: 280, height: 45 }, isClickable: true, isVisible: true }
      )
    } else if (activityName.includes('Cart')) {
      elements.push(
        { type: 'text', id: 'cart_title', text: 'Shopping Cart', bounds: { x: 20, y: 60, width: 200, height: 30 }, isClickable: false, isVisible: true },
        { type: 'list', id: 'cart_items', bounds: { x: 20, y: 100, width: 280, height: 150 }, isClickable: true, isVisible: true },
        { type: 'text', id: 'total', text: 'Total: $199.98', bounds: { x: 20, y: 270, width: 200, height: 25 }, isClickable: false, isVisible: true },
        { type: 'button', id: 'checkout', text: 'Checkout', bounds: { x: 20, y: 310, width: 280, height: 45 }, isClickable: true, isVisible: true }
      )
    }

    return elements
  }, [])

  // Parse view hierarchy if provided by SDK
  const parseViewHierarchy = (hierarchy: any): UIElement[] => {
    // This would parse actual view hierarchy data from your Android SDK
    // For now, return empty array - this needs to be implemented based on your SDK's data format
    return []
  }

  if (!isActive) return null

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

        {/* Real App Content */}
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

            {isConnected && currentScreen ? (
              <>
                {/* App Header */}
                <div className="text-[8px] font-bold text-white text-center py-1 bg-blue-600/80 rounded mb-2">
                  {currentScreen.screenName} - {currentScreen.activityName}
                </div>

                {/* Real UI Elements */}
                <div className="relative flex-1" style={{ height: '260px' }}>
                  {currentScreen.elements.map((element, i) => (
                    <div
                      key={element.id}
                      className={`absolute ${
                        element.type === 'button' ? 'bg-blue-600 text-white text-center' :
                        element.type === 'input' ? 'bg-gray-800 text-gray-400 border border-gray-600' :
                        element.type === 'text' ? 'text-white' :
                        element.type === 'image' ? 'bg-gray-700 border border-gray-600' :
                        element.type === 'list' ? 'bg-gray-800/50 border border-gray-700' :
                        'bg-gray-800'
                      } ${
                        element.isClickable ? 'cursor-pointer hover:opacity-80' : ''
                      } rounded text-[6px] font-mono flex items-center justify-center`}
                      style={{
                        left: `${(element.bounds.x / 320) * 100}%`,
                        top: `${(element.bounds.y / 500) * 100}%`,
                        width: `${(element.bounds.width / 320) * 100}%`,
                        height: `${(element.bounds.height / 500) * 100}%`,
                      }}
                    >
                      {element.type === 'image' ? (
                        <div className="text-[5px] text-gray-500">IMG</div>
                      ) : element.type === 'list' ? (
                        <div className="text-[5px] text-gray-500">LIST</div>
                      ) : (
                        <span className="truncate px-1">{element.text}</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Performance overlay for slow devices */}
                {profile.coefficients.screenOpen > 2 && (
                  <div className="absolute inset-0 bg-red-900/10 rounded-[20px] animate-pulse" />
                )}
              </>
            ) : (
              /* Connection Instructions */
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-[8px] font-bold text-orange-400 mb-2">
                  NO APP CONNECTION
                </div>
                <div className="text-[6px] text-gray-400 leading-relaxed space-y-1">
                  <div>1. Run your Android app</div>
                  <div>2. Add SDK to your app</div>
                  <div>3. Make sure WebSocket is connected</div>
                  <div>4. Navigate in your app</div>
                </div>
                <div className="mt-3 w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-center">
        <div className="text-[8px] font-mono text-gray-600 mb-1">
          {isConnected ? 
            `${currentScreen?.screenName} • Connected` : 
            'Waiting for app connection...'
          }
        </div>
        <div className="flex gap-1 justify-center">
          {screenHistory.map((_, i) => (
            <div key={i} className={`w-1 h-1 rounded-full ${
              i === screenHistory.length - 1 ? 'bg-blue-400' : 'bg-gray-700'
            }`} />
          ))}
        </div>
      </div>
    </div>
  )
}