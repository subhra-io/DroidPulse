package com.yourcompany.optimizer.core

import android.app.Application
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob

/**
 * Main entry point for the Optimizer SDK.
 * 
 * Usage:
 * ```
 * Optimizer.init(
 *     app = this,
 *     config = OptimizerConfig(debug = true)
 * )
 * ```
 */
object Optimizer {
    
    private var isInitialized = false
    private lateinit var application: Application
    private lateinit var configuration: OptimizerConfig
    
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    val dispatcher = Dispatcher()
    
    /**
     * Initialize the Optimizer SDK.
     * Must be called in Application.onCreate()
     */
    fun init(app: Application, config: OptimizerConfig = OptimizerConfig()) {
        if (isInitialized) {
            Logger.warn("Optimizer already initialized")
            return
        }
        
        application = app
        configuration = config
        
        Logger.init(config.debug)
        Logger.info("Initializing Optimizer SDK v${Constants.SDK_VERSION}")
        
        // Register lifecycle callbacks
        app.registerActivityLifecycleCallbacks(LifecycleRegistry)
        
        isInitialized = true
        Logger.info("Optimizer SDK initialized successfully")
    }
    
    /**
     * Check if SDK is initialized
     */
    fun isInitialized(): Boolean = isInitialized
    
    /**
     * Get current configuration
     */
    fun getConfig(): OptimizerConfig {
        checkInitialized()
        return configuration
    }
    
    /**
     * Get application instance
     */
    fun getApplication(): Application {
        checkInitialized()
        return application
    }
    
    /**
     * Shutdown the SDK and release resources
     */
    fun shutdown() {
        if (!isInitialized) return
        
        Logger.info("Shutting down Optimizer SDK")
        application.unregisterActivityLifecycleCallbacks(LifecycleRegistry)
        isInitialized = false
    }
    
    private fun checkInitialized() {
        if (!isInitialized) {
            throw IllegalStateException("Optimizer not initialized. Call Optimizer.init() first.")
        }
    }
}
