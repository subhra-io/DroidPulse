package com.yourcompany.optimizer.core

import android.view.Choreographer
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * Auto FPS tracker — started automatically by DroidPulse.start()
 */
internal class AutoFpsTracker {

    private var frameCount = 0
    private var lastReportTime = System.currentTimeMillis()
    private var lastFrameTimeNanos = 0L
    private var jankCount = 0
    private var droppedFrames = 0

    private val frameCallback = object : Choreographer.FrameCallback {
        override fun doFrame(frameTimeNanos: Long) {
            if (lastFrameTimeNanos != 0L) {
                val frameTimeMs = (frameTimeNanos - lastFrameTimeNanos) / 1_000_000f
                frameCount++
                // Jank = frame took more than 16.67ms (60fps budget)
                if (frameTimeMs > 16.67f) {
                    jankCount++
                    droppedFrames += (frameTimeMs / 16.67f).toInt() - 1
                }
            }
            lastFrameTimeNanos = frameTimeNanos
            Choreographer.getInstance().postFrameCallback(this)
        }
    }

    fun start(reportIntervalMs: Long = 1000L) {
        Choreographer.getInstance().postFrameCallback(frameCallback)

        DroidPulse.scope.launch {
            while (isActive) {
                delay(reportIntervalMs)
                report()
            }
        }
        Logger.info("FPS tracking started")
    }

    private fun report() {
        val now = System.currentTimeMillis()
        val elapsed = now - lastReportTime
        val fps = if (elapsed > 0) (frameCount * 1000f) / elapsed else 0f

        DroidPulse.dispatcher.dispatch(
            FpsEvent(
                fps = fps,
                jankCount = jankCount,
                droppedFrames = droppedFrames,
                totalFrames = frameCount
            )
        )

        // Reset
        frameCount = 0
        jankCount = 0
        droppedFrames = 0
        lastReportTime = now
    }
}

data class FpsEvent(
    override val timestamp: Long = System.currentTimeMillis(),
    override val type: String = "fps",
    val fps: Float,
    val jankCount: Int,
    val droppedFrames: Int,
    val totalFrames: Int
) : Event()
