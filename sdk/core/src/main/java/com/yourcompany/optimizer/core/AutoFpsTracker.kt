package com.yourcompany.optimizer.core

import android.view.Choreographer
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong

/**
 * Auto FPS tracker — thread-safe using AtomicInteger.
 *
 * Why AtomicInteger?
 * doFrame() runs on MAIN thread.
 * report() runs on BACKGROUND thread (coroutine).
 * Without AtomicInteger, both threads reading/writing same variable = race condition = wrong data.
 * AtomicInteger guarantees each read/write is atomic (indivisible).
 */
internal class AutoFpsTracker {

    // AtomicInteger = thread-safe counter (no race conditions)
    private val frameCount    = AtomicInteger(0)
    private val jankCount     = AtomicInteger(0)
    private val droppedFrames = AtomicInteger(0)
    private val lastFrameTimeNanos = AtomicLong(0L)
    private val lastReportTime = AtomicLong(System.currentTimeMillis())

    // Runs on MAIN thread — called by Android for every frame drawn
    private val frameCallback = object : Choreographer.FrameCallback {
        override fun doFrame(frameTimeNanos: Long) {
            val lastNanos = lastFrameTimeNanos.get()

            if (lastNanos != 0L) {
                val frameTimeMs = (frameTimeNanos - lastNanos) / 1_000_000f
                frameCount.incrementAndGet()

                // 60fps = 16.67ms per frame budget
                // If a frame takes longer → jank (visible stutter)
                if (frameTimeMs > 16.67f) {
                    jankCount.incrementAndGet()
                    val dropped = (frameTimeMs / 16.67f).toInt() - 1
                    if (dropped > 0) droppedFrames.addAndGet(dropped)
                }
            }

            lastFrameTimeNanos.set(frameTimeNanos)

            // Re-register for next frame
            Choreographer.getInstance().postFrameCallback(this)
        }
    }

    fun start(reportIntervalMs: Long = 1000L) {
        // Must be called on main thread — Choreographer requirement
        Choreographer.getInstance().postFrameCallback(frameCallback)

        // Report on background thread every second
        DroidPulse.scope.launch {
            while (isActive) {
                delay(reportIntervalMs)
                report()
            }
        }
        Logger.info("FPS tracking started (thread-safe)")
    }

    // Runs on BACKGROUND thread
    private fun report() {
        val now = System.currentTimeMillis()
        val elapsed = now - lastReportTime.getAndSet(now)

        // Atomically read and reset all counters
        val frames   = frameCount.getAndSet(0)
        val janks    = jankCount.getAndSet(0)
        val dropped  = droppedFrames.getAndSet(0)

        val fps = if (elapsed > 0) (frames * 1000f) / elapsed else 0f

        DroidPulse.dispatcher.dispatch(
            FpsEvent(
                fps           = fps,
                jankCount     = janks,
                droppedFrames = dropped,
                totalFrames   = frames
            )
        )
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
