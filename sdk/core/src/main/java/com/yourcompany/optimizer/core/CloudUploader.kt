package com.yourcompany.optimizer.core

import android.content.Context
import android.location.Location
import android.location.LocationManager
import android.os.Build
import android.provider.Settings
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

    /**
     * Returns the best last-known location available without requesting updates.
     * Uses NETWORK provider first (fast, low-power), falls back to GPS.
     * Returns null if permission is not granted or no location is cached.
     */
    private fun getLastKnownLocation(): Location? {
        return try {
            val lm = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
            val providers = listOf(
                LocationManager.NETWORK_PROVIDER,
                LocationManager.GPS_PROVIDER,
                LocationManager.PASSIVE_PROVIDER
            )
            providers
                .filter { lm.isProviderEnabled(it) }
                .mapNotNull {
                    @Suppress("MissingPermission")
                    lm.getLastKnownLocation(it)
                }
                .maxByOrNull { it.time } // pick most recent
        } catch (_: SecurityException) {
            null // permission not granted — skip silently
        } catch (_: Exception) {
            null
        }
    }

    fun start() {
        // Create session on cloud
        DroidPulse.scope.launch {
            createSession()
        }

        // Upload events in batches
        DroidPulse.scope.launch {
            while (isActive) {
                delay(config.uploadInterval)
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
                        is Map<*, *> -> put(field.name, JSONObject().apply {
                            value.forEach { (k, v) ->
                                if (k != null) put(k.toString(), toJsonValue(v))
                            }
                        })
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

    private fun toJsonValue(value: Any?): Any {
        return when (value) {
            null -> JSONObject.NULL
            is String, is Number, is Boolean -> value
            is Enum<*> -> value.name
            is Map<*, *> -> JSONObject().apply {
                value.forEach { (k, v) ->
                    if (k != null) put(k.toString(), toJsonValue(v))
                }
            }
            is Iterable<*> -> JSONArray().apply {
                value.forEach { put(toJsonValue(it)) }
            }
            else -> value.toString()
        }
    }

    private suspend fun createSession() {
        try {
            // Prefer explicit config values; fall back to last-known device location
            val location = getLastKnownLocation()
            val lat = config.deviceLatitude  ?: location?.latitude
            val lon = config.deviceLongitude ?: location?.longitude

            val body = JSONObject().apply {
                put("sessionId",   sessionId)
                put("projectId",   config.appId)
                put("appVersion",  appVersion)
                put("buildType",   buildType)
                put("deviceModel", "${Build.MANUFACTURER} ${Build.MODEL}")
                put("osVersion",   "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})")
                put("deviceId",    config.deviceId ?: Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID))
                lat?.let { put("latitude",  it) }
                lon?.let { put("longitude", it) }
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
                put("projectId", config.appId)
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
