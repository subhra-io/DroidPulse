package com.yourcompany.optimizer.core

import android.util.Log

/**
 * Internal logger for SDK
 */
object Logger {
    
    private const val TAG = "Optimizer"
    private var debugEnabled = false
    
    fun init(debug: Boolean) {
        debugEnabled = debug
    }
    
    fun debug(message: String) {
        if (debugEnabled) {
            Log.d(TAG, message)
        }
    }
    
    fun info(message: String) {
        if (debugEnabled) {
            Log.i(TAG, message)
        }
    }
    
    fun warn(message: String) {
        Log.w(TAG, message)
    }
    
    fun error(message: String, throwable: Throwable? = null) {
        Log.e(TAG, message, throwable)
    }
}
