package com.yourcompany.optimizer.core

import android.app.ActivityManager
import android.content.Context
import android.os.Debug
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * Auto memory tracker — started automatically by DroidPulse.start()
 */
internal class AutoMemoryTracker(private val context: Context) {

    private val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    private val runtime = Runtime.getRuntime()

    fun start(intervalMs: Long = 2000L) {
        DroidPulse.scope.launch {
            while (isActive) {
                try {
                    capture()
                    delay(intervalMs)
                } catch (e: Exception) {
                    Logger.error("Memory capture error", e)
                }
            }
        }
        Logger.info("Memory tracking started")
    }

    private fun capture() {
        val maxMemory = runtime.maxMemory()
        val usedMemory = runtime.totalMemory() - runtime.freeMemory()
        val usagePercent = (usedMemory.toFloat() / maxMemory.toFloat()) * 100

        val memInfo = ActivityManager.MemoryInfo()
        activityManager.getMemoryInfo(memInfo)

        DroidPulse.dispatcher.dispatch(
            MemoryEvent(
                usedMemoryMb = usedMemory / (1024 * 1024),
                totalMemoryMb = runtime.totalMemory() / (1024 * 1024),
                maxMemoryMb = maxMemory / (1024 * 1024),
                availableMemoryMb = memInfo.availMem / (1024 * 1024),
                usagePercentage = usagePercent,
                isLowMemory = memInfo.lowMemory
            )
        )
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
