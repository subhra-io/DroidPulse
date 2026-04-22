package com.yourcompany.optimizer.fps

import android.view.Choreographer

/**
 * Hooks into Choreographer for frame timing
 */
class ChoreographerHook(private val onFrameCallback: (frameTimeNanos: Long) -> Unit) {
    
    private val choreographer = Choreographer.getInstance()
    private var lastFrameTimeNanos = 0L
    private var isRunning = false
    
    private val frameCallback = object : Choreographer.FrameCallback {
        override fun doFrame(frameTimeNanos: Long) {
            if (!isRunning) return
            
            // Calculate frame time
            if (lastFrameTimeNanos != 0L) {
                onFrameCallback(frameTimeNanos)
            }
            
            lastFrameTimeNanos = frameTimeNanos
            
            // Schedule next frame
            if (isRunning) {
                choreographer.postFrameCallback(this)
            }
        }
    }
    
    /**
     * Start monitoring frames
     */
    fun start() {
        if (isRunning) return
        
        isRunning = true
        lastFrameTimeNanos = 0L
        choreographer.postFrameCallback(frameCallback)
    }
    
    /**
     * Stop monitoring frames
     */
    fun stop() {
        isRunning = false
        choreographer.removeFrameCallback(frameCallback)
    }
}
