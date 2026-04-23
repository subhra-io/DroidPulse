package com.yourcompany.optimizer.core

import android.app.Activity
import android.app.Application
import android.os.Bundle

/**
 * Automatically tracks all Activity lifecycle events.
 *
 * Every callback is wrapped in try/catch.
 * If anything goes wrong inside DroidPulse, the host app is NEVER affected.
 */
internal class AutoLifecycleTracker : Application.ActivityLifecycleCallbacks {

    private val createTimes     = mutableMapOf<String, Long>()
    private val resumeTimes     = mutableMapOf<String, Long>()
    private val navigationStack = mutableListOf<String>()

    override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {
        try {
            val name = activity.javaClass.simpleName
            createTimes[name] = System.currentTimeMillis()
            dispatch(ScreenEvent(
                screenName      = name,
                screenType      = ScreenType.ACTIVITY,
                eventType       = LifecycleEventType.CREATED,
                navigationStack = navigationStack.toList()
            ))
        } catch (e: Exception) { sdkError("onActivityCreated", e) }
    }

    override fun onActivityResumed(activity: Activity) {
        try {
            val name = activity.javaClass.simpleName
            resumeTimes[name] = System.currentTimeMillis()

            // launchDuration = time from onCreate → onResume
            // Only valid if activity was just created (createTime is recent)
            // If activity is resuming from background, createTime is stale → don't use it
            val createTime = createTimes[name]
            val launchDuration = if (createTime != null) {
                val elapsed = System.currentTimeMillis() - createTime
                // Only count as launch time if < 30 seconds (fresh open)
                // Otherwise it's a resume from background — not a launch
                if (elapsed < 30_000L) elapsed else null
            } else null

            // Clear create time after use — prevents stale measurements
            createTimes.remove(name)

            navigationStack.remove(name)
            navigationStack.add(name)

            dispatch(ScreenEvent(
                screenName      = name,
                screenType      = ScreenType.ACTIVITY,
                eventType       = LifecycleEventType.RESUMED,
                duration        = launchDuration,
                navigationStack = navigationStack.toList()
            ))
            Logger.debug("▶ $name resumed (${launchDuration?.let { "${it}ms to open" } ?: "from background"})")
        } catch (e: Exception) { sdkError("onActivityResumed", e) }
    }

    override fun onActivityPaused(activity: Activity) {
        try {
            val name = activity.javaClass.simpleName
            val timeOnScreen = resumeTimes[name]?.let {
                System.currentTimeMillis() - it
            }
            dispatch(ScreenEvent(
                screenName      = name,
                screenType      = ScreenType.ACTIVITY,
                eventType       = LifecycleEventType.PAUSED,
                duration        = timeOnScreen,
                navigationStack = navigationStack.toList()
            ))
            Logger.debug("⏸ $name paused (${timeOnScreen}ms on screen)")
        } catch (e: Exception) { sdkError("onActivityPaused", e) }
    }

    override fun onActivityDestroyed(activity: Activity) {
        try {
            val name = activity.javaClass.simpleName
            createTimes.remove(name)
            resumeTimes.remove(name)
            navigationStack.remove(name)
            dispatch(ScreenEvent(
                screenName      = name,
                screenType      = ScreenType.ACTIVITY,
                eventType       = LifecycleEventType.DESTROYED,
                navigationStack = navigationStack.toList()
            ))
        } catch (e: Exception) { sdkError("onActivityDestroyed", e) }
    }

    override fun onActivityStarted(activity: Activity) {}
    override fun onActivityStopped(activity: Activity) {}
    override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}

    private fun dispatch(event: ScreenEvent) {
        DroidPulse.dispatcher.dispatch(event)
    }

    // SDK internal error — log it, never throw to host app
    private fun sdkError(callback: String, e: Exception) {
        Logger.error("DroidPulse internal error in $callback (app unaffected): ${e.message}", e)
    }
}
