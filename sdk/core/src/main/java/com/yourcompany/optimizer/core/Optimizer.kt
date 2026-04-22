package com.yourcompany.optimizer.core

import android.app.Activity
import android.app.Application
import android.os.Bundle
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob

/**
 * Main entry point for DroidPulse SDK.
 *
 * Minimal usage - just ONE line in your MainActivity:
 * ```
 * override fun onCreate(...) {
 *     super.onCreate(...)
 *     DroidPulse.start(this)
 * }
 * ```
 *
 * That's it! Everything else is automatic.
 */
object DroidPulse {

    private var isInitialized = false

    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    val dispatcher = Dispatcher()

    /**
     * Start DroidPulse from any Activity.
     * Automatically tracks all activities, memory, FPS, and starts dashboard server.
     */
    fun start(activity: Activity, config: DroidPulseConfig = DroidPulseConfig()) {
        if (isInitialized) return

        val app = activity.application

        Logger.init(config.debug)
        Logger.info("DroidPulse starting...")

        // Auto-register lifecycle tracking for ALL activities
        app.registerActivityLifecycleCallbacks(AutoLifecycleTracker())

        // Auto-start memory tracking
        if (config.trackMemory) {
            AutoMemoryTracker(app).start()
        }

        // Auto-start FPS tracking
        if (config.trackFps) {
            AutoFpsTracker().start()
        }

        // Auto-start WebSocket server for dashboard
        if (config.enableDashboard) {
            AutoWebSocketServer(config.dashboardPort).start()
        }

        isInitialized = true
        Logger.info("DroidPulse started on port ${config.dashboardPort} ✅")
    }

    fun isStarted() = isInitialized

    // Keep backward compat
    internal val Companion = this
}

// Keep old Optimizer name working too
object Optimizer {
    val scope get() = DroidPulse.scope
    val dispatcher get() = DroidPulse.dispatcher

    fun init(app: Application, config: OptimizerConfig = OptimizerConfig()) {
        Logger.init(config.debug)
        app.registerActivityLifecycleCallbacks(LifecycleRegistry)
        Logger.info("Optimizer SDK initialized")
    }
}
