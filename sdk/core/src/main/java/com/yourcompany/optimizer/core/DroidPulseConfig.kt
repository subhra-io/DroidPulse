package com.yourcompany.optimizer.core

/**
 * Configuration for DroidPulse SDK.
 *
 * Simple usage — just pass enabled flag:
 * ```
 * DroidPulse.start(this, DroidPulseConfig(enabled = BuildConfig.DEBUG))
 * ```
 *
 * Full usage:
 * ```
 * DroidPulse.start(this, DroidPulseConfig(
 *     enabled        = BuildConfig.DEBUG,
 *     debug          = true,
 *     trackMemory    = true,
 *     trackFps       = true,
 *     enableDashboard = true,
 *     dashboardPort  = 8080
 * ))
 * ```
 */
data class DroidPulseConfig(

    /** KILL SWITCH — Master on/off. Set to BuildConfig.DEBUG for production safety. */
    val enabled: Boolean = true,

    /** Enable verbose debug logging in Logcat. */
    val debug: Boolean = true,

    /** Track memory usage automatically every 2 seconds. */
    val trackMemory: Boolean = true,

    /** Track FPS and jank automatically every second. */
    val trackFps: Boolean = true,

    /** Enable real-time dashboard via WebSocket. */
    val enableDashboard: Boolean = true,

    /** Port for the dashboard WebSocket server. */
    val dashboardPort: Int = 8080,

    /** Memory polling interval in milliseconds. */
    val memoryIntervalMs: Long = 2000L,

    /** FPS report interval in milliseconds. */
    val fpsIntervalMs: Long = 1000L,

    // ── PHASE 3 ──────────────────────────────────────────────────────────

    /** Detect crashes, ANRs, and frozen UI (> 5s main thread block). */
    val detectCrashes: Boolean = true,

    /** Profile app startup time (cold/warm start). */
    val profileStartup: Boolean = true,

    /** Track Compose navigation (call DroidPulse.trackNavController() separately). */
    val trackCompose: Boolean = true,

    /** Track database queries (use DatabaseMonitor.track() in your DAO calls). */
    val trackDatabase: Boolean = true,

    // ── PHASE 4 ──────────────────────────────────────────────────────────

    /**
     * Cloud configuration for team dashboards, version comparison, and CI/CD.
     * Get your API key from: https://dashboard.droidpulse.dev
     * Set to null to use local dashboard only (default).
     */
    val cloud: CloudConfig? = null,

    // ── TECHNICAL OPTIMIZATIONS ──────────────────────────────────────────

    /**
     * Enable shake-to-report for QA testers.
     * Shake phone twice → generates performance report.
     */
    val shakeToReport: Boolean = false,

    /**
     * Enable adaptive sampling — reduces polling when app is idle.
     * Saves battery. Recommended: true.
     */
    val adaptiveSampling: Boolean = true,

    /**
     * Ring buffer capacity — number of events to keep in memory.
     * Used for "Why slow?" analysis and shake-to-report.
     * Default: 10,000 events (~5-10 minutes of data)
     */
    val ringBufferCapacity: Int = 10_000
)
