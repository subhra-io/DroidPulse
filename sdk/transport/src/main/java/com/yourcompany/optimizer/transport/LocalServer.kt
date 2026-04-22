package com.yourcompany.optimizer.transport

import com.yourcompany.optimizer.core.Logger
import com.yourcompany.optimizer.core.Optimizer

/**
 * Manages local server for development
 */
object LocalServer {
    
    private var webSocketServer: WebSocketServer? = null
    
    fun start(port: Int = 8080) {
        if (webSocketServer != null) {
            Logger.warn("Local server already running")
            return
        }
        
        webSocketServer = WebSocketServer(port)
        webSocketServer?.start()
    }
    
    fun stop() {
        webSocketServer?.stop()
        webSocketServer = null
    }
    
    fun isRunning(): Boolean = webSocketServer != null
}
