package com.yourcompany.optimizer.core

import android.os.Handler
import android.os.Looper
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Handles commands sent from the DroidPulse dashboard over WebSocket.
 *
 * Commands are JSON objects with a "cmd" field:
 *
 *   { "cmd": "reproduce_trace", "sessionId": "abc123", "stepDelayMs": 420 }
 *   { "cmd": "replay_event",    "event": { "type": "crash", ... } }
 *   { "cmd": "ping" }
 *
 * For reproduce_trace the device fetches events from the cloud backend
 * (avoids WebSocket 65KB frame size limit) then re-dispatches them.
 */
object CommandHandler {

    private val mainHandler = Handler(Looper.getMainLooper())

    // Set by DroidPulse.start() if cloud config is present
    var cloudApiUrl: String = ""
    var cloudApiKey: String = ""

    fun handle(raw: String) {
        try {
            val json = JSONObject(raw)
            when (val cmd = json.optString("cmd")) {

                "ping" -> {
                    Logger.debug("[CMD] ping received")
                    dispatchAck("pong")
                }

                "replay_event" -> {
                    val eventJson = json.optJSONObject("event") ?: return
                    replayEvent(eventJson)
                }

                "reproduce_trace" -> {
                    val sessionId  = json.optString("sessionId", "")
                    val delayMs    = json.optLong("stepDelayMs", 400L)
                    val totalHint  = json.optInt("totalEvents", 0)

                    Logger.info("[CMD] reproduce_trace — session=$sessionId events~$totalHint")
                    dispatchAck("reproduce_started", mapOf("sessionId" to sessionId))

                    // Fetch events from cloud on background thread, then replay
                    Thread {
                        val events = fetchSessionEvents(sessionId)
                        if (events.isEmpty()) {
                            Logger.warn("[CMD] No events fetched for session $sessionId")
                            dispatchAck("reproduce_error", mapOf("reason" to "no_events"))
                            return@Thread
                        }
                        Logger.info("[CMD] Replaying ${events.size} events from session $sessionId")
                        for (i in events.indices) {
                            val eventJson = events[i]
                            mainHandler.postDelayed({ replayEvent(eventJson) }, i * delayMs)
                        }
                        mainHandler.postDelayed({
                            dispatchAck("reproduce_done", mapOf("total" to events.size))
                        }, events.size * delayMs + 500)
                    }.start()
                }

                "stop_replay" -> {
                    mainHandler.removeCallbacksAndMessages(null)
                    Logger.info("[CMD] stop_replay — cleared pending events")
                    dispatchAck("replay_stopped")
                }

                else -> Logger.warn("[CMD] Unknown command: $cmd")
            }
        } catch (e: Exception) {
            Logger.error("[CMD] Failed to handle command: $raw", e)
        }
    }

    // ── Fetch events from cloud backend ───────────────────────────────────────

    private fun fetchSessionEvents(sessionId: String): List<JSONObject> {
        if (cloudApiUrl.isEmpty() || sessionId.isEmpty() || sessionId == "demo") {
            return emptyList()
        }
        return try {
            val url = URL("$cloudApiUrl/api/sessions/$sessionId/events")
            val conn = url.openConnection() as HttpURLConnection
            conn.setRequestProperty("Authorization", "Bearer $cloudApiKey")
            conn.connectTimeout = 5000
            conn.readTimeout    = 10000
            val body = conn.inputStream.bufferedReader().readText()
            conn.disconnect()
            val arr = JSONObject(body).optJSONArray("events") ?: return emptyList()
            (0 until arr.length()).map { arr.getJSONObject(it) }
        } catch (e: Exception) {
            Logger.error("[CMD] Failed to fetch session events", e)
            emptyList()
        }
    }

    // ── Event reconstruction ──────────────────────────────────────────────────

    private fun replayEvent(json: JSONObject) {
        val type = json.optString("type", "unknown")
        val ts   = System.currentTimeMillis() // use current time so it appears live

        val event: Event = when (type) {
            "crash" -> CrashEvent(
                timestamp  = ts,
                crashType  = parseCrashType(json.optString("crashType", "UNCAUGHT_EXCEPTION")),
                message    = json.optString("message", "Reproduced crash"),
                stackTrace = json.optString("stackTrace", "at com.droidpulse.replay.ReproducedCrash"),
                threadName = json.optString("threadName", "main"),
                isFatal    = false  // never fatal during replay
            )
            "lifecycle" -> ScreenEvent(
                timestamp  = ts,
                screenName = json.optString("screenName", "UnknownScreen"),
                screenType = runCatching { ScreenType.valueOf(json.optString("screenType", "ACTIVITY")) }.getOrDefault(ScreenType.ACTIVITY),
                eventType  = runCatching { LifecycleEventType.valueOf(json.optString("eventType", "RESUMED")) }.getOrDefault(LifecycleEventType.RESUMED),
                duration   = if (json.has("duration")) json.getInt("duration").toLong() else null
            )
            "memory" -> object : Event() {
                override val timestamp = ts
                override val type      = "memory"
                val usedMemoryMb       = json.optInt("usedMemoryMb", 0)
                val maxMemoryMb        = json.optInt("maxMemoryMb", 4096)
                val usagePercentage    = json.optDouble("usagePercentage", 0.0)
                val isLowMemory        = json.optBoolean("isLowMemory", false)
            }
            "network" -> object : Event() {
                override val timestamp = ts
                override val type      = "network"
                val method             = json.optString("method", "GET")
                val url                = json.optString("url", "")
                val responseCode       = json.optInt("responseCode", 200)
                val duration           = json.optInt("duration", 0)
                val success            = json.optBoolean("success", true)
            }
            "fps" -> object : Event() {
                override val timestamp = ts
                override val type      = "fps"
                val fps                = json.optDouble("fps", 60.0)
                val jankCount          = json.optInt("jankCount", 0)
                val droppedFrames      = json.optInt("droppedFrames", 0)
            }
            "database" -> object : Event() {
                override val timestamp = ts
                override val type      = "database"
                val query              = json.optString("query", "")
                val durationMs         = json.optInt("durationMs", 0)
                val isMainThread       = json.optBoolean("isMainThread", false)
                val isSlow             = json.optBoolean("isSlow", false)
            }
            else -> object : Event() {
                override val timestamp = ts
                override val type      = type
            }
        }

        Logger.debug("[CMD] Replaying event: $type")
        DroidPulse.dispatcher.dispatch(event)
    }

    private fun parseCrashType(s: String) = try {
        CrashType.valueOf(s)
    } catch (_: Exception) { CrashType.UNCAUGHT_EXCEPTION }

    private fun dispatchAck(ackType: String, extra: Map<String, Any> = emptyMap()) {
        DroidPulse.dispatcher.dispatch(object : Event() {
            override val timestamp = System.currentTimeMillis()
            override val type      = "cmd_ack"
            val ack                = ackType
            val data               = extra
        })
    }
}

/**
 * Handles commands sent from the DroidPulse dashboard over WebSocket.
 *
 * Commands are JSON objects with a "cmd" field:
 *
 *   { "cmd": "reproduce_trace", "events": [...] }
 *   { "cmd": "replay_event",    "event": { "type": "crash", ... } }
 *   { "cmd": "ping" }
 *
 * Each command re-dispatches the event through DroidPulse.dispatcher so it
 * appears in the live stream exactly as if the device had generated it.
 */
object CommandHandler {

    private val mainHandler = Handler(Looper.getMainLooper())

    fun handle(raw: String) {
        try {
            val json = JSONObject(raw)
            when (val cmd = json.optString("cmd")) {
                "ping" -> {
                    Logger.debug("[CMD] ping received")
                    dispatchAck("pong")
                }

                // Replay a single event back through the dispatcher
                "replay_event" -> {
                    val eventJson = json.optJSONObject("event") ?: return
                    replayEvent(eventJson)
                }

                // Replay a full sequence of events (reproduce_trace)
                "reproduce_trace" -> {
                    val eventsArray = json.optJSONArray("events") ?: return
                    val delayMs     = json.optLong("stepDelayMs", 400L)
                    Logger.info("[CMD] reproduce_trace — replaying ${eventsArray.length()} events")

                    for (i in 0 until eventsArray.length()) {
                        val eventJson = eventsArray.getJSONObject(i)
                        val delay     = i * delayMs
                        mainHandler.postDelayed({
                            replayEvent(eventJson)
                        }, delay)
                    }

                    // Notify dashboard replay started
                    dispatchAck("reproduce_started", mapOf("total" to eventsArray.length()))
                }

                // Stop any ongoing replay
                "stop_replay" -> {
                    mainHandler.removeCallbacksAndMessages(null)
                    Logger.info("[CMD] stop_replay — cleared pending events")
                    dispatchAck("replay_stopped")
                }

                else -> Logger.warn("[CMD] Unknown command: $cmd")
            }
        } catch (e: Exception) {
            Logger.error("[CMD] Failed to handle command: $raw", e)
        }
    }

    // ── Event reconstruction ──────────────────────────────────────────────────

    private fun replayEvent(json: JSONObject) {
        val type = json.optString("type", "unknown")
        val ts   = json.optLong("timestamp", System.currentTimeMillis())

        val event: Event = when (type) {
            "crash" -> CrashEvent(
                timestamp  = ts,
                crashType  = parseCrashType(json.optString("crashType", "UNCAUGHT_EXCEPTION")),
                message    = json.optString("message", "Reproduced crash"),
                stackTrace = json.optString("stackTrace", "at com.droidpulse.replay.ReproducedCrash"),
                threadName = json.optString("threadName", "main"),
                isFatal    = json.optBoolean("isFatal", false)   // false = non-fatal replay
            )

            "lifecycle" -> ScreenEvent(
                timestamp  = ts,
                screenName = json.optString("screenName", "UnknownScreen"),
                screenType = runCatching { ScreenType.valueOf(json.optString("screenType", "ACTIVITY")) }.getOrDefault(ScreenType.ACTIVITY),
                eventType  = runCatching { LifecycleEventType.valueOf(json.optString("eventType", "RESUMED")) }.getOrDefault(LifecycleEventType.RESUMED),
                duration   = if (json.has("duration")) json.getInt("duration").toLong() else null
            )

            "memory" -> object : Event() {
                override val timestamp = ts
                override val type      = "memory"
                val usedMemoryMb       = json.optInt("usedMemoryMb", 0)
                val maxMemoryMb        = json.optInt("maxMemoryMb", 4096)
                val usagePercentage    = json.optDouble("usagePercentage", 0.0)
                val isLowMemory        = json.optBoolean("isLowMemory", false)
            }

            "network" -> object : Event() {
                override val timestamp = ts
                override val type      = "network"
                val method             = json.optString("method", "GET")
                val url                = json.optString("url", "")
                val responseCode       = json.optInt("responseCode", 200)
                val duration           = json.optInt("duration", 0)
                val success            = json.optBoolean("success", true)
            }

            "fps" -> object : Event() {
                override val timestamp = ts
                override val type      = "fps"
                val fps                = json.optDouble("fps", 60.0)
                val jankCount          = json.optInt("jankCount", 0)
                val droppedFrames      = json.optInt("droppedFrames", 0)
            }

            "database" -> object : Event() {
                override val timestamp = ts
                override val type      = "database"
                val query              = json.optString("query", "")
                val durationMs         = json.optInt("durationMs", 0)
                val isMainThread       = json.optBoolean("isMainThread", false)
                val isSlow             = json.optBoolean("isSlow", false)
            }

            else -> object : Event() {
                override val timestamp = ts
                override val type      = type
            }
        }

        Logger.debug("[CMD] Replaying event: $type @ $ts")
        DroidPulse.dispatcher.dispatch(event)
    }

    private fun parseCrashType(s: String) = try {
        CrashType.valueOf(s)
    } catch (_: Exception) {
        CrashType.UNCAUGHT_EXCEPTION
    }

    // ── Ack back to dashboard ─────────────────────────────────────────────────

    private fun dispatchAck(ackType: String, extra: Map<String, Any> = emptyMap()) {
        val event = object : Event() {
            override val timestamp = System.currentTimeMillis()
            override val type      = "cmd_ack"
            val ack                = ackType
            val data               = extra
        }
        DroidPulse.dispatcher.dispatch(event)
    }
}
