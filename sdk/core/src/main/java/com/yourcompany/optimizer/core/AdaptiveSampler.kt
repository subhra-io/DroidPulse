package com.yourcompany.optimizer.core

import android.app.Activity
import android.app.Application
import android.os.Bundle
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * Adaptive Sampling — adjusts polling rates based on app activity.
 *
 * Why this matters:
 * When the user is actively using the app → collect more data.
 * When the app is idle (background, no interaction) → collect less.
 * This saves battery and reduces noise in the data.
 *
 * States:
 *   ACTIVE  — User is interacting (touching, navigating)
 *             Memory: every 2s, FPS: every 1s
 *
 *   IDLE    — App is visible but no interaction for 30s
 *             Memory: every 10s, FPS: every 5s
 *
 *   BACKGROUND — App is in background
 *             Memory: every 30s, FPS: paused
 *
 * How it detects state:
 * - Activity lifecycle callbacks (foreground/background)
 * - Touch event monitoring (active/idle)
 * - Time since last interaction
 */
internal class AdaptiveSampler(private val app: Application) {

    enum class AppState { ACTIVE, IDLE, BACKGROUND }

    private var currentState = AppState.ACTIVE
    private var lastInteractionTime = System.currentTimeMillis()
    private var activitiesInForeground = 0

    // Callbacks that trackers register to get notified of state changes
    private val listeners = mutableListOf<(AppState) -> Unit>()

    fun start() {
        registerLifecycleCallbacks()
        startIdleDetector()
        Logger.info("Adaptive sampling started")
    }

    fun addListener(listener: (AppState) -> Unit) {
        listeners.add(listener)
    }

    /**
     * Call this when user interacts with the app (touch, scroll, etc.)
     * Resets idle timer.
     */
    fun onUserInteraction() {
        lastInteractionTime = System.currentTimeMillis()
        if (currentState != AppState.ACTIVE) {
            setState(AppState.ACTIVE)
        }
    }

    fun getCurrentState() = currentState

    /**
     * Get memory polling interval based on current state.
     */
    fun memoryIntervalMs(): Long = when (currentState) {
        AppState.ACTIVE     -> 2_000L   // 2 seconds
        AppState.IDLE       -> 10_000L  // 10 seconds
        AppState.BACKGROUND -> 30_000L  // 30 seconds
    }

    /**
     * Get FPS polling interval based on current state.
     */
    fun fpsIntervalMs(): Long = when (currentState) {
        AppState.ACTIVE     -> 1_000L   // 1 second
        AppState.IDLE       -> 5_000L   // 5 seconds
        AppState.BACKGROUND -> 0L       // paused
    }

    private fun setState(newState: AppState) {
        if (currentState == newState) return
        val old = currentState
        currentState = newState
        Logger.debug("📊 Sampling state: $old → $newState (memory: ${memoryIntervalMs()}ms, fps: ${fpsIntervalMs()}ms)")
        listeners.forEach { it(newState) }
    }

    private fun registerLifecycleCallbacks() {
        app.registerActivityLifecycleCallbacks(object : Application.ActivityLifecycleCallbacks {
            override fun onActivityResumed(activity: Activity) {
                activitiesInForeground++
                if (currentState == AppState.BACKGROUND) {
                    setState(AppState.ACTIVE)
                    lastInteractionTime = System.currentTimeMillis()
                }
            }

            override fun onActivityStopped(activity: Activity) {
                activitiesInForeground = maxOf(0, activitiesInForeground - 1)
                if (activitiesInForeground == 0) {
                    setState(AppState.BACKGROUND)
                }
            }

            override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {}
            override fun onActivityStarted(activity: Activity) {}
            override fun onActivityPaused(activity: Activity) {}
            override fun onActivityDestroyed(activity: Activity) {}
            override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
        })
    }

    private fun startIdleDetector() {
        DroidPulse.scope.launch {
            while (isActive) {
                delay(5_000L) // Check every 5 seconds

                if (currentState == AppState.BACKGROUND) continue

                val idleMs = System.currentTimeMillis() - lastInteractionTime
                val newState = when {
                    idleMs > 30_000L -> AppState.IDLE    // 30s no interaction → idle
                    else             -> AppState.ACTIVE
                }

                if (newState != currentState) setState(newState)
            }
        }
    }
}
