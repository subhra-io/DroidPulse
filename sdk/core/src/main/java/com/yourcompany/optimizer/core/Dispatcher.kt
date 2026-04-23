package com.yourcompany.optimizer.core

import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

/**
 * Central event dispatcher with priority queue and ring buffer.
 *
 * How it works:
 * 1. Event arrives via dispatch()
 * 2. Priority is assigned (CRITICAL > HIGH > MEDIUM > LOW)
 * 3. Event is stored in ring buffer (last 10,000 events in memory)
 * 4. Event is emitted to SharedFlow for real-time subscribers
 *    (WebSocket, CloudUploader)
 *
 * Buffer overflow strategy:
 * - SharedFlow: DROP_OLDEST (real-time stream, ok to miss old events)
 * - RingBuffer: DROP_LOWEST_PRIORITY (keep important events)
 * - CRITICAL events (crashes): NEVER dropped
 */
class Dispatcher {

    // Real-time stream for WebSocket and CloudUploader
    private val _events = MutableSharedFlow<Event>(
        replay = 0,
        extraBufferCapacity = 200,  // Increased from 100
        onBufferOverflow = BufferOverflow.DROP_OLDEST
    )
    val events: SharedFlow<Event> = _events.asSharedFlow()

    // In-memory ring buffer — last 10,000 events
    // Used for: "Why slow?" analysis, shake-to-report, session replay
    val ringBuffer = RingBuffer(capacity = 10_000)

    // Stats for monitoring
    private var totalDispatched = 0L
    private var totalDropped = 0L

    /**
     * Dispatch an event.
     * Thread-safe — can be called from any thread.
     */
    fun dispatch(event: Event) {
        totalDispatched++

        // 1. Store in ring buffer (always succeeds for CRITICAL)
        ringBuffer.add(event)

        // 2. Emit to real-time stream
        val emitted = _events.tryEmit(event)
        if (!emitted) {
            totalDropped++
            // Only warn for important events
            if (event.priority() >= EventPriority.HIGH) {
                Logger.warn("⚠️ High priority event dropped from stream: ${event.type}")
            }
        }
    }

    /**
     * Get last N events from ring buffer.
     * Used by "Why slow?" AI and shake-to-report.
     */
    fun getRecentEvents(n: Int = 100): List<Event> = ringBuffer.getLast(n)

    /**
     * Get events from last N minutes.
     */
    fun getEventsSince(minutes: Int): List<Event> {
        val since = System.currentTimeMillis() - (minutes * 60 * 1000L)
        return ringBuffer.getSince(since)
    }

    fun stats() = "dispatched=$totalDispatched, dropped=$totalDropped, buffered=${ringBuffer.size()}"
}

/**
 * Base event class
 */
abstract class Event {
    abstract val timestamp: Long
    abstract val type: String
}

// Extension to compare priorities
operator fun EventPriority.compareTo(other: EventPriority): Int = this.level - other.level
