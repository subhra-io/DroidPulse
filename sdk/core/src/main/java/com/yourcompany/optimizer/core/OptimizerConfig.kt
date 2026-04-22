package com.yourcompany.optimizer.core

/**
 * Configuration for Optimizer SDK
 */
data class OptimizerConfig(
    /**
     * Enable debug logging
     */
    val debug: Boolean = false,
    
    /**
     * Track network requests
     */
    val trackNetwork: Boolean = true,
    
    /**
     * Track memory usage
     */
    val trackMemory: Boolean = true,
    
    /**
     * Track FPS and frame drops
     */
    val trackFps: Boolean = true,
    
    /**
     * Track device info
     */
    val trackDevice: Boolean = true,
    
    /**
     * Show floating overlay widget
     */
    val showOverlay: Boolean = false,
    
    /**
     * Enable local WebSocket server
     */
    val enableLocalServer: Boolean = true,
    
    /**
     * Local server port
     */
    val localServerPort: Int = 8080,
    
    /**
     * Upload to cloud endpoint
     */
    val cloudEndpoint: String? = null,
    
    /**
     * Sample rate for events (0.0 to 1.0)
     */
    val sampleRate: Float = 1.0f,
    
    /**
     * Maximum events to store locally
     */
    val maxStoredEvents: Int = 1000
)
