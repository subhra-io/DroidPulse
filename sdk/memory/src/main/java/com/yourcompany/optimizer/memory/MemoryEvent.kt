package com.yourcompany.optimizer.memory

import com.yourcompany.optimizer.core.Event

/**
 * Memory usage event
 */
data class MemoryEvent(
    override val timestamp: Long = System.currentTimeMillis(),
    override val type: String = "memory",
    val usedMemoryMb: Long,
    val totalMemoryMb: Long,
    val maxMemoryMb: Long,
    val availableMemoryMb: Long,
    val usagePercentage: Float,
    val heapUsedMb: Long,
    val heapMaxMb: Long,
    val heapPercentage: Float,
    val isLowMemory: Boolean,
    val memoryClass: Int,
    val largeMemoryClass: Int
) : Event()

/**
 * Memory classification
 */
enum class MemoryPressure {
    LOW,      // < 50% usage
    MODERATE, // 50-75% usage
    HIGH,     // 75-90% usage
    CRITICAL  // > 90% usage
}
