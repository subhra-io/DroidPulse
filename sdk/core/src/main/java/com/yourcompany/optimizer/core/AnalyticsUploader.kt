package com.yourcompany.optimizer.core

import android.content.Context
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.zip.GZIPOutputStream
import java.io.ByteArrayOutputStream

/**
 * Uploads analytics events to DroidPulse cloud backend
 * Handles batching, compression, retry logic, and offline storage
 */
class AnalyticsUploader(
    private val context: Context,
    private val config: CloudConfig
) {
    
    private val eventQueue = ConcurrentLinkedQueue<AnalyticsEvent>()
    private val uploadJob = SupervisorJob()
    private val uploadScope = CoroutineScope(Dispatchers.IO + uploadJob)
    
    private var isUploading = false
    private var retryCount = 0
    
    init {
        // Validate configuration
        val errors = config.validate()
        if (errors.isNotEmpty()) {
            Logger.error("AnalyticsUploader: Invalid configuration: ${errors.joinToString(", ")}")
        } else {
            Logger.info("📊 AnalyticsUploader initialized for ${config.endpoint}")
            // Start periodic upload
            startPeriodicUpload()
        }
    }
    
    /**
     * Queue an analytics event for upload
     */
    fun queueEvent(event: AnalyticsEvent) {
        if (eventQueue.size >= config.maxOfflineEvents) {
            // Remove oldest event to make room
            eventQueue.poll()
            Logger.warn("Analytics queue full, dropping oldest event")
        }
        
        eventQueue.offer(event)
        
        if (config.debug) {
            Logger.debug("📊 Queued analytics event: ${event.event} (queue size: ${eventQueue.size})")
        }
        
        // Upload immediately if batch size reached
        if (eventQueue.size >= config.batchSize) {
            uploadEvents()
        }
    }
    
    /**
     * Start periodic upload timer
     */
    private fun startPeriodicUpload() {
        uploadScope.launch {
            while (isActive) {
                delay(config.uploadInterval)
                if (eventQueue.isNotEmpty()) {
                    uploadEvents()
                }
            }
        }
    }
    
    /**
     * Upload queued events to cloud backend
     */
    private fun uploadEvents() {
        if (isUploading || eventQueue.isEmpty()) return
        
        uploadScope.launch {
            isUploading = true
            
            try {
                val eventsToUpload = mutableListOf<AnalyticsEvent>()
                
                // Collect events for this batch
                repeat(minOf(config.batchSize, eventQueue.size)) {
                    eventQueue.poll()?.let { eventsToUpload.add(it) }
                }
                
                if (eventsToUpload.isEmpty()) {
                    isUploading = false
                    return@launch
                }
                
                // Convert to JSON
                val jsonPayload = createJsonPayload(eventsToUpload)
                
                // Upload to backend
                val success = uploadToBackend(jsonPayload)
                
                if (success) {
                    retryCount = 0
                    Logger.info("📊 Uploaded ${eventsToUpload.size} analytics events")
                } else {
                    // Re-queue events for retry
                    eventsToUpload.reversed().forEach { eventQueue.offer(it) }
                    
                    retryCount++
                    if (retryCount >= config.maxRetries) {
                        Logger.error("📊 Max retries reached, dropping ${eventsToUpload.size} events")
                        retryCount = 0
                    } else {
                        Logger.warn("📊 Upload failed, will retry (attempt $retryCount/${config.maxRetries})")
                    }
                }
                
            } catch (e: Exception) {
                Logger.error("📊 Analytics upload error: ${e.message}", e)
            } finally {
                isUploading = false
            }
        }
    }
    
    /**
     * Create JSON payload from analytics events
     */
    private fun createJsonPayload(events: List<AnalyticsEvent>): String {
        val jsonArray = JSONArray()
        
        events.forEach { event ->
            val eventJson = JSONObject().apply {
                put("event_name", event.event)
                put("timestamp", event.timestamp)
                put("user_id", event.properties["user_id"] ?: "anonymous")
                put("session_id", event.properties["session_id"] ?: "")
                
                // Event properties
                val propertiesJson = JSONObject()
                event.properties.forEach { (key, value) ->
                    propertiesJson.put(key, value)
                }
                put("properties", propertiesJson)
                
                // Performance context (THE KILLER FEATURE!)
                val perfContext = JSONObject().apply {
                    put("startup_time_ms", event.startupTimeMs ?: 0)
                    put("memory_usage_mb", event.memoryUsageMb ?: 0.0)
                    put("avg_fps", event.avgFps ?: 60.0)
                    put("performance_score", event.performanceScore ?: 100)
                    put("crash_free_session", event.crashFreeSession ?: true)
                }
                put("performance_context", perfContext)
                
                // App context
                put("app_id", config.appId)
                put("app_name", config.appName)
            }
            
            jsonArray.put(eventJson)
        }
        
        return JSONObject().apply {
            put("events", jsonArray)
            put("batch_id", System.currentTimeMillis().toString())
            put("sdk_version", Constants.SDK_VERSION)
        }.toString()
    }
    
    /**
     * Upload JSON payload to backend
     */
    private suspend fun uploadToBackend(jsonPayload: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val url = URL("${config.endpoint}/api/track/batch")
            val connection = url.openConnection() as HttpURLConnection
            
            connection.apply {
                requestMethod = "POST"
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Authorization", "Bearer ${config.apiKey}")
                setRequestProperty("User-Agent", "DroidPulse-SDK/${Constants.SDK_VERSION}")
                
                if (config.enableCompression) {
                    setRequestProperty("Content-Encoding", "gzip")
                }
                
                doOutput = true
                connectTimeout = 10000 // 10 seconds
                readTimeout = 30000   // 30 seconds
            }
            
            // Write payload (with optional compression)
            connection.outputStream.use { outputStream ->
                if (config.enableCompression) {
                    GZIPOutputStream(outputStream).use { gzipStream ->
                        gzipStream.write(jsonPayload.toByteArray())
                    }
                } else {
                    outputStream.write(jsonPayload.toByteArray())
                }
            }
            
            val responseCode = connection.responseCode
            
            if (responseCode in 200..299) {
                if (config.debug) {
                    val response = connection.inputStream.bufferedReader().readText()
                    Logger.debug("📊 Upload response: $response")
                }
                return@withContext true
            } else {
                val errorResponse = connection.errorStream?.bufferedReader()?.readText() ?: "Unknown error"
                Logger.error("📊 Upload failed with code $responseCode: $errorResponse")
                return@withContext false
            }
            
        } catch (e: Exception) {
            Logger.error("📊 Network error during upload: ${e.message}", e)
            return@withContext false
        }
    }
    
    /**
     * Stop the uploader and clean up resources
     */
    fun stop() {
        uploadJob.cancel()
        Logger.info("📊 AnalyticsUploader stopped")
    }
    
    /**
     * Get current queue size (for debugging)
     */
    fun getQueueSize(): Int = eventQueue.size
    
    /**
     * Force upload all queued events (for app shutdown)
     */
    fun flush() {
        if (eventQueue.isNotEmpty()) {
            runBlocking {
                uploadEvents()
            }
        }
    }
}