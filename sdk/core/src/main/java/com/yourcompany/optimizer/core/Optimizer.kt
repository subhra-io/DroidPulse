package com.yourcompany.optimizer.core

import android.app.Activity
import android.app.Application
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob

/**
 * Main entry point for DroidPulse SDK.
 *
 * Usage in Application class (recommended):
 * ```
 * class MyApp : Application() {
 *     override fun onCreate() {
 *         super.onCreate()
 *         DroidPulse.start(this)
 *     }
 * }
 * ```
 *
 * Or in MainActivity:
 * ```
 * override fun onCreate(...) {
 *     super.onCreate(...)
 *     DroidPulse.start(this)
 * }
 * ```
 */
object DroidPulse {

    private var isInitialized = false

    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    val dispatcher = Dispatcher()

    /** Start from Application class — recommended, tracks from app launch */
    fun start(app: Application, config: DroidPulseConfig = DroidPulseConfig()) {
        if (isInitialized) return
        init(app, config)
    }

    /** Start from any Activity */
    fun start(activity: Activity, config: DroidPulseConfig = DroidPulseConfig()) {
        if (isInitialized) return
        init(activity.application, config)
    }

    private fun init(app: Application, config: DroidPulseConfig) {
        Logger.init(config.debug)
        Logger.info("DroidPulse starting...")

        app.registerActivityLifecycleCallbacks(AutoLifecycleTracker())

        if (config.trackMemory) AutoMemoryTracker(app).start()
        if (config.trackFps) AutoFpsTracker().start()
        if (config.enableDashboard) AutoWebSocketServer(config.dashboardPort).start()

        isInitialized = true
        Logger.info("DroidPulse started ✅  Dashboard port: ${config.dashboardPort}")
    }

    fun isStarted() = isInitialized
}

// Backward compatibility
object Optimizer {
    val scope get() = DroidPulse.scope
    val dispatcher get() = DroidPulse.dispatcher

    fun init(app: Application, config: OptimizerConfig = OptimizerConfig()) {
        Logger.init(config.debug)
        app.registerActivityLifecycleCallbacks(LifecycleRegistry)
        Logger.info("Optimizer SDK initialized")
    }
}
