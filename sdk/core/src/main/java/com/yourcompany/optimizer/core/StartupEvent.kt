package com.yourcompany.optimizer.core

/**
 * App startup profiling event
 */
data class StartupEvent(
    override val timestamp: Long = System.currentTimeMillis(),
    override val type: String = "startup",
    val startupType: StartupType,
    val totalMs: Long,
    val appCreateMs: Long,       // Time in Application.onCreate()
    val firstActivityMs: Long,   // Time to first Activity.onResume()
    val isMainThreadBlocked: Boolean,
    val milestones: List<StartupMilestone>
) : Event()

data class StartupMilestone(
    val name: String,
    val elapsedMs: Long
)

enum class StartupType {
    COLD,  // App process was not running
    WARM,  // App was in background
    HOT    // App was already in foreground
}
