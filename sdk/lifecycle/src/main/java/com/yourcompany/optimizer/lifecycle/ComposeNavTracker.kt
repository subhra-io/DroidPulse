package com.yourcompany.optimizer.lifecycle

import com.yourcompany.optimizer.core.Logger
import com.yourcompany.optimizer.core.Optimizer

/**
 * Tracks Jetpack Compose Navigation events
 * 
 * Note: This requires integration with NavController in the app.
 * Developers should call trackRoute() manually or use the provided NavHost wrapper.
 */
object ComposeNavTracker {
    
    private val timings = mutableMapOf<String, Long>()
    
    /**
     * Track a compose route navigation
     */
    fun trackRoute(route: String) {
        val startTime = timings[route]
        val duration = if (startTime != null) {
            System.currentTimeMillis() - startTime
        } else {
            timings[route] = System.currentTimeMillis()
            null
        }
        
        val event = ScreenEvent(
            screenName = route,
            screenType = ScreenType.COMPOSE_ROUTE,
            eventType = LifecycleEventType.RESUMED,
            duration = duration
        )
        
        Optimizer.dispatcher.dispatch(event)
        Logger.debug("Compose route $route navigated in ${duration}ms")
    }
    
    /**
     * Clear timing for a route
     */
    fun clearRoute(route: String) {
        timings.remove(route)
    }
}
