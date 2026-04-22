package com.yourcompany.optimizer.core

import android.content.Context
import androidx.startup.Initializer

/**
 * Automatic initialization using Jetpack Startup
 * Optional - developers can still call Optimizer.init() manually
 */
class OptimizerInitializer : Initializer<Unit> {
    
    override fun create(context: Context) {
        // Auto-init with default config if not already initialized
        // Developers should still call init() manually for custom config
        Logger.debug("OptimizerInitializer triggered")
    }
    
    override fun dependencies(): List<Class<out Initializer<*>>> {
        return emptyList()
    }
}
