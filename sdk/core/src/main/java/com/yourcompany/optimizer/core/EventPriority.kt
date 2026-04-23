package com.yourcompany.optimizer.core

/**
 * Event priority levels.
 *
 * When the buffer is full, LOW priority events are dropped first.
 * CRITICAL events (crashes) are NEVER dropped.
 *
 * Priority order:
 *   CRITICAL > HIGH > MEDIUM > LOW
 */
enum class EventPriority(val level: Int) {
    CRITICAL(4),  // Crash, ANR — never drop
    HIGH(3),      // Frozen UI, slow API (>1s), main thread DB
    MEDIUM(2),    // Screen timing, jank, startup
    LOW(1)        // Memory poll, FPS report, normal API calls
}

/**
 * Assign priority to each event type.
 * Called by Dispatcher before queuing.
 */
fun Event.priority(): EventPriority = when (type) {
    "crash"    -> EventPriority.CRITICAL
    "startup"  -> EventPriority.MEDIUM
    "lifecycle"-> EventPriority.MEDIUM
    "network"  -> {
        // Use reflection-safe field access
        val duration = try { javaClass.getDeclaredField("duration").also { it.isAccessible = true }.getLong(this) } catch (_: Exception) { 0L }
        val success  = try { javaClass.getDeclaredField("success").also { it.isAccessible = true }.getBoolean(this) } catch (_: Exception) { true }
        when {
            duration > 1000 -> EventPriority.HIGH
            !success        -> EventPriority.HIGH
            else            -> EventPriority.MEDIUM
        }
    }
    "database" -> {
        val isMainThread = try { javaClass.getDeclaredField("isMainThread").also { it.isAccessible = true }.getBoolean(this) } catch (_: Exception) { false }
        val isSlow       = try { javaClass.getDeclaredField("isSlow").also { it.isAccessible = true }.getBoolean(this) } catch (_: Exception) { false }
        when {
            isMainThread -> EventPriority.HIGH
            isSlow       -> EventPriority.MEDIUM
            else         -> EventPriority.LOW
        }
    }
    "fps"      -> EventPriority.LOW
    "memory"   -> EventPriority.LOW
    else       -> EventPriority.LOW
}

/**
 * Wraps an event with its priority for the priority queue.
 */
data class PrioritizedEvent(
    val event: Event,
    val priority: EventPriority,
    val enqueuedAt: Long = System.currentTimeMillis()
)
