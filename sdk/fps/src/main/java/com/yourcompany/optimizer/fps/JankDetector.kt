package com.yourcompany.optimizer.fps

import com.yourcompany.optimizer.core.Logger

/**
 * Detects frame drops and jank
 */
object JankDetector {
    
    private const val TARGET_FRAME_TIME_MS = 16.67f // 60 FPS
    private const val JANK_THRESHOLD_MS = 32f // 2 frames
    
    /**
     * Analyze frame timing and detect jank
     */
    fun analyzeFrameTiming(frameTimeMs: Float): JankAnalysis {
        val isJank = frameTimeMs > JANK_THRESHOLD_MS
        val droppedFrames = if (isJank) {
            (frameTimeMs / TARGET_FRAME_TIME_MS).toInt()
        } else {
            0
        }
        
        val severity = when {
            frameTimeMs < TARGET_FRAME_TIME_MS -> JankSeverity.NONE
            frameTimeMs < JANK_THRESHOLD_MS -> JankSeverity.MINOR
            frameTimeMs < 48f -> JankSeverity.MODERATE
            frameTimeMs < 64f -> JankSeverity.SEVERE
            else -> JankSeverity.CRITICAL
        }
        
        return JankAnalysis(
            isJank = isJank,
            droppedFrames = droppedFrames,
            severity = severity,
            frameTimeMs = frameTimeMs
        )
    }
    
    /**
     * Get recommendations based on FPS
     */
    fun getRecommendations(fps: Float): List<String> {
        val recommendations = mutableListOf<String>()
        
        when {
            fps < 30f -> {
                recommendations.add("Critical: FPS is very low. Check for heavy operations on main thread.")
                recommendations.add("Use Profiler to identify bottlenecks")
                recommendations.add("Consider reducing animation complexity")
            }
            fps < 45f -> {
                recommendations.add("Poor performance: Optimize rendering and layout")
                recommendations.add("Check for overdraw in UI")
                recommendations.add("Profile GPU rendering")
            }
            fps < 55f -> {
                recommendations.add("Fair performance: Minor optimizations needed")
                recommendations.add("Review complex view hierarchies")
            }
        }
        
        return recommendations
    }
    
    /**
     * Classify frame performance
     */
    fun classifyPerformance(fps: Float): FramePerformance {
        return when {
            fps >= 58f -> FramePerformance.EXCELLENT
            fps >= 50f -> FramePerformance.GOOD
            fps >= 40f -> FramePerformance.FAIR
            fps >= 30f -> FramePerformance.POOR
            else -> FramePerformance.VERY_POOR
        }
    }
}

/**
 * Jank analysis result
 */
data class JankAnalysis(
    val isJank: Boolean,
    val droppedFrames: Int,
    val severity: JankSeverity,
    val frameTimeMs: Float
)

/**
 * Jank severity levels
 */
enum class JankSeverity {
    NONE,      // < 16.67ms (60 FPS)
    MINOR,     // 16.67-32ms (30-60 FPS)
    MODERATE,  // 32-48ms (20-30 FPS)
    SEVERE,    // 48-64ms (15-20 FPS)
    CRITICAL   // > 64ms (< 15 FPS)
}
