package com.yourcompany.optimizer.core

/**
 * Compose Navigation Tracker
 *
 * Usage — add ONE line in your NavHost setup:
 * ```
 * val navController = rememberNavController()
 * DroidPulse.trackNavController(navController)  // ← add this
 *
 * NavHost(navController = navController, startDestination = "home") {
 *     composable("home") { HomeScreen() }
 *     composable("profile") { ProfileScreen() }
 * }
 * ```
 *
 * That's it! All Compose navigation is tracked automatically.
 *
 * Why separate from ActivityTracker?
 * Modern apps use a SINGLE Activity with multiple Compose screens.
 * ActivityTracker only sees 1 activity — it misses all screen changes.
 * This tracker hooks into NavController to see every route change.
 */
object ComposeTracker {

    private val screenTimes = mutableMapOf<String, Long>()
    private val navigationStack = mutableListOf<String>()

    /**
     * Track a NavController.
     * Call this once after rememberNavController().
     *
     * Uses reflection to avoid hard dependency on Navigation Compose.
     * If Navigation Compose is not in the project, this is a no-op.
     */
    fun trackNavController(navController: Any) {
        if (!DroidPulse.isStarted()) {
            Logger.warn("DroidPulse.start() must be called before trackNavController()")
            return
        }

        try {
            // Use reflection to avoid compile-time dependency on navigation-compose
            // This way, the core module doesn't need to depend on navigation-compose
            val listenerClass = Class.forName(
                "androidx.navigation.NavController\$OnDestinationChangedListener"
            )

            val proxy = java.lang.reflect.Proxy.newProxyInstance(
                listenerClass.classLoader,
                arrayOf(listenerClass)
            ) { _, method, args ->
                if (method.name == "onDestinationChanged" && args != null && args.size >= 2) {
                    try {
                        val destination = args[1]
                        val route = destination?.javaClass
                            ?.getMethod("getRoute")
                            ?.invoke(destination) as? String
                            ?: destination?.javaClass
                            ?.getMethod("getLabel")
                            ?.invoke(destination)?.toString()
                            ?: "unknown"

                        onRouteChanged(route)
                    } catch (e: Exception) {
                        Logger.error("ComposeTracker route extraction error", e)
                    }
                }
                null
            }

            navController.javaClass
                .getMethod("addOnDestinationChangedListener", listenerClass)
                .invoke(navController, proxy)

            Logger.info("✅ Compose NavController tracking active")
        } catch (e: ClassNotFoundException) {
            Logger.warn("Navigation Compose not found — add androidx.navigation:navigation-compose dependency")
        } catch (e: Exception) {
            Logger.error("ComposeTracker setup error (app unaffected)", e)
        }
    }

    private fun onRouteChanged(route: String) {
        val now = System.currentTimeMillis()

        // Record time on previous screen
        val previousRoute = navigationStack.lastOrNull()
        if (previousRoute != null) {
            val timeOnScreen = screenTimes[previousRoute]?.let { now - it }
            DroidPulse.dispatcher.dispatch(
                ScreenEvent(
                    screenName      = previousRoute,
                    screenType      = ScreenType.COMPOSE_ROUTE,
                    eventType       = LifecycleEventType.PAUSED,
                    duration        = timeOnScreen,
                    navigationStack = navigationStack.toList()
                )
            )
        }

        // Record new screen
        screenTimes[route] = now
        navigationStack.remove(route)
        navigationStack.add(route)

        DroidPulse.dispatcher.dispatch(
            ScreenEvent(
                screenName      = route,
                screenType      = ScreenType.COMPOSE_ROUTE,
                eventType       = LifecycleEventType.RESUMED,
                duration        = null,
                navigationStack = navigationStack.toList()
            )
        )

        Logger.debug("🧭 Compose route: $route (stack: ${navigationStack.joinToString(" → ")})")
    }
}
