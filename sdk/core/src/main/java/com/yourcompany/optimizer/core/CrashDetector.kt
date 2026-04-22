package com.yourcompany.optimizer.core

import android.os.Handler
import android.os.Looper
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.io.PrintWriter
import java.io.StringWriter

/**
 * Detects crashes, ANRs, and frozen UI.
 *
 * How it works:
 *
 * 1. CRASH DETECTION
 *    Installs a global uncaught exception handler.
 *    When app crashes → we capture it, dispatch event, then let original handler run.
 *    We NEVER suppress crashes — we just observe them.
 *
 * 2. ANR / FROZEN UI DETECTION
 *    Every 1 second, posts a "ping" to the main thread.
 *    If the main thread doesn't respond within 5 seconds → frozen UI detected.
 *    This is how Android's own ANR detection works internally.
 *
 * 3. ZERO IMPACT
 *    All detection runs on background thread.
 *    We never block or slow down the main thread.
 */
internal class CrashDetector {

    private val mainHandler = Handler(Looper.getMainLooper())

    fun start() {
        installCrashHandler()
        startFrozenUIDetector()
        Logger.info("Crash + ANR detection started")
    }

    // ─── 1. CRASH DETECTION ───────────────────────────────────────────────

    private fun installCrashHandler() {
        val originalHandler = Thread.getDefaultUncaughtExceptionHandler()

        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            try {
                // Capture the crash
                val event = CrashEvent(
                    crashType  = CrashType.UNCAUGHT_EXCEPTION,
                    message    = throwable.message ?: throwable.javaClass.simpleName,
                    stackTrace = getStackTrace(throwable),
                    threadName = thread.name,
                    isFatal    = true
                )
                DroidPulse.dispatcher.dispatch(event)
                Logger.error("💥 CRASH detected on thread '${thread.name}': ${throwable.message}", throwable)
            } catch (e: Exception) {
                // Never let our crash handler cause another crash
                Logger.error("CrashDetector internal error", e)
            } finally {
                // ALWAYS call original handler — let the app crash normally
                // We are observers, not suppressors
                originalHandler?.uncaughtException(thread, throwable)
            }
        }
    }

    // ─── 2. FROZEN UI / ANR DETECTION ────────────────────────────────────

    private fun startFrozenUIDetector() {
        DroidPulse.scope.launch {
            // How this works:
            // Every second, we post a "ping" to the main thread.
            // We record when we sent it.
            // If the main thread doesn't execute it within 5 seconds → frozen!

            var lastPingTime = System.currentTimeMillis()
            var lastPongTime = System.currentTimeMillis()
            var frozenReported = false

            while (isActive) {
                delay(1000L)

                val now = System.currentTimeMillis()
                lastPingTime = now

                // Post ping to main thread
                mainHandler.post {
                    lastPongTime = System.currentTimeMillis()
                    frozenReported = false // main thread responded — reset
                }

                // Check if main thread responded within 5 seconds
                val timeSinceLastPong = now - lastPongTime
                if (timeSinceLastPong > 5000L && !frozenReported) {
                    frozenReported = true

                    val event = CrashEvent(
                        crashType  = CrashType.FROZEN_UI,
                        message    = "Main thread frozen for ${timeSinceLastPong}ms",
                        stackTrace = getMainThreadStackTrace(),
                        threadName = "main",
                        isFatal    = false
                    )
                    DroidPulse.dispatcher.dispatch(event)
                    Logger.warn("🥶 FROZEN UI: Main thread blocked for ${timeSinceLastPong}ms")
                }
            }
        }
    }

    // ─── HELPERS ──────────────────────────────────────────────────────────

    private fun getStackTrace(throwable: Throwable): String {
        val sw = StringWriter()
        throwable.printStackTrace(PrintWriter(sw))
        // Limit to 2000 chars to avoid huge WebSocket messages
        return sw.toString().take(2000)
    }

    private fun getMainThreadStackTrace(): String {
        return try {
            val mainThread = Thread.getAllStackTraces()
                .entries
                .firstOrNull { it.key.name == "main" }
            mainThread?.value
                ?.joinToString("\n") { "\tat $it" }
                ?.take(2000)
                ?: "Stack trace unavailable"
        } catch (e: Exception) {
            "Stack trace unavailable: ${e.message}"
        }
    }
}
