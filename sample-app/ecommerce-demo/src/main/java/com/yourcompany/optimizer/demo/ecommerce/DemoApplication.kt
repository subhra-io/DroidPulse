package com.yourcompany.optimizer.demo.ecommerce

import android.app.Application
import com.yourcompany.optimizer.core.Optimizer
import com.yourcompany.optimizer.core.OptimizerConfig
import com.yourcompany.optimizer.lifecycle.ActivityTracker
import com.yourcompany.optimizer.lifecycle.FragmentTracker
import com.yourcompany.optimizer.network.OptimizerInterceptor
import com.yourcompany.optimizer.memory.MemoryTracker
import com.yourcompany.optimizer.fps.FpsTracker
import com.yourcompany.optimizer.transport.LocalServer
import okhttp3.OkHttpClient

class DemoApplication : Application() {
    
    private lateinit var memoryTracker: MemoryTracker
    private lateinit var fpsTracker: FpsTracker
    
    override fun onCreate() {
        super.onCreate()
        
        // Initialize Optimizer SDK
        Optimizer.init(
            app = this,
            config = OptimizerConfig(
                debug = true,
                trackNetwork = true,
                trackMemory = true,
                trackFps = true,
                showOverlay = true,
                enableLocalServer = true,
                localServerPort = 8080
            )
        )
        
        // Start trackers
        ActivityTracker()
        FragmentTracker()
        
        // Start memory tracking
        memoryTracker = MemoryTracker(this)
        memoryTracker.start(intervalMs = 2000) // Every 2 seconds
        
        // Start FPS tracking
        fpsTracker = FpsTracker()
        fpsTracker.start(reportIntervalMs = 1000) // Every 1 second
        
        // Start local server for dashboard
        LocalServer.start(8080)
        
        // Setup OkHttp with interceptor
        setupNetworkClient()
    }
    
    private fun setupNetworkClient() {
        networkClient = OkHttpClient.Builder()
            .addInterceptor(OptimizerInterceptor())
            .build()
    }
    
    companion object {
        lateinit var networkClient: OkHttpClient
            private set
    }
}
