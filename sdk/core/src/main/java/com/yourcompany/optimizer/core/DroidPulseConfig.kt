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
    val trackDatabase: Boolean = true
)
