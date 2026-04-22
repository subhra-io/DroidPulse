package com.yourcompany.optimizer.memory

import android.app.ActivityManager
import android.content.Context
import android.os.Debug
import com.yourcompany.optimizer.core.Constants
import com.yourcompany.optimizer.core.Logger
import com.yourcompany.optimizer.core.Optimizer
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * Tracks memory usage and heap statistics
 */
class MemoryTracker(private val context: Context) {
    
    private val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    private val runtime = Runtime.getRuntime()
    
    private var isTracking = false
    
    /**
     * Start tracking memory usage
     */
    fun start(intervalMs: Long = Constants.MEMORY_CHECK_INTERVAL_MS) {
        if (isTracking) {
            Logger.warn("Memory tracker already running")
            return
        }
        
        isTracking = true
        Logger.info("Starting memory tracker (interval: ${intervalMs}ms)")
        
        Optimizer.scope.launch {
            while (isActive && isTracking) {
                try {
                    captureMemorySnapshot()
                    delay(intervalMs)
                } catch (e: Exception) {
                    Logger.error("Error capturing memory snapshot", e)
                }
            }
        }
    }
    
    /**
     * Stop tracking memory usage
     */
    fun stop() {
        isTracking = false
        Logger.info("Memory tracker stopped")
    }
    
    /**
     * Capture current memory snapshot
     */
    private fun captureMemorySnapshot() {
        // Get runtime memory info
        val maxMemory = runtime.maxMemory()
        val totalMemory = runtime.totalMemory()
        val freeMemory = runtime.freeMemory()
        val usedMemory = totalMemory - freeMemory
        
        // Get heap info
        val heapUsed = Debug.getNativeHeapAllocatedSize()
        val heapMax = Debug.getNativeHeapSize()
        
        // Get system memory info
        val memoryInfo = ActivityManager.MemoryInfo()
        activityManager.getMemoryInfo(memoryInfo)
        
        val memoryClass = activityManager.memoryClass
        val largeMemoryClass = activityManager.largeMemoryClass
        
        // Calculate percentages
        val usagePercentage = (usedMemory.toFloat() / maxMemory.toFloat()) * 100
        val heapPercentage = (heapUsed.toFloat() / heapMax.toFloat()) * 100
        
        // Create event
        val event = MemoryEvent(
            usedMemoryMb = usedMemory / (1024 * 1024),
            totalMemoryMb = totalMemory / (1024 * 1024),
            maxMemoryMb = maxMemory / (1024 * 1024),
            availableMemoryMb = memoryInfo.availMem / (1024 * 1024),
            usagePercentage = usagePercentage,
            heapUsedMb = heapUsed / (1024 * 1024),
            heapMaxMb = heapMax / (1024 * 1024),
            heapPercentage = heapPercentage,
            isLowMemory = memoryInfo.lowMemory,
            memoryClass = memoryClass,
            largeMemoryClass = largeMemoryClass
        )
        
        // Dispatch event
        Optimizer.dispatcher.dispatch(event)
        
        // Log if memory pressure is high
        val pressure = getMemoryPressure(usagePercentage)
        if (pressure == MemoryPressure.HIGH || pressure == MemoryPressure.CRITICAL) {
            Logger.warn("Memory pressure: $pressure (${usagePercentage.toInt()}% used)")
        } else {
            Logger.debug("Memory: ${usedMemory / (1024 * 1024)}MB / ${maxMemory / (1024 * 1024)}MB (${usagePercentage.toInt()}%)")
        }
    }
    
    /**
     * Get current memory pressure level
     */
    fun getMemoryPressure(usagePercentage: Float): MemoryPressure {
        return when {
            usagePercentage < 50f -> MemoryPressure.LOW
            usagePercentage < 75f -> MemoryPressure.MODERATE
            usagePercentage < 90f -> MemoryPressure.HIGH
            else -> MemoryPressure.CRITICAL
        }
    }
    
    /**
     * Get current memory statistics
     */
    fun getCurrentStats(): MemoryStats {
        val maxMemory = runtime.maxMemory()
        val totalMemory = runtime.totalMemory()
        val freeMemory = runtime.freeMemory()
        val usedMemory = totalMemory - freeMemory
        
        return MemoryStats(
            usedMb = usedMemory / (1024 * 1024),
            maxMb = maxMemory / (1024 * 1024),
            percentage = (usedMemory.toFloat() / maxMemory.toFloat()) * 100
        )
    }
}

/**
 * Memory statistics snapshot
 */
data class MemoryStats(
    val usedMb: Long,
    val maxMb: Long,
    val percentage: Float
)
