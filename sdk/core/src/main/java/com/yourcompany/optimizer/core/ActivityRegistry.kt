package com.yourcompany.optimizer.core

import android.app.Activity
import android.app.Application
import android.os.Bundle
import java.lang.ref.WeakReference

/**
 * Tracks the current foreground Activity so CommandHandler can navigate during replay.
 * Uses WeakReference to avoid memory leaks.
 */
object ActivityRegistry : Application.ActivityLifecycleCallbacks {

    private var currentRef: WeakReference<Activity>? = null

    /** All Activity class names seen in this session — used for navigation lookup */
    private val knownActivities = mutableMapOf<String, WeakReference<Class<out Activity>>>()

    val current: Activity? get() = currentRef?.get()

    fun register(app: Application) {
        app.registerActivityLifecycleCallbacks(this)
    }

    /**
     * Try to navigate to an activity by simple class name (e.g. "MainActivity").
     * Searches the app's package for a matching class and starts it.
     */
    fun navigateTo(screenName: String) {
        val activity = current ?: return

        // 1. Try known activities first (already seen in this session)
        val knownClass = knownActivities[screenName]?.get()
        if (knownClass != null) {
            try {
                val intent = android.content.Intent(activity, knownClass).apply {
                    addFlags(android.content.Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                }
                activity.startActivity(intent)
                Logger.debug("[Nav] Navigated to $screenName (known)")
                return
            } catch (e: Exception) {
                Logger.warn("[Nav] Failed to navigate to known $screenName: ${e.message}")
            }
        }

        // 2. Try resolving by class name in the app's package
        val packageName = activity.packageName
        val candidates = listOf(
            screenName,                          // exact
            "$packageName.$screenName",          // package.ClassName
            "$packageName.ui.$screenName",       // package.ui.ClassName
            "$packageName.home.$screenName",     // package.home.ClassName
            "$packageName.onboarding.$screenName"
        )

        for (candidate in candidates) {
            try {
                @Suppress("UNCHECKED_CAST")
                val cls = Class.forName(candidate) as Class<out Activity>
                val intent = android.content.Intent(activity, cls).apply {
                    addFlags(android.content.Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                }
                activity.startActivity(intent)
                Logger.debug("[Nav] Navigated to $screenName via $candidate")
                return
            } catch (_: ClassNotFoundException) {
                // try next candidate
            } catch (e: Exception) {
                Logger.warn("[Nav] Error starting $candidate: ${e.message}")
            }
        }

        Logger.warn("[Nav] Could not find Activity for: $screenName")
    }

    // ── Lifecycle callbacks ───────────────────────────────────────────────────

    override fun onActivityResumed(activity: Activity) {
        currentRef = WeakReference(activity)
        // Register this class for future navigation
        knownActivities[activity.javaClass.simpleName] = WeakReference(activity.javaClass)
    }

    override fun onActivityPaused(activity: Activity) {
        if (currentRef?.get() === activity) currentRef = null
    }

    override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {
        knownActivities[activity.javaClass.simpleName] = WeakReference(activity.javaClass)
    }

    override fun onActivityStarted(activity: Activity) {}
    override fun onActivityStopped(activity: Activity) {}
    override fun onActivityDestroyed(activity: Activity) {}
    override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
}
