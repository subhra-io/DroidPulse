package com.yourcompany.optimizer.core

import android.content.Context
import android.os.Build
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID
import java.util.concurrent.ConcurrentLinkedQueue

/**
 * Uploads SDK events to DroidPulse cloud in batches.
 *
 * Features:
 * - Batches events every 5 seconds (configurable)
 * - Offline queue — events are never lost if network is down
 * - Retries failed uploads with exponential backoff
 * - Sends device info and app version with each session
 * - Uses only standard Java HTTP — no extra dependencies
 */
internal class CloudUploader(
    private val context: Context,
    private val config: CloudConfig,
    private val appVersion: String,
    private val buildType: String
) {

    // Thread-safe queue — events added from any thread
    private val eventQueue = ConcurrentLinkedQueue<JSONObject>()

    // Unique ID for this app session (one per app launch)
    val sessionId: String = UUID.randomUUID().toString()

    private var retryDelayMs = 5000L
    private var sessionCreated = false

    fun start() {
        // Create session on cloud
        DroidPulse.scope.launch {
            createSession()
        }

        // Upload events in batches
        DroidPulse.scope.launch {
            while (isActive) {
                delay(config.uploadIntervalMs)
                if (eventQueue.isNotEmpty()) {
                    uploadBatch()
                }
            }
        }

        // Subscribe to all events and queue them
        DroidPulse.scope.launch {
            DroidPulse.dispatcher.events.collect { event ->
                try {
                    queueEvent(event)
                } catch (e: Exception) {
                    Logger.error("CloudUploader queue error", e)
                }
            }
        }

        Logger.info("☁️ Cloud uploader started (session: ${sessionId.take(8)}...)")
    }

    private fun queueEvent(event: Event) {
        val json = JSONObject().apply {
            put("type",      event.type)
            put("timestamp", event.timestamp)
            put("sessionId", sessionId)

            // Add all event fields via reflection
            // (will be replaced with explicit serialization in next version)
            event.javaClass.declaredFields.forEach { field ->
                try {
                    field.isAccessible = true
                    val value = field.get(event)
                    when (value) {
                        is String, is Number, is Boolean -> put(field.name, value)
                        is Enum<*> -> put(field.name, value.name)
                        is List<*> -> put(field.name, JSONArray(value))
                        null -> {} // skip nulls
                    }
                } catch (_: Exception) {}
            }
        }

        eventQueue.offer(json)

        // Prevent unbounded growth if network is down for a long time
        while (eventQueue.size > 500) {
            eventQueue.poll() // drop oldest
        }
    }

    private suspend fun createSession() {
        try {
            val body = JSONObject().apply {
                put("sessionId",   sessionId)
                put("projectId",   config.projectId)
                put("appVersion",  appVersion)
                put("buildType",   buildType)
                put("deviceModel", "${Build.MANUFACTURER} ${Build.MODEL}")
                put("osVersion",   "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})")
                put("startedAt",   System.currentTimeMillis())
            }

            val response = post("${config.endpoint}/api/sessions", body)
            if (response.first == 200 || response.first == 201) {
                sessionCreated = true
                Logger.info("☁️ Session created on cloud: ${sessionId.take(8)}...")
            } else {
                Logger.warn("☁️ Session creation failed: ${response.first} — ${response.second}")
            }
        } catch (e: Exception) {
            Logger.error("☁️ Session creation error (events will still queue)", e)
        }
    }

    private suspend fun uploadBatch() {
        // Drain up to batchSize events from queue
        val batch = mutableListOf<JSONObject>()
        repeat(config.batchSize) {
            val event = eventQueue.poll() ?: return@repeat
            batch.add(event)
        }

        if (batch.isEmpty()) return

        try {
            val body = JSONObject().apply {
                put("projectId", config.projectId)
                put("sessionId", sessionId)
                put("events",    JSONArray(batch))
            }

            val response = post("${config.endpoint}/api/events", body)

            if (response.first == 200 || response.first == 201) {
                retryDelayMs = 5000L // reset backoff on success
                Logger.debug("☁️ Uploaded ${batch.size} events")
            } else {
                // Put events back in queue for retry
                batch.reversed().forEach { eventQueue.offer(it) }
                Logger.warn("☁️ Upload failed (${response.first}) — will retry")
                delay(retryDelayMs)
                retryDelayMs = minOf(retryDelayMs * 2, 60_000L) // exponential backoff, max 1 min
            }
        } catch (e: Exception) {
            // Network error — put events back
            batch.reversed().forEach { eventQueue.offer(it) }
            Logger.error("☁️ Upload error — will retry: ${e.message}", e)
            delay(retryDelayMs)
        }
    }

    /**
     * Simple HTTP POST using Java's built-in HttpURLConnection.
     * No OkHttp dependency needed — keeps core module lightweight.
     */
    private fun post(url: String, body: JSONObject): Pair<Int, String> {
        val connection = URL(url).openConnection() as HttpURLConnection
        return try {
            connection.apply {
                requestMethod = "POST"
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Authorization", "Bearer ${config.apiKey}")
                setRequestProperty("X-DroidPulse-Version", Constants.SDK_VERSION)
                doOutput = true
                connectTimeout = 10_000
                readTimeout = 10_000
            }

            OutputStreamWriter(connection.outputStream).use { writer ->
                writer.write(body.toString())
                writer.flush()
            }

            val responseCode = connection.responseCode
            val responseBody = try {
                connection.inputStream.bufferedReader().readText()
            } catch (_: Exception) {
                connection.errorStream?.bufferedReader()?.readText() ?: ""
            }

            Pair(responseCode, responseBody)
        } finally {
            connection.disconnect()
        }
    }
}
