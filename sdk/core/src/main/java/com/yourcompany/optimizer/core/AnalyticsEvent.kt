package com.yourcompany.optimizer.core

/**
 * Analytics event with performance correlation.
 * This is what makes DroidPulse the "Mixpanel killer for mobile" -
 * every event includes performance context automatically.
 */
class AnalyticsEvent(
    val event: String,
    val properties: Map<String, Any>,
    override val timestamp: Long
) : Event() {
    override val type = "analytics"
    
    // Extract performance metrics from properties for easy access
    val startupTimeMs: Long? = properties["startup_time_ms"] as? Long
    val memoryUsageMb: Double? = properties["memory_usage_mb"] as? Double
    val avgFps: Double? = properties["avg_fps"] as? Double
    val performanceScore: Int? = properties["performance_score"] as? Int
    val crashFreeSession: Boolean? = properties["crash_free_session"] as? Boolean
    
    override fun toString(): String {
        return "AnalyticsEvent(event='$event', properties=$properties, perf_score=$performanceScore)"
    }
}