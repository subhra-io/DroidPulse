package com.yourcompany.optimizer.fps

import com.yourcompany.optimizer.core.Event

/**
 * Frame rendering event
 */
data class FrameEvent(
    override val timestamp: Long = System.currentTimeMillis(),
    override val type: String = "fps",
    val fps: Float,
    val droppedFrames: Int,
    val totalFrames: Int,
    val averageFrameTimeMs: Float,
    val maxFrameTimeMs: Float,
    val jankCount: Int,
    val screenName: String? = null
) : Event()

/**
 * Frame performance classification
 */
enum class FramePerformance {
    EXCELLENT,  // 60 FPS
    GOOD,       // 50-59 FPS
    FAIR,       // 40-49 FPS
    POOR,       // 30-39 FPS
    VERY_POOR   // < 30 FPS
}
