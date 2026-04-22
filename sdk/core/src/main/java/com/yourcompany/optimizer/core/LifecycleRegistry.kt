package com.yourcompany.optimizer.core

import android.app.Activity
import android.app.Application
import android.os.Bundle

/**
 * Global activity lifecycle registry
 */
object LifecycleRegistry : Application.ActivityLifecycleCallbacks {
    
    private val listeners = mutableListOf<ActivityLifecycleListener>()
    
    fun addListener(listener: ActivityLifecycleListener) {
        listeners.add(listener)
    }
    
    fun removeListener(listener: ActivityLifecycleListener) {
        listeners.remove(listener)
    }
    
    override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {
        listeners.forEach { it.onActivityCreated(activity, savedInstanceState) }
    }
    
    override fun onActivityStarted(activity: Activity) {
        listeners.forEach { it.onActivityStarted(activity) }
    }
    
    override fun onActivityResumed(activity: Activity) {
        listeners.forEach { it.onActivityResumed(activity) }
    }
    
    override fun onActivityPaused(activity: Activity) {
        listeners.forEach { it.onActivityPaused(activity) }
    }
    
    override fun onActivityStopped(activity: Activity) {
        listeners.forEach { it.onActivityStopped(activity) }
    }
    
    override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {
        listeners.forEach { it.onActivitySaveInstanceState(activity, outState) }
    }
    
    override fun onActivityDestroyed(activity: Activity) {
        listeners.forEach { it.onActivityDestroyed(activity) }
    }
}

/**
 * Listener interface for activity lifecycle events
 */
interface ActivityLifecycleListener {
    fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {}
    fun onActivityStarted(activity: Activity) {}
    fun onActivityResumed(activity: Activity) {}
    fun onActivityPaused(activity: Activity) {}
    fun onActivityStopped(activity: Activity) {}
    fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
    fun onActivityDestroyed(activity: Activity) {}
}
