package com.yourcompany.optimizer.lifecycle

import android.app.Activity
import android.os.Bundle
import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentActivity
import androidx.fragment.app.FragmentManager
import com.yourcompany.optimizer.core.ActivityLifecycleListener
import com.yourcompany.optimizer.core.LifecycleRegistry
import com.yourcompany.optimizer.core.Logger
import com.yourcompany.optimizer.core.Optimizer

/**
 * Tracks Fragment lifecycle events
 */
class FragmentTracker : ActivityLifecycleListener {
    
    private val timings = mutableMapOf<String, Long>()
    
    init {
        LifecycleRegistry.addListener(this)
    }
    
    override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {
        if (activity is FragmentActivity) {
            activity.supportFragmentManager.registerFragmentLifecycleCallbacks(
                fragmentCallback,
                true
            )
        }
    }
    
    private val fragmentCallback = object : FragmentManager.FragmentLifecycleCallbacks() {
        
        override fun onFragmentCreated(
            fm: FragmentManager,
            f: Fragment,
            savedInstanceState: Bundle?
        ) {
            val name = f.javaClass.simpleName
            timings[name] = System.currentTimeMillis()
            
            dispatchEvent(
                screenName = name,
                eventType = LifecycleEventType.CREATED
            )
        }
        
        override fun onFragmentStarted(fm: FragmentManager, f: Fragment) {
            dispatchEvent(
                screenName = f.javaClass.simpleName,
                eventType = LifecycleEventType.STARTED
            )
        }
        
        override fun onFragmentResumed(fm: FragmentManager, f: Fragment) {
            val name = f.javaClass.simpleName
            val startTime = timings[name]
            val duration = if (startTime != null) {
                System.currentTimeMillis() - startTime
            } else null
            
            dispatchEvent(
                screenName = name,
                eventType = LifecycleEventType.RESUMED,
                duration = duration
            )
            
            Logger.debug("Fragment $name resumed in ${duration}ms")
        }
        
        override fun onFragmentPaused(fm: FragmentManager, f: Fragment) {
            dispatchEvent(
                screenName = f.javaClass.simpleName,
                eventType = LifecycleEventType.PAUSED
            )
        }
        
        override fun onFragmentStopped(fm: FragmentManager, f: Fragment) {
            dispatchEvent(
                screenName = f.javaClass.simpleName,
                eventType = LifecycleEventType.STOPPED
            )
        }
        
        override fun onFragmentDestroyed(fm: FragmentManager, f: Fragment) {
            val name = f.javaClass.simpleName
            timings.remove(name)
            
            dispatchEvent(
                screenName = name,
                eventType = LifecycleEventType.DESTROYED
            )
        }
    }
    
    private fun dispatchEvent(
        screenName: String,
        eventType: LifecycleEventType,
        duration: Long? = null
    ) {
        val event = ScreenEvent(
            screenName = screenName,
            screenType = ScreenType.FRAGMENT,
            eventType = eventType,
            duration = duration
        )
        
        Optimizer.dispatcher.dispatch(event)
    }
}
