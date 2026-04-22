package com.yourcompany.optimizer.transport

import com.yourcompany.optimizer.core.DroidPulse
import com.yourcompany.optimizer.core.Logger
import kotlinx.coroutines.launch
import org.java_websocket.WebSocket
import org.java_websocket.handshake.ClientHandshake
import org.java_websocket.server.WebSocketServer as JavaWebSocketServer
import java.net.InetSocketAddress

/**
 * Local WebSocket server for streaming events to dashboard
 */
class WebSocketServer(private val port: Int = 8080) {
    
    private var server: Server? = null
    private val clients = mutableSetOf<WebSocket>()
    
    fun start() {
        try {
            server = Server(InetSocketAddress(port))
            server?.start()
            
            // Subscribe to all events and broadcast to dashboard
            DroidPulse.scope.launch {
                DroidPulse.dispatcher.events.collect { event ->
                    broadcast(EventSerializer.serialize(event))
                }
            }
            
            Logger.info("WebSocket server started on port $port")
        } catch (e: Exception) {
            Logger.error("Failed to start WebSocket server", e)
        }
    }
    
    fun stop() {
        try {
            server?.stop()
            clients.clear()
            Logger.info("WebSocket server stopped")
        } catch (e: Exception) {
            Logger.error("Failed to stop WebSocket server", e)
        }
    }
    
    private fun broadcast(message: String) {
        clients.forEach { client ->
            try {
                if (client.isOpen) client.send(message)
            } catch (e: Exception) {
                Logger.error("Failed to send message to client", e)
            }
        }
    }
    
    private inner class Server(address: InetSocketAddress) : JavaWebSocketServer(address) {
        
        override fun onOpen(conn: WebSocket, handshake: ClientHandshake) {
            clients.add(conn)
            Logger.debug("Dashboard connected: ${conn.remoteSocketAddress}")
        }
        
        override fun onClose(conn: WebSocket, code: Int, reason: String, remote: Boolean) {
            clients.remove(conn)
            Logger.debug("Dashboard disconnected: ${conn.remoteSocketAddress}")
        }
        
        override fun onMessage(conn: WebSocket, message: String) {
            Logger.debug("Received message: $message")
        }
        
        override fun onError(conn: WebSocket?, ex: Exception) {
            Logger.error("WebSocket error", ex)
        }
        
        override fun onStart() {
            Logger.info("WebSocket server ready")
        }
    }
}
