package com.yourcompany.optimizer.fps

import com.yourcompany.optimizer.core.Constants
import com.yourcompany.optimizer.core.Logger
import com.yourcompany.optimizer.core.Optimizer
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * Tracks FPS and frame drops using Choreographer
 */
class FpsTracker {
    
    private var isTracking = false
    private var frameCount = 0
    private var droppedFrameCount = 0
    private var totalFrameTimeMs = 0f
    private var maxFrameTimeMs = 0f
    private var jankCount = 0
    private var lastReportTime = System.currentTimeMillis()
    private var lastFrameTimeNanos = 0L
    
    private val choreographerHook = ChoreographerHook { frameTimeNanos ->
        onFrame(frameTimeNanos)
    }
    
    /**
     * Start tracking FPS
     */
    fun start(reportIntervalMs: Long = Constants.FPS_CHECK_INTERVAL_MS) {
        if (isTracking) {
            Logger.warn("FPS tracker already running")
            return
        }
        
        isTracking = true
        Logger.info("Starting FPS tracker (report interval: ${reportIntervalMs}ms)")
        
        // Start choreographer monitoring
        choreographerHook.start()
        
        // Start periodic reporting
        Optimizer.scope.launch {
            while (isActive && isTracking) {
                delay(reportIntervalMs)
                reportFps()
            }
        }
    }
    
    /**
     * Stop tracking FPS
     */
    fun stop() {
        isTracking = false
        choreographerHook.stop()
        Logger.info("FPS tracker stopped")
    }
    
    /**
     * Called on each frame
     */
    private fun onFrame(frameTimeNanos: Long) {
        if (lastFrameTimeNanos == 0L) {
            lastFrameTimeNanos = frameTimeNanos
            return
        }
        
        // Calculate frame time in milliseconds
        val frameTimeMs = (frameTimeNanos - lastFrameTimeNanos) / 1_000_000f
        lastFrameTimeNanos = frameTimeNanos
        
        // Update statistics
        frameCount++
        totalFrameTimeMs += frameTimeMs
        maxFrameTimeMs = maxOf(maxFrameTimeMs, frameTimeMs)
        
        // Detect jank
        val jankAnalysis = JankDetector.analyzeFrameTiming(frameTimeMs)
        if (jankAnalysis.isJank) {
            jankCount++
            droppedFrameCount += jankAnalysis.droppedFrames
            
            if (jankAnalysis.severity == JankSeverity.SEVERE || jankAnalysis.severity == JankSeverity.CRITICAL) {
                Logger.warn("Severe jank detected: ${frameTimeMs}ms (${jankAnalysis.droppedFrames} frames dropped)")
            }
        }
    }
    
    /**
     * Report FPS statistics
     */
    private fun reportFps() {
        if (frameCount == 0) return
        
        val currentTime = System.currentTimeMillis()
        val elapsedMs = currentTime - lastReportTime
        
        // Calculate FPS
        val fps = (frameCount * 1000f) / elapsedMs
        val averageFrameTimeMs = totalFrameTimeMs / frameCount
        
        // Create event
        val event = FrameEvent(
            fps = fps,
            droppedFrames = droppedFrameCount,
            totalFrames = frameCount,
            averageFrameTimeMs = averageFrameTimeMs,
            maxFrameTimeMs = maxFrameTimeMs,
            jankCount = jankCount
        )
        
        // Dispatch event
        Optimizer.dispatcher.dispatch(event)
        
        // Log performance
        val performance = JankDetector.classifyPerformance(fps)
        Logger.debug("FPS: ${fps.toInt()} ($performance) - Jank: $jankCount, Dropped: $droppedFrameCount")
        
        // Reset counters
        frameCount = 0
        droppedFrameCount = 0
        totalFrameTimeMs = 0f
        maxFrameTimeMs = 0f
        jankCount = 0
        lastReportTime = currentTime
    }
    
    /**
     * Get current FPS statistics
     */
    fun getCurrentStats(): FpsStats {
        if (frameCount == 0) {
            return FpsStats(0f, 0, 0)
        }
        
        val currentTime = System.currentTimeMillis()
        val elapsedMs = currentTime - lastReportTime
        val fps = (frameCount * 1000f) / elapsedMs
        
        return FpsStats(fps, droppedFrameCount, jankCount)
    }
}

/**
 * FPS statistics snapshot
 */
data class FpsStats(
    val fps: Float,
    val droppedFrames: Int,
    val jankCount: Int
)
