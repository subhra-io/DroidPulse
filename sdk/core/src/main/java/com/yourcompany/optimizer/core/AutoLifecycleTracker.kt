package com.yourcompany.optimizer.core

import android.app.Activity
import android.app.Application
import android.os.Bundle

/**
 * Automatically tracks all Activity lifecycle events and navigation timing.
 * Registered once via DroidPulse.start() — tracks every activity in the app.
 */
internal class AutoLifecycleTracker : Application.ActivityLifecycleCallbacks {

    // Tracks create time per activity
    private val createTimes = mutableMapOf<String, Long>()
    // Tracks resume time per activity (for time-on-screen)
    private val resumeTimes = mutableMapOf<String, Long>()
    // Navigation stack
    private val navigationStack = mutableListOf<String>()

    override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {
        val name = activity.javaClass.simpleName
        createTimes[name] = System.currentTimeMillis()

        DroidPulse.dispatcher.dispatch(
            ScreenEvent(
                screenName = name,
                screenType = ScreenType.ACTIVITY,
                eventType = LifecycleEventType.CREATED,
                duration = null,
                navigationStack = navigationStack.toList()
            )
        )
        Logger.debug("▶ $name created")
    }

    override fun onActivityResumed(activity: Activity) {
        val name = activity.javaClass.simpleName
        resumeTimes[name] = System.currentTimeMillis()

        // Calculate time from create → resume (launch time)
        val createTime = createTimes[name]
        val launchDuration = if (createTime != null) System.currentTimeMillis() - createTime else null

        // Update navigation stack
        navigationStack.remove(name)
        navigationStack.add(name)

        DroidPulse.dispatcher.dispatch(
            ScreenEvent(
                screenName = name,
                screenType = ScreenType.ACTIVITY,
                eventType = LifecycleEventType.RESUMED,
                duration = launchDuration,
                navigationStack = navigationStack.toList()
            )
        )
        Logger.debug("▶ $name resumed (launch: ${launchDuration}ms)")
    }

    override fun onActivityPaused(activity: Activity) {
        val name = activity.javaClass.simpleName

        // Calculate time on screen
        val resumeTime = resumeTimes[name]
        val timeOnScreen = if (resumeTime != null) System.currentTimeMillis() - resumeTime else null

        DroidPulse.dispatcher.dispatch(
            ScreenEvent(
                screenName = name,
                screenType = ScreenType.ACTIVITY,
                eventType = LifecycleEventType.PAUSED,
                duration = timeOnScreen,
                navigationStack = navigationStack.toList()
            )
        )
        Logger.debug("⏸ $name paused (on screen: ${timeOnScreen}ms)")
    }

    override fun onActivityDestroyed(activity: Activity) {
        val name = activity.javaClass.simpleName
        createTimes.remove(name)
        resumeTimes.remove(name)
        navigationStack.remove(name)

        DroidPulse.dispatcher.dispatch(
            ScreenEvent(
                screenName = name,
                screenType = ScreenType.ACTIVITY,
                eventType = LifecycleEventType.DESTROYED,
                duration = null,
                navigationStack = navigationStack.toList()
            )
        )
        Logger.debug("✖ $name destroyed")
    }

    override fun onActivityStarted(activity: Activity) {}
    override fun onActivityStopped(activity: Activity) {}
    override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
}
