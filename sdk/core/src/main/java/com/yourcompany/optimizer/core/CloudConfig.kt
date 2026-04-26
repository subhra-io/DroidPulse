package com.yourcompany.optimizer.core

/**
 * Cloud configuration for DroidPulse Analytics
 * Enables real-time analytics with performance correlation across all your apps
 */
data class CloudConfig(
    /**
     * Your analytics API endpoint
     * Example: "https://your-analytics-api.railway.app"
     */
    val endpoint: String,
    
    /**
     * API key for authentication
     * Get this from your DroidPulse dashboard
     */
    val apiKey: String,
    
    /**
     * Unique identifier for this app
     * Used to separate analytics across different apps
     */
    val appId: String = "",
    
    /**
     * Human-readable app name for dashboard
     */
    val appName: String = "",
    
    /**
     * How often to upload analytics events (milliseconds)
     * Default: 30 seconds
     */
    val uploadInterval: Long = 30000,
    
    /**
     * Number of events to batch before uploading
     * Default: 50 events
     */
    val batchSize: Int = 50,
    
    /**
     * Maximum events to store locally if offline
     * Default: 1000 events
     */
    val maxOfflineEvents: Int = 1000,
    
    /**
     * Enable real-time WebSocket connection for live debugging
     * Default: true
     */
    val enableRealTime: Boolean = true,
    
    /**
     * Compress analytics data before upload
     * Default: true (reduces bandwidth by ~70%)
     */
    val enableCompression: Boolean = true,
    
    /**
     * Retry failed uploads
     * Default: true
     */
    val enableRetry: Boolean = true,
    
    /**
     * Maximum retry attempts for failed uploads
     * Default: 3
     */
    val maxRetries: Int = 3,
    
    /**
     * Enable debug logging for analytics
     * Default: false (set to true for development)
     */
    val debug: Boolean = false
) {
    
    /**
     * Validate configuration
     */
    fun validate(): List<String> {
        val errors = mutableListOf<String>()
        
        if (endpoint.isBlank()) {
            errors.add("Cloud endpoint cannot be empty")
        }
        
        if (!endpoint.startsWith("https://") && !endpoint.startsWith("http://")) {
            errors.add("Cloud endpoint must start with https:// or http://")
        }
        
        if (apiKey.isBlank()) {
            errors.add("API key cannot be empty")
        }
        
        if (uploadInterval < 5000) {
            errors.add("Upload interval must be at least 5 seconds")
        }
        
        if (batchSize < 1 || batchSize > 1000) {
            errors.add("Batch size must be between 1 and 1000")
        }
        
        return errors
    }
    
    /**
     * Get WebSocket URL from HTTP endpoint
     */
    val webSocketUrl: String
        get() = endpoint.replace("https://", "wss://").replace("http://", "ws://")
    
    companion object {
        /**
         * Create configuration for development/testing
         */
        fun development(apiKey: String = "dev_key") = CloudConfig(
            // 10.0.2.2 is the Android emulator's alias for the host machine's localhost.
            // Use a real IP or hostname when testing on a physical device.
            endpoint = "http://10.0.2.2:3001",
            apiKey = apiKey,
            debug = true,
            uploadInterval = 10000, // Upload every 10 seconds in dev
            batchSize = 10 // Smaller batches for testing
        )
        
        /**
         * Create configuration for production
         */
        fun production(endpoint: String, apiKey: String, appId: String, appName: String) = CloudConfig(
            endpoint = endpoint,
            apiKey = apiKey,
            appId = appId,
            appName = appName,
            debug = false,
            uploadInterval = 30000,
            batchSize = 50
        )
    }
}