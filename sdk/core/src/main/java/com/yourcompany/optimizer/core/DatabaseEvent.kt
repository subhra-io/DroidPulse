package com.yourcompany.optimizer.core

/**
 * Database query event
 */
data class DatabaseEvent(
    override val timestamp: Long = System.currentTimeMillis(),
    override val type: String = "database",
    val query: String,
    val durationMs: Long,
    val isMainThread: Boolean,
    val rowCount: Int,
    val dbName: String,
    val isSlow: Boolean        // > 100ms
) : Event()
