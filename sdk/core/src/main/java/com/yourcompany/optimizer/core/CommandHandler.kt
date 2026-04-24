package com.yourcompany.optimizer.core

import android.os.Handler
import android.os.Looper
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Handles commands sent from the DroidPulse dashboard over WebSocket.
 *
 * Commands:
 *   { "cmd": "reproduce_trace", "sessionId": "abc", "stepDelayMs": 420 }
 *   { "cmd": "replay_event",    "event": { "type": "crash", ... } }
 *   { "cmd": "stop_replay" }
 *   { "cmd": "ping" }
 *
 * For reproduce_trace the device fetches events from the cloud backend
 * by sessionId (avoids WebSocket 65KB frame size limit) then re-dispatches.
 */
object CommandHandler {

    private val mainHandler = Handler(Looper.getMainLooper())

    /** Set by DroidPulse.start() when CloudConfig is provided */
    var cloudApiUrl: String = ""
    var cloudApiKey: String = ""

    /** App context for overlay — set by DroidPulse.start() */
    var appContext: android.content.Context? = null

    fun handle(raw: String) {
        try {
            val json = JSONObject(raw)
            when (val cmd = json.optString("cmd")) {

                "ping" -> {
                    Logger.debug("[CMD] ping")
                    dispatchAck("pong")
                }

                "replay_event" -> {
                    val eventJson = json.optJSONObject("event") ?: return
                    replayEvent(eventJson)
                }

                "reproduce_trace" -> {
                    val sessionId = json.optString("sessionId", "")
                    val delayMs   = json.optLong("stepDelayMs", 400L)
                    val total     = json.optInt("totalEvents", 0)
                    Logger.info("[CMD] reproduce_trace session=$sessionId events~$total")
                    dispatchAck("reproduce_started", mapOf("sessionId" to sessionId))

                    // Show overlay immediately
                    appContext?.let { ctx ->
                        ReplayOverlay.show(ctx, total) {
                            // User tapped STOP on device
                            mainHandler.removeCallbacksAndMessages(null)
                            dispatchAck("replay_stopped")
                        }
                    }

                    Thread {
                        val events = fetchSessionEvents(sessionId)
                        if (events.isEmpty()) {
                            Logger.warn("[CMD] No events for session $sessionId")
                            dispatchAck("reproduce_error", mapOf("reason" to "no_events"))
                            ReplayOverlay.dismiss()
                            return@Thread
                        }
                        Logger.info("[CMD] Replaying ${events.size} events")
                        // Update overlay total with actual count
                        mainHandler.post {
                            ReplayOverlay.updateProgress(0, events.size, "lifecycle")
                        }
                        events.forEachIndexed { i, ev ->
                            mainHandler.postDelayed({
                                replayEvent(ev)
                                ReplayOverlay.updateProgress(i + 1, events.size, ev.optString("type", ""))
                            }, i * delayMs)
                        }
                        mainHandler.postDelayed({
                            dispatchAck("reproduce_done", mapOf("total" to events.size))
                            ReplayOverlay.showComplete(events.size)
                        }, events.size * delayMs + 500)
                    }.start()
                }

                "stop_replay" -> {
                    mainHandler.removeCallbacksAndMessages(null)
                    Logger.info("[CMD] stop_replay")
                    ReplayOverlay.dismiss()
                    dispatchAck("replay_stopped")
                }

                else -> Logger.warn("[CMD] Unknown command: $cmd")
            }
        } catch (e: Exception) {
            Logger.error("[CMD] Failed to handle: $raw", e)
        }
    }

    // ── Cloud fetch ───────────────────────────────────────────────────────────

    private fun fetchSessionEvents(sessionId: String): List<JSONObject> {
        if (cloudApiUrl.isEmpty() || sessionId.isEmpty() || sessionId == "demo") return emptyList()
        return try {
            val conn = URL("$cloudApiUrl/api/sessions/$sessionId/events")
                .openConnection() as HttpURLConnection
            conn.setRequestProperty("Authorization", "Bearer $cloudApiKey")
            conn.connectTimeout = 5000
            conn.readTimeout    = 10000
            val body = conn.inputStream.bufferedReader().readText()
            conn.disconnect()
            val arr = JSONObject(body).optJSONArray("events") ?: return emptyList()
            (0 until arr.length()).map { arr.getJSONObject(it) }
        } catch (e: Exception) {
            Logger.error("[CMD] fetchSessionEvents failed", e)
            emptyList()
        }
    }

    // ── Event reconstruction ──────────────────────────────────────────────────

    private fun replayEvent(json: JSONObject) {
        val type = json.optString("type", "unknown")
        val ts   = System.currentTimeMillis()

        // ── For lifecycle RESUMED events — actually navigate to the screen ──
        if (type == "lifecycle") {
            val eventType  = json.optString("eventType", "")
            val screenName = json.optString("screenName", "")
            if (eventType == "RESUMED" && screenName.isNotEmpty()) {
                mainHandler.post {
                    ActivityRegistry.navigateTo(screenName)
                }
            }
        }

        val event: Event = when (type) {
            "crash" -> CrashEvent(
                timestamp  = ts,
                crashType  = runCatching { CrashType.valueOf(json.optString("crashType", "UNCAUGHT_EXCEPTION")) }.getOrDefault(CrashType.UNCAUGHT_EXCEPTION),
                message    = json.optString("message", "Reproduced crash"),
                stackTrace = json.optString("stackTrace", "at com.droidpulse.replay.ReproducedCrash"),
                threadName = json.optString("threadName", "main"),
                isFatal    = false
            )
            "lifecycle" -> ScreenEvent(
                timestamp  = ts,
                screenName = json.optString("screenName", "UnknownScreen"),
                screenType = runCatching { ScreenType.valueOf(json.optString("screenType", "ACTIVITY")) }.getOrDefault(ScreenType.ACTIVITY),
                eventType  = runCatching { LifecycleEventType.valueOf(json.optString("eventType", "RESUMED")) }.getOrDefault(LifecycleEventType.RESUMED),
                duration   = if (json.has("duration")) json.getInt("duration").toLong() else null
            )
            "memory" -> object : Event() {
                override val timestamp    = ts
                override val type         = "memory"
                val usedMemoryMb          = json.optInt("usedMemoryMb", 0)
                val maxMemoryMb           = json.optInt("maxMemoryMb", 4096)
                val usagePercentage       = json.optDouble("usagePercentage", 0.0)
                val isLowMemory           = json.optBoolean("isLowMemory", false)
            }
            "network" -> object : Event() {
                override val timestamp    = ts
                override val type         = "network"
                val method                = json.optString("method", "GET")
                val url                   = json.optString("url", "")
                val responseCode          = json.optInt("responseCode", 200)
                val duration              = json.optInt("duration", 0)
                val success               = json.optBoolean("success", true)
            }
            "fps" -> object : Event() {
                override val timestamp    = ts
                override val type         = "fps"
                val fps                   = json.optDouble("fps", 60.0)
                val jankCount             = json.optInt("jankCount", 0)
                val droppedFrames         = json.optInt("droppedFrames", 0)
            }
            "database" -> object : Event() {
                override val timestamp    = ts
                override val type         = "database"
                val query                 = json.optString("query", "")
                val durationMs            = json.optInt("durationMs", 0)
                val isMainThread          = json.optBoolean("isMainThread", false)
                val isSlow                = json.optBoolean("isSlow", false)
            }
            else -> object : Event() {
                override val timestamp = ts
                override val type      = type
            }
        }

        Logger.debug("[CMD] Replaying: $type")
        DroidPulse.dispatcher.dispatch(event)
    }

    private fun dispatchAck(ackType: String, extra: Map<String, Any> = emptyMap()) {
        DroidPulse.dispatcher.dispatch(object : Event() {
            override val timestamp = System.currentTimeMillis()
            override val type      = "cmd_ack"
            val ack                = ackType
            val data               = extra
        })
    }
}
