package com.yourcompany.optimizer.network

import com.yourcompany.optimizer.core.Event

/**
 * Network API call event
 */
data class ApiEvent(
    override val timestamp: Long = System.currentTimeMillis(),
    override val type: String = "network",
    val url: String,
    val method: String,
    val requestSize: Long,
    val responseCode: Int?,
    val responseSize: Long,
    val duration: Long,
    val success: Boolean,
    val errorMessage: String? = null,
    val headers: Map<String, String> = emptyMap()
) : Event()
