package com.yourcompany.optimizer.core

/**
 * SDK constants
 */
object Constants {
    const val SDK_VERSION = "1.0.0"
    const val SDK_NAME = "OptimizerSDK"
    
    // Event types
    const val EVENT_LIFECYCLE = "lifecycle"
    const val EVENT_NETWORK = "network"
    const val EVENT_MEMORY = "memory"
    const val EVENT_FPS = "fps"
    const val EVENT_DEVICE = "device"
    
    // Timing
    const val MEMORY_CHECK_INTERVAL_MS = 5000L
    const val FPS_CHECK_INTERVAL_MS = 1000L
    const val BATCH_UPLOAD_INTERVAL_MS = 10000L
}
