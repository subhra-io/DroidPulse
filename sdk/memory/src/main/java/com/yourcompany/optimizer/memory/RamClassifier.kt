package com.yourcompany.optimizer.memory

import android.app.ActivityManager

/**
 * Classifies device RAM and provides recommendations
 */
object RamClassifier {
    
    /**
     * Classify device based on memory class
     */
    fun classifyDevice(memoryClass: Int, largeMemoryClass: Int): DeviceMemoryClass {
        return when {
            largeMemoryClass >= 512 -> DeviceMemoryClass.HIGH_END
            largeMemoryClass >= 256 -> DeviceMemoryClass.MID_RANGE
            largeMemoryClass >= 128 -> DeviceMemoryClass.LOW_END
            else -> DeviceMemoryClass.VERY_LOW_END
        }
    }
    
    /**
     * Get recommended memory limits for device class
     */
    fun getRecommendedLimits(deviceClass: DeviceMemoryClass): MemoryLimits {
        return when (deviceClass) {
            DeviceMemoryClass.HIGH_END -> MemoryLimits(
                maxBitmapCacheMb = 64,
                maxNetworkCacheMb = 32,
                maxDatabaseCacheMb = 16
            )
            DeviceMemoryClass.MID_RANGE -> MemoryLimits(
                maxBitmapCacheMb = 32,
                maxNetworkCacheMb = 16,
                maxDatabaseCacheMb = 8
            )
            DeviceMemoryClass.LOW_END -> MemoryLimits(
                maxBitmapCacheMb = 16,
                maxNetworkCacheMb = 8,
                maxDatabaseCacheMb = 4
            )
            DeviceMemoryClass.VERY_LOW_END -> MemoryLimits(
                maxBitmapCacheMb = 8,
                maxNetworkCacheMb = 4,
                maxDatabaseCacheMb = 2
            )
        }
    }
}

/**
 * Device memory classification
 */
enum class DeviceMemoryClass {
    VERY_LOW_END,  // < 128MB
    LOW_END,       // 128-256MB
    MID_RANGE,     // 256-512MB
    HIGH_END       // > 512MB
}

/**
 * Recommended memory limits
 */
data class MemoryLimits(
    val maxBitmapCacheMb: Int,
    val maxNetworkCacheMb: Int,
    val maxDatabaseCacheMb: Int
)
