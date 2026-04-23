package com.yourcompany.optimizer.core

/**
 * Performance Analyzer — "Why is my app slow?"
 *
 * Analyzes recent events and generates plain-English explanations
 * with actionable fix suggestions.
 *
 * Two modes:
 * 1. LOCAL — Rule-based analysis (no internet, always available)
 * 2. AI    — Sends data to AI API for deeper analysis (requires API key)
 *
 * Usage:
 * ```kotlin
 * // Get instant local analysis
 * val analysis = DroidPulse.analyze()
 * println(analysis.summary)
 * println(analysis.topIssue)
 * println(analysis.suggestion)
 *
 * // Or from dashboard — click "Why is my app slow?" button
 * ```
 */
object PerformanceAnalyzer {

    data class Issue(
        val severity: IssueSeverity,
        val title: String,
        val detail: String,
        val suggestion: String,
        val codeHint: String? = null
    )

    data class Analysis(
        val summary: String,
        val score: Int,           // 0-100
        val topIssue: Issue?,
        val allIssues: List<Issue>,
        val analyzedEvents: Int,
        val timeWindowMinutes: Int
    )

    enum class IssueSeverity { CRITICAL, HIGH, MEDIUM, LOW }

    /**
     * Analyze last N minutes of events and return plain-English diagnosis.
     * Runs locally — no internet required.
     */
    fun analyze(minutesBack: Int = 5): Analysis {
        val events = DroidPulse.dispatcher.getEventsSince(minutesBack)
        val issues = mutableListOf<Issue>()

        // ── CRASH ANALYSIS ────────────────────────────────────────────────
        val crashes = events.filterIsInstance<CrashEvent>()
        crashes.forEach { crash ->
            when (crash.crashType) {
                CrashType.UNCAUGHT_EXCEPTION -> issues.add(Issue(
                    severity   = IssueSeverity.CRITICAL,
                    title      = "App Crash Detected",
                    detail     = crash.message,
                    suggestion = "Check the stack trace and fix the root cause. Common causes: NullPointerException, IndexOutOfBoundsException.",
                    codeHint   = extractCodeHint(crash.stackTrace)
                ))
                CrashType.ANR -> issues.add(Issue(
                    severity   = IssueSeverity.CRITICAL,
                    title      = "ANR — App Not Responding",
                    detail     = "Main thread was blocked for too long",
                    suggestion = "Move heavy operations off the main thread. Use coroutines: withContext(Dispatchers.IO) { ... }",
                    codeHint   = extractCodeHint(crash.stackTrace)
                ))
                CrashType.FROZEN_UI -> issues.add(Issue(
                    severity   = IssueSeverity.HIGH,
                    title      = "Frozen UI Detected",
                    detail     = crash.message,
                    suggestion = "Main thread is blocked. Check for: database queries, file I/O, or heavy computation in onCreate() or onResume()."
                ))
            }
        }

        // ── SLOW SCREEN ANALYSIS ──────────────────────────────────────────
        val screenEvents = events.filterIsInstance<ScreenEvent>()
            .filter { it.eventType == LifecycleEventType.RESUMED && it.duration != null }

        screenEvents.forEach { screen ->
            val ms = screen.duration!!
            when {
                ms > 1000 -> issues.add(Issue(
                    severity   = IssueSeverity.HIGH,
                    title      = "${screen.screenName} is Very Slow to Open",
                    detail     = "Takes ${ms}ms to open (target: <300ms)",
                    suggestion = "Check onCreate() for: heavy initialization, synchronous network calls, large image loading, or database queries on main thread.",
                    codeHint   = "Move heavy work to viewModel.init { } or use LaunchedEffect { }"
                ))
                ms > 500 -> issues.add(Issue(
                    severity   = IssueSeverity.MEDIUM,
                    title      = "${screen.screenName} Opens Slowly",
                    detail     = "Takes ${ms}ms to open (target: <300ms)",
                    suggestion = "Consider lazy loading: defer non-critical initialization until after the screen is visible.",
                    codeHint   = "Use lifecycle.coroutineScope.launch { } instead of blocking in onCreate()"
                ))
            }
        }

        // ── SLOW API ANALYSIS ─────────────────────────────────────────────
        val apiEvents = events.filter { it.type == "network" }

        // Group by endpoint using reflection-safe access
        data class ApiInfo(val url: String, val duration: Long, val success: Boolean, val responseCode: Int?)

        fun Event.toApiInfo(): ApiInfo? = try {
            val cls = javaClass
            ApiInfo(
                url          = cls.getDeclaredField("url").also { it.isAccessible = true }.get(this) as? String ?: "",
                duration     = cls.getDeclaredField("duration").also { it.isAccessible = true }.getLong(this),
                success      = cls.getDeclaredField("success").also { it.isAccessible = true }.getBoolean(this),
                responseCode = cls.getDeclaredField("responseCode").also { it.isAccessible = true }.get(this) as? Int
            )
        } catch (_: Exception) { null }

        val apiInfos = apiEvents.mapNotNull { it.toApiInfo() }
        val endpointGroups = apiInfos.groupBy { it.url }

        endpointGroups.forEach { (url, calls) ->
            val avgMs = calls.map { it.duration }.average()
            val path = try { java.net.URL(url).path } catch (_: Exception) { url }
            val failCount = calls.count { !it.success || (it.responseCode ?: 0) >= 400 }

            when {
                avgMs > 2000 -> issues.add(Issue(
                    severity   = IssueSeverity.HIGH,
                    title      = "Very Slow API: $path",
                    detail     = "${avgMs.toInt()}ms average (${calls.size} calls)",
                    suggestion = "This API is critically slow. Check: server-side query optimization, add caching, or use pagination to reduce payload size.",
                    codeHint   = "Consider adding a loading skeleton UI while this loads"
                ))
                avgMs > 1000 -> issues.add(Issue(
                    severity   = IssueSeverity.MEDIUM,
                    title      = "Slow API: $path",
                    detail     = "${avgMs.toInt()}ms average (${calls.size} calls)",
                    suggestion = "Consider caching this response with a TTL. If data doesn't change often, cache it locally.",
                    codeHint   = "Use Room as a local cache: fetch from DB first, then update from network"
                ))
            }

            if (failCount > 0) {
                issues.add(Issue(
                    severity   = IssueSeverity.HIGH,
                    title      = "API Failures: $path",
                    detail     = "$failCount/${calls.size} calls failed",
                    suggestion = "Add retry logic with exponential backoff. Check network error handling.",
                    codeHint   = "Use Retrofit with a retry interceptor or OkHttp's built-in retry"
                ))
            }
        }

        // ── FPS ANALYSIS ──────────────────────────────────────────────────
        val fpsEvents = events.filterIsInstance<FpsEvent>()
        if (fpsEvents.isNotEmpty()) {
            val avgFps = fpsEvents.map { it.fps }.average()
            val totalJanks = fpsEvents.sumOf { it.jankCount }
            val totalDropped = fpsEvents.sumOf { it.droppedFrames }

            when {
                avgFps < 30 -> issues.add(Issue(
                    severity   = IssueSeverity.HIGH,
                    title      = "Very Low FPS: ${avgFps.toInt()} fps",
                    detail     = "Average FPS is critically low. $totalJanks janks, $totalDropped dropped frames.",
                    suggestion = "Check for: heavy Compose recompositions, large lists without LazyColumn, or expensive operations in draw callbacks.",
                    codeHint   = "Use Android Studio Profiler → CPU → Record to find the bottleneck"
                ))
                avgFps < 50 -> issues.add(Issue(
                    severity   = IssueSeverity.MEDIUM,
                    title      = "Low FPS: ${avgFps.toInt()} fps",
                    detail     = "$totalJanks janks detected",
                    suggestion = "Reduce unnecessary recompositions. Use remember{} and derivedStateOf{} to avoid recomputing expensive values.",
                    codeHint   = "Add @Stable or @Immutable annotations to your data classes"
                ))
            }
        }

        // ── MEMORY ANALYSIS ───────────────────────────────────────────────
        val memoryEvents = events.filterIsInstance<MemoryEvent>()
        val latestMemory = memoryEvents.lastOrNull()
        if (latestMemory != null) {
            when {
                latestMemory.isLowMemory -> issues.add(Issue(
                    severity   = IssueSeverity.CRITICAL,
                    title      = "Low Memory Warning",
                    detail     = "System is low on memory. App may be killed.",
                    suggestion = "Release unused resources. Check for memory leaks using LeakCanary. Avoid holding references to Activities/Fragments.",
                    codeHint   = "Add implementation 'com.squareup.leakcanary:leakcanary-android:2.12'"
                ))
                latestMemory.usagePercentage > 85 -> issues.add(Issue(
                    severity   = IssueSeverity.HIGH,
                    title      = "High Memory Usage: ${latestMemory.usagePercentage.toInt()}%",
                    detail     = "${latestMemory.usedMemoryMb}MB / ${latestMemory.maxMemoryMb}MB used",
                    suggestion = "Check for memory leaks. Common causes: static references to Context, unclosed streams, large bitmaps not recycled.",
                    codeHint   = "Use Bitmap.recycle() and WeakReference<Context> where appropriate"
                ))
            }
        }

        // ── DATABASE ANALYSIS ─────────────────────────────────────────────
        val dbEvents = events.filter { it.type == "database" }
        val mainThreadDb = dbEvents.filter { e ->
            try { e.javaClass.getDeclaredField("isMainThread").also { it.isAccessible = true }.getBoolean(e) }
            catch (_: Exception) { false }
        }
        if (mainThreadDb.isNotEmpty()) {
            val queries = mainThreadDb.mapNotNull { e ->
                try { e.javaClass.getDeclaredField("query").also { it.isAccessible = true }.get(e) as? String }
                catch (_: Exception) { null }
            }.distinct().take(3).joinToString(", ") { it.take(30) }

            issues.add(Issue(
                severity   = IssueSeverity.CRITICAL,
                title      = "Database on Main Thread!",
                detail     = "${mainThreadDb.size} queries ran on main thread: $queries",
                suggestion = "NEVER run database queries on the main thread. Use withContext(Dispatchers.IO) { } or Room's suspend functions.",
                codeHint   = "Change: dao.query() → withContext(Dispatchers.IO) { dao.query() }"
            ))
        }

        // ── BUILD SUMMARY ─────────────────────────────────────────────────
        val sortedIssues = issues.sortedByDescending { it.severity.ordinal }
        val topIssue = sortedIssues.firstOrNull()

        val score = calculateScore(issues)

        val summary = when {
            issues.isEmpty()                                    -> "✅ App is performing well! No issues detected in the last $minutesBack minutes."
            issues.any { it.severity == IssueSeverity.CRITICAL } -> "🔴 Critical issues detected! Immediate attention required."
            issues.any { it.severity == IssueSeverity.HIGH }    -> "🟠 Performance issues detected. ${issues.size} issue${if (issues.size > 1) "s" else ""} found."
            else                                                -> "🟡 Minor performance issues. ${issues.size} issue${if (issues.size > 1) "s" else ""} to optimize."
        }

        return Analysis(
            summary            = summary,
            score              = score,
            topIssue           = topIssue,
            allIssues          = sortedIssues,
            analyzedEvents     = events.size,
            timeWindowMinutes  = minutesBack
        )
    }

    private fun calculateScore(issues: List<Issue>): Int {
        var score = 100
        issues.forEach { issue ->
            score -= when (issue.severity) {
                IssueSeverity.CRITICAL -> 30
                IssueSeverity.HIGH     -> 15
                IssueSeverity.MEDIUM   -> 8
                IssueSeverity.LOW      -> 3
            }
        }
        return maxOf(score, 0)
    }

    private fun extractCodeHint(stackTrace: String): String? {
        // Find first app-specific line in stack trace
        return stackTrace.lines()
            .firstOrNull { line ->
                line.contains("at ") &&
                !line.contains("android.") &&
                !line.contains("java.") &&
                !line.contains("kotlin.") &&
                !line.contains("com.yourcompany.optimizer")
            }
            ?.trim()
            ?.removePrefix("at ")
    }
}
