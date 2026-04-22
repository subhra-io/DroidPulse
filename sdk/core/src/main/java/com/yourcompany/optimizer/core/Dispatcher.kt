package com.yourcompany.optimizer.core

import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

/**
 * Central event dispatcher for all SDK events
 */
class Dispatcher {
    
    private val _events = MutableSharedFlow<Event>(
        replay = 0,
        extraBufferCapacity = 100,
        onBufferOverflow = BufferOverflow.DROP_OLDEST
    )
    
    val events: SharedFlow<Event> = _events.asSharedFlow()
    
    /**
     * Dispatch an event to all subscribers
     */
    fun dispatch(event: Event) {
        _events.tryEmit(event)
    }
}

/**
 * Base event class
 */
abstract class Event {
    abstract val timestamp: Long
    abstract val type: String
}
