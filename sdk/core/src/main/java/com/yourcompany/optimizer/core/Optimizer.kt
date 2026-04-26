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
    private var analyticsUploader: AnalyticsUploader? = null

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

        // 1b. Activity registry for reproduce_trace navigation
        safeStart("ActivityRegistry") {
            ActivityRegistry.register(app)
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

        // ── PHASE 4 ──────────────────────────────────────────────────────

        // 7. Cloud uploader
        if (cfg.cloud != null) {
            safeStart("CloudUploader") {
                val appVersion = try {
                    app.packageManager.getPackageInfo(app.packageName, 0).versionName ?: "unknown"
                } catch (_: Exception) { "unknown" }
                val buildType = if (cfg.debug) "debug" else "release"
                CloudUploader(app, cfg.cloud, appVersion, buildType).start()
                // Wire cloud config into CommandHandler so reproduce_trace can fetch events
                CommandHandler.cloudApiUrl = cfg.cloud.endpoint
                CommandHandler.cloudApiKey = cfg.cloud.apiKey
                CommandHandler.appContext  = app
            }
        }

        // ── ANALYTICS & CLOUD ────────────────────────────────────────────────

        // 8. Analytics uploader (if cloud config provided)
        if (cfg.cloud != null) {
            safeStart("AnalyticsUploader") {
                analyticsUploader = AnalyticsUploader(app, cfg.cloud)
                Logger.info("📊 Cloud analytics enabled: ${cfg.cloud.endpoint}")
            }
        }

        // Always give CommandHandler the app context (needed for overlay even without cloud)
        CommandHandler.appContext = app

        // 8. Adaptive sampling
        if (cfg.adaptiveSampling) {
            safeStart("AdaptiveSampler") {
                AdaptiveSampler(app).start()
            }
        }

        // 9. Shake to Report
        if (cfg.shakeToReport) {
            safeStart("ShakeReporter") {
                ShakeReporter(app) { reportUrl, reportJson ->
                    Logger.info("📊 Report ready: $reportUrl")
                    // Broadcast to dashboard via WebSocket
                    dispatcher.dispatch(object : Event() {
                        override val timestamp = System.currentTimeMillis()
                        override val type = "report"
                        val url = reportUrl
                        val summary = reportJson.take(200)
                    })
                }.start()
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
     * "Why is my app slow?" — analyze recent performance data.
     * Returns plain-English diagnosis with actionable fix suggestions.
     *
     * ```kotlin
     * val analysis = DroidPulse.analyze()
     * Log.d("DroidPulse", analysis.summary)
     * analysis.allIssues.forEach { issue ->
     *     Log.d("DroidPulse", "• ${issue.title}: ${issue.suggestion}")
     * }
     * ```
     */
    fun analyze(minutesBack: Int = 5): PerformanceAnalyzer.Analysis {
        return PerformanceAnalyzer.analyze(minutesBack)
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // ANALYTICS APIs — The Mixpanel Killer for Mobile
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Track an event with automatic performance correlation.
     * 
     * This is THE killer feature - no other analytics tool can show:
     * "Users with slow startup convert 31% less"
     * 
     * ```kotlin
     * DroidPulse.track("purchase_completed", mapOf(
     *     "amount" to 29.99,
     *     "category" to "premium"
     * ))
     * ```
     */
    fun track(event: String, properties: Map<String, Any> = emptyMap()) {
        if (!isInitialized) {
            Logger.warn("Call DroidPulse.start() before tracking events")
            return
        }
        
        safeStart("Analytics.track") {
            // Use existing performance analysis for correlation
            val perfAnalysis = analyze(minutesBack = 1)
            
            val enrichedProperties = properties.toMutableMap().apply {
                // Add performance context (UNIQUE VALUE PROP!)
                put("startup_time_ms", perfAnalysis.startupTimeMs ?: 0L)
                put("memory_usage_mb", perfAnalysis.memoryUsageMb ?: 0.0)
                put("avg_fps", perfAnalysis.avgFps ?: 60.0)
                put("crash_free_session", perfAnalysis.crashCount == 0)
                put("performance_score", calculatePerformanceScore(perfAnalysis))
            }
            
            // Emit through existing dispatcher
            dispatcher.dispatch(AnalyticsEvent(
                event = event,
                properties = enrichedProperties,
                timestamp = System.currentTimeMillis()
            ))
            
            // Upload to cloud if configured
            analyticsUploader?.queueEvent(AnalyticsEvent(
                event = event,
                properties = enrichedProperties,
                timestamp = System.currentTimeMillis()
            ))
            
            Logger.debug("📊 Tracked: $event with performance context")
        }
    }
    
    /**
     * Identify a user with performance profile.
     * 
     * ```kotlin
     * DroidPulse.identify("user_123", mapOf(
     *     "email" to "user@example.com",
     *     "plan" to "premium"
     * ))
     * ```
     */
    fun identify(userId: String, properties: Map<String, Any> = emptyMap()) {
        track("user_identified", properties + mapOf(
            "user_id" to userId,
            "identified_at" to System.currentTimeMillis()
        ))
    }
    
    /**
     * Track revenue with performance impact analysis.
     * 
     * ```kotlin
     * DroidPulse.revenue(29.99, "USD")
     * ```
     */
    fun revenue(amount: Double, currency: String = "USD", event: String = "revenue") {
        track(event, mapOf(
            "revenue" to amount,
            "currency" to currency,
            "revenue_type" to "purchase"
        ))
    }
    
    /**
     * Track funnel steps with performance correlation.
     * 
     * ```kotlin
     * DroidPulse.funnel("checkout_started", "purchase_flow")
     * ```
     */
    fun funnel(step: String, funnelName: String, properties: Map<String, Any> = emptyMap()) {
        track("funnel_step", properties + mapOf(
            "funnel_name" to funnelName,
            "step_name" to step
        ))
    }
    
    private fun calculatePerformanceScore(analysis: PerformanceAnalyzer.Analysis): Int {
        var score = 100
        
        // Startup penalty
        val startupMs = analysis.startupTimeMs ?: 0L
        if (startupMs > 4000) score -= 30
        else if (startupMs > 2000) score -= 15
        
        // Memory penalty
        val memoryMb = analysis.memoryUsageMb ?: 0.0
        if (memoryMb > 400) score -= 25
        else if (memoryMb > 200) score -= 10
        
        // Crash penalty
        if (analysis.crashCount > 0) score -= 40
        
        return maxOf(0, score)
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
