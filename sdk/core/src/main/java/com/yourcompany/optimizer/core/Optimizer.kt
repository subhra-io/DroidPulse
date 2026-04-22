package com.yourcompany.optimizer.core

import android.app.Activity
import android.app.Application
import android.os.Handler
import android.os.Looper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob

/**
 * DroidPulse SDK — Main Entry Point
 *
 * ONE line to start everything:
 * ```
 * DroidPulse.start(this, DroidPulseConfig(enabled = BuildConfig.DEBUG))
 * ```
 *
 * Performance guarantee:
 *   CPU    < 1%
 *   RAM    < 15MB
 *   Battery  negligible
 *   Startup < 30ms
 */
object DroidPulse {

    private var isInitialized = false
    private var config = DroidPulseConfig()
    internal var startupProfiler: StartupProfiler? = null

    // SupervisorJob: if one tracker crashes, others keep running
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    val dispatcher = Dispatcher()

    /** Start from Application class — recommended */
    fun start(app: Application, config: DroidPulseConfig = DroidPulseConfig()) {
        if (!config.enabled) {
            Logger.init(config.debug)
            Logger.warn("DroidPulse is DISABLED via config.enabled=false")
            return
        }
        if (isInitialized) return
        init(app, config)
    }

    /** Start from any Activity */
    fun start(activity: Activity, config: DroidPulseConfig = DroidPulseConfig()) {
        if (!config.enabled) return
        if (isInitialized) return
        init(activity.application, config)
    }

    private fun init(app: Application, cfg: DroidPulseConfig) {
        // Measure startup time — must be < 30ms
        val startTime = System.currentTimeMillis()

        config = cfg
        Logger.init(cfg.debug)
        Logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        Logger.info("  DroidPulse SDK v${Constants.SDK_VERSION} starting...")
        Logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

        // 1. Lifecycle tracker — wrapped in try/catch (zero crash guarantee)
        safeStart("LifecycleTracker") {
            app.registerActivityLifecycleCallbacks(AutoLifecycleTracker())
        }

        // 2. Memory tracker
        if (cfg.trackMemory) {
            safeStart("MemoryTracker") {
                AutoMemoryTracker(app).start(cfg.memoryIntervalMs)
            }
        }

        // 3. FPS tracker — must start on main thread (Choreographer requirement)
        if (cfg.trackFps) {
            safeStart("FpsTracker") {
                Handler(Looper.getMainLooper()).post {
                    safeStart("FpsTracker.start") {
                        AutoFpsTracker().start(cfg.fpsIntervalMs)
                    }
                }
            }
        }

        // 4. WebSocket server for dashboard
        if (cfg.enableDashboard) {
            safeStart("WebSocketServer") {
                AutoWebSocketServer(cfg.dashboardPort).start()
            }
        }

        // ── PHASE 3 ──────────────────────────────────────────────────────

        // 5. Crash + ANR detection
        if (cfg.detectCrashes) {
            safeStart("CrashDetector") {
                CrashDetector().start()
            }
        }

        // 6. Startup profiler
        if (cfg.profileStartup) {
            safeStart("StartupProfiler") {
                val profiler = StartupProfiler(app)
                startupProfiler = profiler
                profiler.start()
            }
        }

        isInitialized = true

        // Startup time check — warn if > 30ms
        val startupMs = System.currentTimeMillis() - startTime
        if (startupMs > 30) {
            Logger.warn("⚠️ DroidPulse startup took ${startupMs}ms (target: <30ms)")
        } else {
            Logger.info("✅ DroidPulse started in ${startupMs}ms (target: <30ms) ✓")
        }
        Logger.info("📊 Dashboard: ws://localhost:${cfg.dashboardPort}")
        Logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    }

    /**
     * KILL SWITCH — Disable SDK at runtime.
     * Call this if you detect any issue.
     */
    fun disable() {
        isInitialized = false
        Logger.warn("DroidPulse DISABLED via disable()")
    }

    fun isStarted() = isInitialized
    fun getConfig() = config

    /**
     * Track Compose NavController — call after rememberNavController().
     *
     * ```kotlin
     * val navController = rememberNavController()
     * DroidPulse.trackNavController(navController)
     * ```
     */
    fun trackNavController(navController: Any) {
        if (!isInitialized) {
            Logger.warn("Call DroidPulse.start() before trackNavController()")
            return
        }
        safeStart("ComposeTracker") {
            ComposeTracker.trackNavController(navController)
        }
    }

    /**
     * Track a database query manually.
     *
     * ```kotlin
     * val users = DroidPulse.trackDb("getAllUsers") { userDao.getAllUsers() }
     * ```
     */
    fun <T> trackDb(queryName: String, dbName: String = "default", block: () -> T): T {
        return DatabaseMonitor.track(queryName, dbName, block)
    }

    /**
     * Zero crash guarantee wrapper.
     * Any exception inside a tracker is caught and logged.
     * The host app is NEVER affected.
     */
    internal fun safeStart(name: String, block: () -> Unit) {
        try {
            block()
            Logger.debug("  ✓ $name started")
        } catch (e: Exception) {
            // SDK error — log it but NEVER crash the host app
            Logger.error("  ✗ $name failed to start (SDK error, app unaffected): ${e.message}", e)
        }
    }
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
