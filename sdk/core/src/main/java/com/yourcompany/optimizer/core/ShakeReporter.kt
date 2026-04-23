package com.yourcompany.optimizer.core

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import kotlin.math.sqrt

/**
 * Shake to Report — QA teams love this.
 *
 * When tester shakes the phone:
 * 1. Captures last 5 minutes of performance data
 * 2. Includes current screen, FPS, memory, recent API calls
 * 3. Uploads to cloud and generates shareable link
 * 4. Shows notification with the link
 *
 * Usage:
 * ```kotlin
 * DroidPulse.start(this, DroidPulseConfig(
 *     enabled = BuildConfig.DEBUG,
 *     shakeToReport = true  // ← enable shake
 * ))
 * ```
 *
 * Or manually trigger:
 * ```kotlin
 * DroidPulse.generateReport("Manual report from QA")
 * ```
 */
internal class ShakeReporter(
    private val context: Context,
    private val onReportGenerated: (reportUrl: String, reportJson: String) -> Unit
) : SensorEventListener {

    private val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)

    // Shake detection thresholds
    private val SHAKE_THRESHOLD_GRAVITY = 2.7f
    private val SHAKE_SLOP_TIME_MS = 500L
    private val SHAKE_COUNT_RESET_TIME_MS = 3000L

    private var shakeTimestamp = 0L
    private var shakeCount = 0
    private var lastShakeTime = 0L
    private var isGenerating = false

    fun start() {
        accelerometer?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_UI)
            Logger.info("📳 Shake to Report enabled — shake phone to generate report")
        } ?: Logger.warn("Accelerometer not available — shake detection disabled")
    }

    fun stop() {
        sensorManager.unregisterListener(this)
    }

    override fun onSensorChanged(event: SensorEvent) {
        if (event.sensor.type != Sensor.TYPE_ACCELEROMETER) return

        val gX = event.values[0] / SensorManager.GRAVITY_EARTH
        val gY = event.values[1] / SensorManager.GRAVITY_EARTH
        val gZ = event.values[2] / SensorManager.GRAVITY_EARTH
        val gForce = sqrt(gX * gX + gY * gY + gZ * gZ)

        if (gForce > SHAKE_THRESHOLD_GRAVITY) {
            val now = System.currentTimeMillis()

            if (now - shakeTimestamp < SHAKE_SLOP_TIME_MS) return
            shakeTimestamp = now

            if (now - lastShakeTime > SHAKE_COUNT_RESET_TIME_MS) shakeCount = 0
            lastShakeTime = now
            shakeCount++

            // Require 2 shakes to trigger (avoid accidental triggers)
            if (shakeCount >= 2 && !isGenerating) {
                shakeCount = 0
                generateReport("Shake triggered by QA tester")
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    /**
     * Generate a performance report from the last 5 minutes.
     * Can be called manually or triggered by shake.
     */
    fun generateReport(trigger: String = "Manual") {
        if (isGenerating) return
        isGenerating = true

        DroidPulse.scope.launch {
            try {
                    Logger.info("📊 Generating shake report (trigger: $trigger)...")

                    val report = buildReport(trigger)
                    val reportJson = report.toString()

                    // Try to upload to cloud if configured
                    val config = DroidPulse.getConfig()
                    val reportUrl = if (config.cloud != null) {
                        uploadReport(config.cloud, reportJson)
                    } else {
                        "local://report-${System.currentTimeMillis()}"
                    }

                    Logger.info("📊 Report generated: $reportUrl")
                    onReportGenerated(reportUrl, reportJson)
                } catch (e: Exception) {
                    Logger.error("ShakeReporter error", e)
                } finally {
                    isGenerating = false
                }
            }
        }

    private fun buildReport(trigger: String): JSONObject {
        val now = System.currentTimeMillis()
        val fiveMinutesAgo = now - (5 * 60 * 1000L)

        // Get last 5 minutes of events from ring buffer
        val recentEvents = DroidPulse.dispatcher.getEventsSince(5)

        val screenEvents  = recentEvents.filter { it.type == "lifecycle" }
        val apiEvents     = recentEvents.filter { it.type == "network" }
        val fpsEvents     = recentEvents.filter { it.type == "fps" }
        val memoryEvents  = recentEvents.filter { it.type == "memory" }
        val crashEvents   = recentEvents.filter { it.type == "crash" }

        // Calculate summary stats
        val avgFps = if (fpsEvents.isNotEmpty())
            fpsEvents.filterIsInstance<FpsEvent>().map { it.fps }.average() else 0.0
        val latestMemory = memoryEvents.filterIsInstance<MemoryEvent>().lastOrNull()
        val slowApis = apiEvents.filter { e ->
            try { e.javaClass.getDeclaredField("duration").also { it.isAccessible = true }.getLong(e) > 500 }
            catch (_: Exception) { false }
        }

        return JSONObject().apply {
            put("reportId",    "dp-${now}")
            put("trigger",     trigger)
            put("generatedAt", now)
            put("deviceModel", "${Build.MANUFACTURER} ${Build.MODEL}")
            put("osVersion",   "Android ${Build.VERSION.RELEASE}")
            put("appVersion",  try {
                context.packageManager.getPackageInfo(context.packageName, 0).versionName
            } catch (_: Exception) { "unknown" })

            put("summary", JSONObject().apply {
                put("totalEvents",    recentEvents.size)
                put("avgFps",         String.format("%.1f", avgFps))
                put("memoryUsedMb",   latestMemory?.usedMemoryMb ?: 0)
                put("memoryPercent",  String.format("%.1f", latestMemory?.usagePercentage ?: 0f))
                put("apiCallCount",   apiEvents.size)
                put("slowApiCount",   slowApis.size)
                put("crashCount",     crashEvents.size)
                put("screensVisited", screenEvents.map { (it as? ScreenEvent)?.screenName }.distinct().size)
            })

            put("screenJourney", JSONArray(
                screenEvents.filterIsInstance<ScreenEvent>()
                    .filter { it.eventType == LifecycleEventType.RESUMED }
                    .map { "${it.screenName} (${it.duration ?: 0}ms)" }
            ))

            // Slow APIs — reflection-safe
            put("slowApis", JSONArray(
                slowApis.map { e ->
                    JSONObject().apply {
                        try {
                            val cls = e.javaClass
                            val url = cls.getDeclaredField("url").also { it.isAccessible = true }.get(e) as? String ?: ""
                            put("url",      try { java.net.URL(url).path } catch (_: Exception) { url })
                            put("method",   cls.getDeclaredField("method").also { it.isAccessible = true }.get(e))
                            put("duration", cls.getDeclaredField("duration").also { it.isAccessible = true }.getLong(e))
                            put("status",   cls.getDeclaredField("responseCode").also { it.isAccessible = true }.get(e) ?: "ERR")
                        } catch (_: Exception) {}
                    }
                }
            ))

            // Crashes
            if (crashEvents.isNotEmpty()) {
                put("crashes", JSONArray(
                    crashEvents.filterIsInstance<CrashEvent>().map { crash ->
                        JSONObject().apply {
                            put("type",       crash.crashType.name)
                            put("message",    crash.message)
                            put("stackTrace", crash.stackTrace.take(500))
                        }
                    }
                ))
            }
        }
    }

    private fun uploadReport(cloudConfig: CloudConfig, reportJson: String): String {
        return try {
            val url = "${cloudConfig.endpoint}/api/reports"
            val connection = URL(url).openConnection() as HttpURLConnection
            connection.apply {
                requestMethod = "POST"
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Authorization", "Bearer ${cloudConfig.apiKey}")
                doOutput = true
                connectTimeout = 10_000
                readTimeout = 10_000
            }

            OutputStreamWriter(connection.outputStream).use { it.write(reportJson) }

            if (connection.responseCode == 200 || connection.responseCode == 201) {
                val response = JSONObject(connection.inputStream.bufferedReader().readText())
                response.optString("reportUrl", "uploaded")
            } else {
                "local://report-${System.currentTimeMillis()}"
            }
        } catch (e: Exception) {
            Logger.error("Report upload failed", e)
            "local://report-${System.currentTimeMillis()}"
        }
    }
}
