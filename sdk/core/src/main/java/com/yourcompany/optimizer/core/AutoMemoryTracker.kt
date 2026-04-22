package com.yourcompany.optimizer.core

import android.app.ActivityManager
import android.content.Context
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * Auto memory tracker — delta-based dispatch.
 *
 * Only sends an event if memory changed by more than 1MB.
 * This avoids sending 30 identical events per minute when app is idle.
 * Saves battery and reduces WebSocket traffic.
 */
internal class AutoMemoryTracker(private val context: Context) {

    private val activityManager =
        context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    private val runtime = Runtime.getRuntime()

    // Track last dispatched value — only dispatch if changed by > 1MB
    private var lastUsedMb = -1L
    private var lastIsLowMemory = false

    fun start(intervalMs: Long = 2000L) {
        DroidPulse.scope.launch {
            while (isActive) {
                try {
                    capture()
                    delay(intervalMs)
                } catch (e: Exception) {
                    // Never crash host app
                    Logger.error("Memory capture error (SDK internal)", e)
                    delay(intervalMs) // still wait before retry
                }
            }
        }
        Logger.info("Memory tracking started (delta-based)")
    }

    private fun capture() {
        val maxMemory  = runtime.maxMemory()
        val usedMemory = runtime.totalMemory() - runtime.freeMemory()
        val usedMb     = usedMemory / (1024 * 1024)
        val usagePercent = (usedMemory.toFloat() / maxMemory.toFloat()) * 100

        val memInfo = ActivityManager.MemoryInfo()
        activityManager.getMemoryInfo(memInfo)

        // Delta check — only dispatch if something meaningful changed
        // This avoids flooding the WebSocket with identical data
        val memoryChangedSignificantly = Math.abs(usedMb - lastUsedMb) >= 1
        val lowMemoryChanged = memInfo.lowMemory != lastIsLowMemory

        if (!memoryChangedSignificantly && !lowMemoryChanged) {
            return // nothing changed — skip dispatch, save battery
        }

        lastUsedMb = usedMb
        lastIsLowMemory = memInfo.lowMemory

        DroidPulse.dispatcher.dispatch(
            MemoryEvent(
                usedMemoryMb      = usedMb,
                totalMemoryMb     = runtime.totalMemory() / (1024 * 1024),
                maxMemoryMb       = maxMemory / (1024 * 1024),
                availableMemoryMb = memInfo.availMem / (1024 * 1024),
                usagePercentage   = usagePercent,
                isLowMemory       = memInfo.lowMemory
            )
        )

        // Warn if memory pressure is high
        if (memInfo.lowMemory) {
            Logger.warn("⚠️ LOW MEMORY detected! Used: ${usedMb}MB (${usagePercent.toInt()}%)")
        }
    }
}

data class MemoryEvent(
    override val timestamp: Long = System.currentTimeMillis(),
    override val type: String = "memory",
    val usedMemoryMb: Long,
    val totalMemoryMb: Long,
    val maxMemoryMb: Long,
    val availableMemoryMb: Long,
    val usagePercentage: Float,
    val isLowMemory: Boolean
) : Event()
