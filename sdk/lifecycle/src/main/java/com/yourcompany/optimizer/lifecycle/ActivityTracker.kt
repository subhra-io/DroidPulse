package com.yourcompany.optimizer.lifecycle

import android.app.Activity
import android.os.Bundle
import com.yourcompany.optimizer.core.ActivityLifecycleListener
import com.yourcompany.optimizer.core.LifecycleRegistry
import com.yourcompany.optimizer.core.Logger
import com.yourcompany.optimizer.core.Optimizer

/**
 * Tracks Activity lifecycle events
 */
class ActivityTracker : ActivityLifecycleListener {
    
    private val timings = mutableMapOf<String, Long>()
    
    init {
        LifecycleRegistry.addListener(this)
    }
    
    override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {
        val name = activity.javaClass.simpleName
        timings[name] = System.currentTimeMillis()
        
        dispatchEvent(
            screenName = name,
            eventType = LifecycleEventType.CREATED
        )
    }
    
    override fun onActivityStarted(activity: Activity) {
        dispatchEvent(
            screenName = activity.javaClass.simpleName,
            eventType = LifecycleEventType.STARTED
        )
    }
    
    override fun onActivityResumed(activity: Activity) {
        val name = activity.javaClass.simpleName
        val startTime = timings[name]
        val duration = if (startTime != null) {
            System.currentTimeMillis() - startTime
        } else null
        
        dispatchEvent(
            screenName = name,
            eventType = LifecycleEventType.RESUMED,
            duration = duration
        )
        
        Logger.debug("Activity $name resumed in ${duration}ms")
    }
    
    override fun onActivityPaused(activity: Activity) {
        dispatchEvent(
            screenName = activity.javaClass.simpleName,
            eventType = LifecycleEventType.PAUSED
        )
    }
    
    override fun onActivityStopped(activity: Activity) {
        dispatchEvent(
            screenName = activity.javaClass.simpleName,
            eventType = LifecycleEventType.STOPPED
        )
    }
    
    override fun onActivityDestroyed(activity: Activity) {
        val name = activity.javaClass.simpleName
        timings.remove(name)
        
        dispatchEvent(
            screenName = name,
            eventType = LifecycleEventType.DESTROYED
        )
    }
    
    private fun dispatchEvent(
        screenName: String,
        eventType: LifecycleEventType,
        duration: Long? = null
    ) {
        val event = ScreenEvent(
            screenName = screenName,
            screenType = ScreenType.ACTIVITY,
            eventType = eventType,
            duration = duration
        )
        
        Optimizer.dispatcher.dispatch(event)
    }
}
