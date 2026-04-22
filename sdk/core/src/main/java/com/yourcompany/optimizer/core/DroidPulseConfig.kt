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

    /**
     * KILL SWITCH — Master on/off for the entire SDK.
     * Set to BuildConfig.DEBUG to auto-disable in production.
     * Default: true (on)
     */
    val enabled: Boolean = true,

    /**
     * Enable verbose debug logging in Logcat.
     * Default: true
     */
    val debug: Boolean = true,

    /**
     * Track memory usage automatically every 2 seconds.
     * Default: true
     */
    val trackMemory: Boolean = true,

    /**
     * Track FPS and jank automatically every second.
     * Default: true
     */
    val trackFps: Boolean = true,

    /**
     * Enable real-time dashboard via WebSocket.
     * Default: true
     */
    val enableDashboard: Boolean = true,

    /**
     * Port for the dashboard WebSocket server.
     * Default: 8080
     */
    val dashboardPort: Int = 8080,

    /**
     * Memory polling interval in milliseconds.
     * Default: 2000ms (2 seconds)
     */
    val memoryIntervalMs: Long = 2000L,

    /**
     * FPS report interval in milliseconds.
     * Default: 1000ms (1 second)
     */
    val fpsIntervalMs: Long = 1000L
)
