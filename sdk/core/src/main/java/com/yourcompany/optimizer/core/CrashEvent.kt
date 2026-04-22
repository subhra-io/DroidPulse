package com.yourcompany.optimizer.core

/**
 * Crash and ANR event types
 */
data class CrashEvent(
    override val timestamp: Long = System.currentTimeMillis(),
    override val type: String = "crash",
    val crashType: CrashType,
    val message: String,
    val stackTrace: String,
    val threadName: String,
    val isFatal: Boolean
) : Event()

enum class CrashType {
    UNCAUGHT_EXCEPTION,  // App crash
    ANR,                 // App Not Responding
    FROZEN_UI            // Main thread blocked > 5s
}
