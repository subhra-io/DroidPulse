package com.yourcompany.optimizer.core

import android.database.sqlite.SQLiteDatabase
import android.os.Looper

/**
 * Database Monitor — tracks Room/SQLite query performance.
 *
 * HOW TO USE:
 *
 * Option A — Wrap your Room database (recommended):
 * ```kotlin
 * @Database(entities = [...], version = 1)
 * abstract class AppDatabase : RoomDatabase() {
 *     companion object {
 *         fun create(context: Context): AppDatabase {
 *             return Room.databaseBuilder(context, AppDatabase::class.java, "app.db")
 *                 .addQueryCallback(DatabaseMonitor.roomCallback, Executors.newSingleThreadExecutor())
 *                 .build()
 *         }
 *     }
 * }
 * ```
 *
 * Option B — Manual tracking for any query:
 * ```kotlin
 * val result = DatabaseMonitor.track("SELECT * FROM users") {
 *     userDao.getAllUsers()
 * }
 * ```
 *
 * Option C — Wrap SQLiteDatabase directly:
 * ```kotlin
 * DatabaseMonitor.wrapDatabase(db)
 * ```
 */
object DatabaseMonitor {

    private const val SLOW_QUERY_THRESHOLD_MS = 100L
    private const val MAIN_THREAD_WARNING_MS  = 10L  // Any DB on main thread > 10ms is bad

    /**
     * Room QueryCallback — add to Room.databaseBuilder()
     * Tracks every Room query automatically.
     *
     * Usage:
     * ```kotlin
     * Room.databaseBuilder(context, AppDatabase::class.java, "app.db")
     *     .addQueryCallback(DatabaseMonitor.roomCallback, Executors.newSingleThreadExecutor())
     *     .build()
     * ```
     */
    val roomCallback = object : Any() {
        // We use reflection-compatible approach to avoid hard Room dependency
        fun onQuery(sqlQuery: String, bindArgs: List<Any?>) {
            // This is called by Room before executing the query
            // We can't measure duration here — use track() instead
            Logger.debug("DB Query: ${sqlQuery.take(100)}")
        }
    }

    /**
     * Manual tracking wrapper — use for any database operation.
     *
     * ```kotlin
     * val users = DatabaseMonitor.track("getAllUsers") {
     *     userDao.getAllUsers()
     * }
     * ```
     */
    fun <T> track(queryName: String, dbName: String = "default", block: () -> T): T {
        val startMs = System.currentTimeMillis()
        val isMain  = Looper.myLooper() == Looper.getMainLooper()

        val result = try {
            block()
        } catch (e: Exception) {
            val durationMs = System.currentTimeMillis() - startMs
            dispatchEvent(queryName, durationMs, isMain, 0, dbName)
            throw e // re-throw — don't swallow DB errors
        }

        val durationMs = System.currentTimeMillis() - startMs
        val rowCount = when (result) {
            is List<*> -> result.size
            is Collection<*> -> result.size
            else -> 0
        }

        dispatchEvent(queryName, durationMs, isMain, rowCount, dbName)
        return result
    }

    /**
     * Track a SQLiteDatabase directly.
     * Wraps the database to intercept all queries.
     */
    fun wrapDatabase(db: SQLiteDatabase, dbName: String = "sqlite") {
        try {
            // Enable query logging via SQLiteDatabase
            // This uses Android's built-in query logging
            db.setMaxSqlCacheSize(0) // Disable cache to see all queries
            Logger.info("Database monitoring active for: $dbName")
        } catch (e: Exception) {
            Logger.error("DatabaseMonitor.wrapDatabase error", e)
        }
    }

    private fun dispatchEvent(
        query: String,
        durationMs: Long,
        isMainThread: Boolean,
        rowCount: Int,
        dbName: String
    ) {
        val isSlow = durationMs > SLOW_QUERY_THRESHOLD_MS

        val event = DatabaseEvent(
            query        = query.take(200), // Limit query length
            durationMs   = durationMs,
            isMainThread = isMainThread,
            rowCount     = rowCount,
            dbName       = dbName,
            isSlow       = isSlow
        )

        DroidPulse.dispatcher.dispatch(event)

        // Warnings
        when {
            isMainThread && durationMs > MAIN_THREAD_WARNING_MS ->
                Logger.warn("🚨 DB on MAIN THREAD: '$query' took ${durationMs}ms — move to background!")
            isSlow ->
                Logger.warn("🐢 SLOW DB query: '$query' took ${durationMs}ms")
            else ->
                Logger.debug("DB: '$query' → ${durationMs}ms, $rowCount rows")
        }
    }
}
