package com.yourcompany.optimizer.core

import android.util.Log

/**
 * Internal logger for DroidPulse SDK.
 * All logs are tagged "DroidPulse" — easy to filter in Logcat.
 * Debug/Info logs only appear when debug=true.
 * Warn/Error always appear (important for SDK health monitoring).
 */
object Logger {

    private const val TAG = "DroidPulse"
    private var debugEnabled = false

    fun init(debug: Boolean) {
        debugEnabled = debug
    }

    fun debug(message: String) {
        if (debugEnabled) Log.d(TAG, message)
    }

    fun info(message: String) {
        if (debugEnabled) Log.i(TAG, message)
    }

    fun warn(message: String) {
        // Warnings always shown — important for SDK health
        Log.w(TAG, message)
    }

    fun error(message: String, throwable: Throwable? = null) {
        // Errors always shown — never silently swallow SDK errors
        Log.e(TAG, message, throwable)
    }
}
