package com.yourcompany.optimizer.core

import android.content.Context
import androidx.startup.Initializer

/**
 * Jetpack Startup initializer — kept for compatibility.
 * DroidPulse uses DroidPulse.start(activity) instead of auto-init.
 */
@Suppress("unused")
class OptimizerInitializer : Initializer<Unit> {
    override fun create(context: Context) {
        Logger.debug("OptimizerInitializer triggered")
    }
    override fun dependencies(): List<Class<out Initializer<*>>> = emptyList()
}
