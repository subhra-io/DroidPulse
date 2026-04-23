package com.yourcompany.optimizer.core

import java.util.concurrent.locks.ReentrantReadWriteLock
import kotlin.concurrent.read
import kotlin.concurrent.write

/**
 * Thread-safe in-memory ring buffer for events.
 *
 * Why ring buffer instead of Room/SQLite?
 * - Zero disk I/O — ultra fast
 * - No setup required
 * - Automatically overwrites oldest events when full
 * - Perfect for last N events (debugging window)
 *
 * How it works:
 * Think of it like a circular tape recorder.
 * When the tape is full, it records over the oldest part.
 * You always have the LAST [capacity] events.
 *
 * Priority-aware:
 * When full, drops LOW priority events first.
 * CRITICAL events (crashes) are never dropped.
 */
class RingBuffer(private val capacity: Int = 10_000) {

    private val buffer = arrayOfNulls<PrioritizedEvent>(capacity)
    private var writeIndex = 0
    private var size = 0
    private val lock = ReentrantReadWriteLock()

    /**
     * Add event to buffer.
     * If full: drops lowest priority event to make room.
     * CRITICAL events always succeed.
     */
    fun add(event: Event) {
        val prioritized = PrioritizedEvent(event, event.priority())

        lock.write {
            if (size < capacity) {
                // Buffer not full — just add
                buffer[writeIndex] = prioritized
                writeIndex = (writeIndex + 1) % capacity
                size++
            } else {
                // Buffer full — check if we should drop something
                if (prioritized.priority == EventPriority.CRITICAL) {
                    // CRITICAL always gets in — overwrite oldest regardless
                    buffer[writeIndex] = prioritized
                    writeIndex = (writeIndex + 1) % capacity
                } else {
                    // Find lowest priority event to replace
                    val lowestIndex = findLowestPriorityIndex()
                    val lowest = buffer[lowestIndex]

                    if (lowest != null && lowest.priority.level < prioritized.priority.level) {
                        buffer[lowestIndex] = prioritized
                    } else if (lowest != null && lowest.priority == EventPriority.LOW) {
                        buffer[writeIndex] = prioritized
                        writeIndex = (writeIndex + 1) % capacity
                    } else {
                        // new event has lower/equal priority — drop it
                    }
                }
            }
        }
    }

    /**
     * Get all events sorted by timestamp (oldest first).
     */
    fun getAll(): List<Event> = lock.read {
        buffer.filterNotNull()
            .sortedBy { it.enqueuedAt }
            .map { it.event }
    }

    /**
     * Get events of a specific type.
     */
    fun getByType(type: String): List<Event> = lock.read {
        buffer.filterNotNull()
            .filter { it.event.type == type }
            .sortedBy { it.enqueuedAt }
            .map { it.event }
    }

    /**
     * Get last N events.
     */
    fun getLast(n: Int): List<Event> = lock.read {
        buffer.filterNotNull()
            .sortedByDescending { it.enqueuedAt }
            .take(n)
            .reversed()
            .map { it.event }
    }

    /**
     * Get events since a timestamp.
     */
    fun getSince(timestampMs: Long): List<Event> = lock.read {
        buffer.filterNotNull()
            .filter { it.event.timestamp >= timestampMs }
            .sortedBy { it.enqueuedAt }
            .map { it.event }
    }

    /**
     * Clear all events.
     */
    fun clear() = lock.write {
        buffer.fill(null)
        writeIndex = 0
        size = 0
    }

    fun size(): Int = lock.read { size }

    private fun findLowestPriorityIndex(): Int {
        var lowestIndex = 0
        var lowestPriority = EventPriority.CRITICAL

        buffer.forEachIndexed { index, event ->
            if (event != null && event.priority.level < lowestPriority.level) {
                lowestPriority = event.priority
                lowestIndex = index
            }
        }
        return lowestIndex
    }
}
