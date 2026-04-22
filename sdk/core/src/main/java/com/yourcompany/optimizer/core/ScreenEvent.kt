package com.yourcompany.optimizer.core

/**
 * Screen lifecycle event with navigation tracking
 */
data class ScreenEvent(
    override val timestamp: Long = System.currentTimeMillis(),
    override val type: String = "lifecycle",
    val screenName: String,
    val screenType: ScreenType,
    val eventType: LifecycleEventType,
    val duration: Long? = null,
    val navigationStack: List<String> = emptyList()
) : Event()

enum class ScreenType { ACTIVITY, FRAGMENT, COMPOSE_ROUTE }

enum class LifecycleEventType { CREATED, STARTED, RESUMED, PAUSED, STOPPED, DESTROYED }
