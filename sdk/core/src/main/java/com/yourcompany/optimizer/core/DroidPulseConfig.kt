package com.yourcompany.optimizer.core

/**
 * Configuration for DroidPulse SDK.
 * All fields have sensible defaults — you don't need to set anything.
 */
data class DroidPulseConfig(
    /** Enable debug logging */
    val debug: Boolean = true,

    /** Track memory usage automatically */
    val trackMemory: Boolean = true,

    /** Track FPS automatically */
    val trackFps: Boolean = true,

    /** Enable real-time dashboard via WebSocket */
    val enableDashboard: Boolean = true,

    /** Port for the dashboard WebSocket server */
    val dashboardPort: Int = 8080
)
