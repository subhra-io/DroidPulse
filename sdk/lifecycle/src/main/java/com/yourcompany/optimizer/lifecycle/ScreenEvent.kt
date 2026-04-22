package com.yourcompany.optimizer.lifecycle

import com.yourcompany.optimizer.core.Event

/**
 * Screen lifecycle event
 */
data class ScreenEvent(
    override val timestamp: Long = System.currentTimeMillis(),
    override val type: String = "lifecycle",
    val screenName: String,
    val screenType: ScreenType,
    val eventType: LifecycleEventType,
    val duration: Long? = null,
    val metadata: Map<String, Any> = emptyMap()
) : Event()

enum class ScreenType {
    ACTIVITY,
    FRAGMENT,
    COMPOSE_ROUTE
}

enum class LifecycleEventType {
    CREATED,
    STARTED,
    RESUMED,
    PAUSED,
    STOPPED,
    DESTROYED
}
