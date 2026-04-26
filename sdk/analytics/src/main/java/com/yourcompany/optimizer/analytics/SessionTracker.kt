package com.yourcompany.optimizer.analytics

import android.app.Activity
import android.app.Application
import android.os.Bundle
import com.yourcompany.optimizer.core.Logger
import java.util.concurrent.atomic.AtomicInteger

/**
 * Tracks app sessions for analytics
 * Integrates with existing DroidPulse lifecycle tracking
 */
class SessionTracker : Application.ActivityLifecycleCallbacks {
    
    private val activeActivities = AtomicInteger(0)
    private var sessionStartTime: Long = 0
    private var isSessionActive = false
    
    override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {
        // Already handled by existing DroidPulse lifecycle tracker
    }
    
    override fun onActivityStarted(activity: Activity) {
        val count = activeActivities.incrementAndGet()
        
        if (count == 1 && !isSessionActive) {
            // First activity started - begin session
            startSession()
        }
    }
    
    override fun onActivityResumed(activity: Activity) {
        // Track screen view with performance context
        DroidPulseAnalytics.track("screen_view", mapOf(
            "screen_name" to activity.javaClass.simpleName,
            "activity_class" to activity.javaClass.name
        ))
    }
    
    override fun onActivityPaused(activity: Activity) {
        // Calculate time spent on screen
        val timeSpent = System.currentTimeMillis() - sessionStartTime
        
        DroidPulseAnalytics.track("screen_exit", mapOf(
            "screen_name" to activity.javaClass.simpleName,
            "time_spent_ms" to timeSpent
        ))
    }
    
    override fun onActivityStopped(activity: Activity) {
        val count = activeActivities.decrementAndGet()
        
        if (count == 0) {
            // All activities stopped - end session after delay
            scheduleSessionEnd()
        }
    }
    
    override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
    
    override fun onActivityDestroyed(activity: Activity) {}
    
    private fun startSession() {
        isSessionActive = true
        sessionStartTime = System.currentTimeMillis()
        
        Logger.info("📱 Analytics session started")
        
        DroidPulseAnalytics.track("session_start", mapOf(
            "session_start_time" to sessionStartTime
        ))
    }
    
    private fun scheduleSessionEnd() {
        // End session after 30 seconds of inactivity
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            if (activeActivities.get() == 0) {
                endSession()
            }
        }, 30000)
    }
    
    private fun endSession() {
        if (!isSessionActive) return
        
        val sessionDuration = System.currentTimeMillis() - sessionStartTime
        isSessionActive = false
        
        Logger.info("📱 Analytics session ended (${sessionDuration}ms)")
        
        DroidPulseAnalytics.track("session_end", mapOf(
            "session_duration_ms" to sessionDuration,
            "session_end_time" to System.currentTimeMillis()
        ))
    }
}