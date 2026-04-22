package com.yourcompany.optimizer.network

import com.yourcompany.optimizer.core.Optimizer
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.map

/**
 * Collects and analyzes network events
 */
object NetworkCollector {
    
    /**
     * Get all network events as a flow
     */
    fun getNetworkEvents() = Optimizer.dispatcher.events
        .filter { it is ApiEvent }
        .map { it as ApiEvent }
    
    /**
     * Get network statistics
     */
    suspend fun getStats(): NetworkStats {
        val events = mutableListOf<ApiEvent>()
        
        // Collect recent events (simplified - in production use storage)
        getNetworkEvents().collect { events.add(it) }
        
        return NetworkStats(
            totalRequests = events.size,
            successfulRequests = events.count { it.success },
            failedRequests = events.count { !it.success },
            averageDuration = events.map { it.duration }.average(),
            totalDataTransferred = events.sumOf { it.requestSize + it.responseSize }
        )
    }
}

data class NetworkStats(
    val totalRequests: Int,
    val successfulRequests: Int,
    val failedRequests: Int,
    val averageDuration: Double,
    val totalDataTransferred: Long
)
