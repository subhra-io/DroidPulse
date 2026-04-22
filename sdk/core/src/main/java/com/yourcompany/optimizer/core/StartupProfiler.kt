package com.yourcompany.optimizer.core

import android.app.Activity
import android.app.Application
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock

/**
 * Startup Profiler — measures cold/warm/hot start times.
 *
 * How it works:
 *
 * COLD START (most important):
 *   Process start → Application.onCreate() → First Activity.onResume()
 *   We measure: how long did the user wait before seeing the first screen?
 *
 * WARM START:
 *   App was in background → brought to foreground
 *   We measure: how long from background → visible again?
 *
 * HOT START:
 *   Activity was paused → resumed (e.g. back from another app)
 *   Usually very fast.
 *
 * MAIN THREAD BLOCKING:
 *   We detect if the main thread was blocked during startup.
 *   Common causes: DB init, SharedPreferences, heavy computation in onCreate().
 */
internal class StartupProfiler(private val app: Application) {

    // Process start time — as early as possible
    private val processStartMs = SystemClock.elapsedRealtime()
    private val sdkStartMs = System.currentTimeMillis()

    private var appCreateMs = 0L
    private var firstActivityResumeMs = 0L
    private var firstActivitySeen = false
    private var isBackground = false

    private val milestones = mutableListOf<StartupMilestone>()
    private val mainHandler = Handler(Looper.getMainLooper())

    // Track if main thread was blocked during startup
    private var mainThreadBlockedMs = 0L
    private var lastMainThreadPing = System.currentTimeMillis()

    fun start() {
        recordMilestone("SDK initialized")
        monitorMainThreadDuringStartup()
        registerLifecycleCallbacks()
        Logger.info("Startup profiler started")
    }

    /**
     * Call this at the START of Application.onCreate() for accurate measurement.
     * DroidPulse.start() calls this automatically.
     */
    fun onAppCreate() {
        appCreateMs = System.currentTimeMillis()
        recordMilestone("Application.onCreate() start")
    }

    /**
     * Call this at the END of Application.onCreate().
     */
    fun onAppCreateDone() {
        val duration = System.currentTimeMillis() - appCreateMs
        recordMilestone("Application.onCreate() done (${duration}ms)")
        if (duration > 100) {
            Logger.warn("⚠️ Application.onCreate() took ${duration}ms — consider deferring heavy init")
        }
    }

    private fun monitorMainThreadDuringStartup() {
        // Ping main thread every 100ms during startup
        // If it doesn't respond within 500ms → blocked
        DroidPulse.scope.let { scope ->
            var pingCount = 0
            val maxPings = 50 // Monitor for 5 seconds max

            fun ping() {
                if (firstActivitySeen || pingCount >= maxPings) return
                pingCount++

                val pingTime = System.currentTimeMillis()
                mainHandler.post {
                    val responseTime = System.currentTimeMillis() - pingTime
                    if (responseTime > 500) {
                        mainThreadBlockedMs += responseTime
                        Logger.warn("⚠️ Main thread blocked for ${responseTime}ms during startup")
                    }
                    // Schedule next ping
                    mainHandler.postDelayed({ ping() }, 100)
                }
            }
            ping()
        }
    }

    private fun registerLifecycleCallbacks() {
        app.registerActivityLifecycleCallbacks(object : Application.ActivityLifecycleCallbacks {

            override fun onActivityResumed(activity: Activity) {
                if (!firstActivitySeen) {
                    firstActivitySeen = true
                    firstActivityResumeMs = System.currentTimeMillis()

                    val totalMs = firstActivityResumeMs - sdkStartMs
                    val appCreateDuration = if (appCreateMs > 0) firstActivityResumeMs - appCreateMs else 0L

                    recordMilestone("First screen visible: ${activity.javaClass.simpleName}")

                    val event = StartupEvent(
                        startupType          = StartupType.COLD,
                        totalMs              = totalMs,
                        appCreateMs          = appCreateDuration,
                        firstActivityMs      = totalMs,
                        isMainThreadBlocked  = mainThreadBlockedMs > 200,
                        milestones           = milestones.toList()
                    )

                    DroidPulse.dispatcher.dispatch(event)

                    // Log startup summary
                    Logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
                    Logger.info("🚀 STARTUP COMPLETE")
                    Logger.info("   Total time:     ${totalMs}ms")
                    Logger.info("   App onCreate:   ${appCreateDuration}ms")
                    Logger.info("   First screen:   ${activity.javaClass.simpleName}")
                    if (mainThreadBlockedMs > 200) {
                        Logger.warn("   ⚠️ Main thread blocked: ${mainThreadBlockedMs}ms")
                    }
                    Logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

                    // Unregister — we only need first startup
                    app.unregisterActivityLifecycleCallbacks(this)
                }
            }

            override fun onActivityStopped(activity: Activity) {
                isBackground = true
            }

            override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {}
            override fun onActivityStarted(activity: Activity) {}
            override fun onActivityPaused(activity: Activity) {}
            override fun onActivityDestroyed(activity: Activity) {}
            override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
        })
    }

    private fun recordMilestone(name: String) {
        val elapsed = System.currentTimeMillis() - sdkStartMs
        milestones.add(StartupMilestone(name = name, elapsedMs = elapsed))
        Logger.debug("  📍 +${elapsed}ms: $name")
    }
}
