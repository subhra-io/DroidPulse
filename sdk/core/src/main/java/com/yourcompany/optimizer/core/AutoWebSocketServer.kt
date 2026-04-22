package com.yourcompany.optimizer.core

import kotlinx.coroutines.launch
import org.json.JSONObject

/**
 * Lightweight WebSocket server auto-started by DroidPulse.start()
 * Uses Java's built-in ServerSocket — no extra dependencies needed in core.
 * For full WebSocket support, the transport module's WebSocketServer is used.
 */
internal class AutoWebSocketServer(private val port: Int = 8080) {

    fun start() {
        // Delegate to transport module's WebSocketServer via reflection
        // This keeps core module dependency-free
        DroidPulse.scope.launch {
            try {
                val clazz = Class.forName("com.yourcompany.optimizer.transport.WebSocketServer")
                val constructor = clazz.getConstructor(Int::class.java)
                val server = constructor.newInstance(port)
                clazz.getMethod("start").invoke(server)
                Logger.info("Dashboard WebSocket server started on port $port")
            } catch (e: ClassNotFoundException) {
                Logger.warn("Transport module not found. Add DroidPulse:transport dependency for dashboard support.")
            } catch (e: Exception) {
                Logger.error("Failed to start WebSocket server", e)
            }
        }
    }
}
