package com.yourcompany.optimizer.core

import android.os.Handler
import android.os.Looper
import org.json.JSONObject

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
