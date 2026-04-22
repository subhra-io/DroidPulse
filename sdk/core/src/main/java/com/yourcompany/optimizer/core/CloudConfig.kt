package com.yourcompany.optimizer.core

/**
 * Cloud configuration for DroidPulse SaaS.
 *
 * Get your API key from: https://dashboard.droidpulse.dev
 *
 * Usage:
 * ```kotlin
 * DroidPulse.start(this, DroidPulseConfig(
 *     enabled = BuildConfig.DEBUG,
 *     cloud = CloudConfig(
 *         apiKey    = "dp_live_xxxxxxxxxxxx",
 *         projectId = "your-project-id"
 *     )
 * ))
 * ```
 */
data class CloudConfig(
    /** Your DroidPulse API key from dashboard.droidpulse.dev */
    val apiKey: String,

    /** Your project ID from dashboard.droidpulse.dev */
    val projectId: String,

    /** Cloud API endpoint. Default: DroidPulse cloud. */
    val endpoint: String = "https://api.droidpulse.dev",

    /** Upload events every N milliseconds. Default: 5 seconds. */
    val uploadIntervalMs: Long = 5000L,

    /** Max events to batch per upload. Default: 50. */
    val batchSize: Int = 50,

    /** Upload even in release builds. Default: false (debug only). */
    val uploadInRelease: Boolean = false
)
