package com.yourcompany.optimizer.core

import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView

/**
 * On-device overlay shown during REPRODUCE_TRACE replay.
 * Appears as a dark banner at the top of the screen matching the dashboard theme.
 * Uses WindowManager so it floats above all activities.
 */
object ReplayOverlay {

    private val mainHandler = Handler(Looper.getMainLooper())
    private var overlayView: View? = null
    private var progressText: TextView? = null
    private var statusText: TextView? = null
    private var progressBar: ProgressBar? = null
    private var onStopCallback: (() -> Unit)? = null

    fun show(context: Context, totalEvents: Int, onStop: () -> Unit) {
        mainHandler.post {
            if (overlayView != null) return@post
            onStopCallback = onStop

            val wm = context.applicationContext
                .getSystemService(Context.WINDOW_SERVICE) as WindowManager

            // ── Root container ────────────────────────────────────────────────
            val root = LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
                setBackgroundColor(Color.parseColor("#E6000000"))
                setPadding(dp(context, 16), dp(context, 12), dp(context, 16), dp(context, 12))
            }

            // ── Top row: icon + title + stop button ───────────────────────────
            val topRow = LinearLayout(context).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
            }

            val dot = View(context).apply {
                setBackgroundColor(Color.parseColor("#EF4444"))
                layoutParams = LinearLayout.LayoutParams(dp(context, 8), dp(context, 8)).also {
                    it.marginEnd = dp(context, 8)
                    it.gravity = Gravity.CENTER_VERTICAL
                }
            }
            // Pulse animation via alpha
            val pulseRunnable = object : Runnable {
                var up = true
                override fun run() {
                    dot.animate().alpha(if (up) 0.3f else 1f).setDuration(600).start()
                    up = !up
                    mainHandler.postDelayed(this, 600)
                }
            }
            mainHandler.post(pulseRunnable)

            val title = TextView(context).apply {
                text = "REPLAY MODE"
                setTextColor(Color.parseColor("#EF4444"))
                textSize = 10f
                typeface = Typeface.MONOSPACE
                letterSpacing = 0.15f
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }

            val stopBtn = TextView(context).apply {
                text = "■ STOP"
                setTextColor(Color.parseColor("#9CA3AF"))
                textSize = 9f
                typeface = Typeface.MONOSPACE
                letterSpacing = 0.1f
                setPadding(dp(context, 10), dp(context, 6), dp(context, 10), dp(context, 6))
                setBackgroundColor(Color.parseColor("#1F2937"))
                setOnClickListener {
                    onStopCallback?.invoke()
                    dismiss()
                }
            }

            topRow.addView(dot)
            topRow.addView(title)
            topRow.addView(stopBtn)

            // ── Progress bar ──────────────────────────────────────────────────
            val pb = ProgressBar(context, null, android.R.attr.progressBarStyleHorizontal).apply {
                max = totalEvents
                progress = 0
                progressDrawable = context.getDrawable(android.R.drawable.progress_horizontal)
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    dp(context, 3)
                ).also { it.topMargin = dp(context, 8); it.bottomMargin = dp(context, 6) }
                // Tint blue
                progressTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#3B82F6"))
                progressBackgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#1F2937"))
            }
            progressBar = pb

            // ── Status line ───────────────────────────────────────────────────
            val status = TextView(context).apply {
                text = "ESTABLISHING REPLAY CONTEXT..."
                setTextColor(Color.parseColor("#6B7280"))
                textSize = 8f
                typeface = Typeface.MONOSPACE
                letterSpacing = 0.1f
            }
            statusText = status

            val progress = TextView(context).apply {
                text = "0 / $totalEvents"
                setTextColor(Color.parseColor("#9CA3AF"))
                textSize = 8f
                typeface = Typeface.MONOSPACE
            }
            progressText = progress

            val bottomRow = LinearLayout(context).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                addView(status, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
                addView(progress)
            }

            root.addView(topRow)
            root.addView(pb)
            root.addView(bottomRow)

            // ── WindowManager params ──────────────────────────────────────────
            val type = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE

            val params = WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                type,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                        WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT
            ).apply {
                gravity = Gravity.TOP or Gravity.START
                x = 0; y = 0
            }

            try {
                wm.addView(root, params)
                overlayView = root
                Logger.info("[ReplayOverlay] Shown")
            } catch (e: Exception) {
                Logger.error("[ReplayOverlay] Failed to show overlay", e)
            }
        }
    }

    fun updateProgress(current: Int, total: Int, eventType: String) {
        mainHandler.post {
            progressBar?.progress = current
            progressText?.text = "$current / $total"
            statusText?.text = when (eventType) {
                "lifecycle" -> "NAVIGATING SCREEN FLOW..."
                "network"   -> "REPLAYING NETWORK CALLS..."
                "memory"    -> "SIMULATING MEMORY STATE..."
                "fps"       -> "REPLAYING FRAME METRICS..."
                "crash"     -> "REPRODUCING CRASH CONTEXT..."
                "database"  -> "REPLAYING DB QUERIES..."
                else        -> "REPLAYING ${eventType.uppercase()}..."
            }
        }
    }

    fun showComplete(total: Int) {
        mainHandler.post {
            statusText?.text = "REPLAY COMPLETE — $total EVENTS"
            statusText?.setTextColor(Color.parseColor("#22C55E"))
            progressText?.setTextColor(Color.parseColor("#22C55E"))
            // Auto-dismiss after 3s
            mainHandler.postDelayed({ dismiss() }, 3000)
        }
    }

    fun dismiss() {
        mainHandler.post {
            val view = overlayView ?: return@post
            try {
                val wm = view.context.applicationContext
                    .getSystemService(Context.WINDOW_SERVICE) as WindowManager
                wm.removeView(view)
            } catch (e: Exception) {
                Logger.error("[ReplayOverlay] Failed to dismiss", e)
            }
            overlayView  = null
            progressText = null
            statusText   = null
            progressBar  = null
            onStopCallback = null
            Logger.info("[ReplayOverlay] Dismissed")
        }
    }

    private fun dp(context: Context, dp: Int): Int =
        (dp * context.resources.displayMetrics.density).toInt()
}
