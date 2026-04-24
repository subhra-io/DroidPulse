'use client'

import { useMemo, useState } from 'react'

interface Props {
  events: any[]
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Issue {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  category: string
  title: string
  plain: string        // one sentence a junior dev understands
  reason: string       // the actual technical cause
  fix: string          // concrete fix
  codeHint?: string    // copy-paste snippet or file hint
  metric?: string      // the number that proves it
}

// ── Analysis engine ───────────────────────────────────────────────────────────

function analyse(events: any[]): Issue[] {
  const issues: Issue[] = []

  const lifecycle = events.filter(e => e.type === 'lifecycle')
  const network   = events.filter(e => e.type === 'network')
  const memory    = events.filter(e => e.type === 'memory')
  const fps       = events.filter(e => e.type === 'fps')
  const db        = events.filter(e => e.type === 'database')
  const crashes   = events.filter(e => e.type === 'crash')

  // ── 1. SLOW SCREEN OPEN ───────────────────────────────────────────────────
  const resumed = lifecycle.filter(e => e.eventType === 'RESUMED' && e.duration > 0)
  resumed.forEach(e => {
    const ms = e.duration
    if (ms > 1000) {
      issues.push({
        severity: 'CRITICAL',
        category: 'Startup',
        title: `${e.screenName} takes ${ms}ms to open`,
        plain: `Your ${e.screenName} screen takes ${(ms/1000).toFixed(1)} seconds to appear. Users expect under 300ms.`,
        reason: `Something in onCreate() or onResume() is blocking the main thread for ${ms}ms. Common culprits: loading a large image synchronously, running a database query, or initialising a heavy SDK on the UI thread.`,
        fix: 'Move everything except UI setup out of onCreate(). Use viewModelScope.launch { } for data loading.',
        codeHint: `// Bad\noverride fun onCreate() {\n  val data = db.query()  // blocks UI\n  imageView.setImageBitmap(BitmapFactory.decodeFile(path)) // blocks UI\n}\n\n// Good\noverride fun onCreate() {\n  viewModel.data.observe(this) { render(it) }\n}\n// In ViewModel:\ninit { viewModelScope.launch { _data.value = db.query() } }`,
        metric: `${ms}ms (target < 300ms)`,
      })
    } else if (ms > 400) {
      issues.push({
        severity: 'HIGH',
        category: 'Startup',
        title: `${e.screenName} opens in ${ms}ms`,
        plain: `${e.screenName} is slower than it should be. Users notice anything over 300ms.`,
        reason: `The screen takes ${ms}ms to become interactive. This is usually caused by synchronous work in onCreate() — even something as simple as reading SharedPreferences blocks the main thread.`,
        fix: 'Defer non-critical setup. Show the UI skeleton first, load data after.',
        codeHint: `lifecycleScope.launch {\n  delay(0) // yield to UI thread first\n  loadHeavyData()\n}`,
        metric: `${ms}ms`,
      })
    }
  })

  // ── 2. MAIN THREAD DATABASE ───────────────────────────────────────────────
  const mainThreadDb = db.filter(e => e.isMainThread)
  if (mainThreadDb.length > 0) {
    const queries = [...new Set(mainThreadDb.map(e => e.query).filter(Boolean))].slice(0, 2)
    const totalMs = mainThreadDb.reduce((s, e) => s + (e.durationMs ?? 0), 0)
    issues.push({
      severity: 'CRITICAL',
      category: 'Database',
      title: `${mainThreadDb.length} database ${mainThreadDb.length === 1 ? 'query' : 'queries'} on main thread`,
      plain: `Your app is reading/writing the database directly on the UI thread. This freezes the screen every time it runs.`,
      reason: `Room/SQLite queries ran on the main thread ${mainThreadDb.length} times, blocking the UI for a total of ${totalMs}ms. Queries: ${queries.map(q => `"${String(q).slice(0, 40)}"`).join(', ')}.`,
      fix: 'Wrap every DAO call in withContext(Dispatchers.IO) { } or use Room\'s suspend functions.',
      codeHint: `// Bad — freezes UI\nval user = userDao.getUser(id)\n\n// Good — runs on IO thread\nval user = withContext(Dispatchers.IO) {\n  userDao.getUser(id)\n}\n\n// Or use suspend DAO (Room handles threading)\nsuspend fun getUser(id: Int): User`,
      metric: `${mainThreadDb.length} queries, ${totalMs}ms total blocked`,
    })
  }

  // ── 3. SLOW / FAILING APIS ────────────────────────────────────────────────
  const byEndpoint = new Map<string, any[]>()
  network.forEach(e => {
    const path = (() => { try { return new URL(e.url).pathname } catch { return e.url } })()
    if (!byEndpoint.has(path)) byEndpoint.set(path, [])
    byEndpoint.get(path)!.push(e)
  })

  byEndpoint.forEach((calls, path) => {
    const avg    = calls.reduce((s, e) => s + (e.duration ?? 0), 0) / calls.length
    const failed = calls.filter(e => !e.success || (e.responseCode ?? 200) >= 400)
    const slow   = calls.filter(e => e.duration > 1000)

    if (avg > 2000) {
      issues.push({
        severity: 'CRITICAL',
        category: 'Network',
        title: `${path} averages ${Math.round(avg)}ms`,
        plain: `Every call to ${path} takes over 2 seconds. If this blocks your login or home screen, users see a frozen app.`,
        reason: `${calls.length} calls averaged ${Math.round(avg)}ms. This is likely a slow server query, missing index, or large uncompressed payload. If this API is called during screen load, it directly adds to your startup time.`,
        fix: 'Add server-side caching, paginate large responses, or load this data in the background after the screen appears.',
        codeHint: `// Show screen immediately, load data after\noverride fun onResume() {\n  showSkeleton()\n  lifecycleScope.launch {\n    val data = api.fetchData() // runs in background\n    hideSkeleton()\n    render(data)\n  }\n}`,
        metric: `avg ${Math.round(avg)}ms over ${calls.length} calls`,
      })
    } else if (avg > 1000) {
      issues.push({
        severity: 'HIGH',
        category: 'Network',
        title: `${path} is slow (${Math.round(avg)}ms avg)`,
        plain: `${path} takes over a second on average. Cache the response so users don't wait every time.`,
        reason: `${calls.length} calls averaged ${Math.round(avg)}ms. If this data doesn't change often, you're making users wait for no reason.`,
        fix: 'Cache with Room as local source of truth. Fetch from network in background, show cached data instantly.',
        codeHint: `// Repository pattern with cache\nfun getData() = flow {\n  emit(db.getCached())     // instant\n  val fresh = api.fetch()  // background\n  db.save(fresh)\n  emit(fresh)\n}`,
        metric: `avg ${Math.round(avg)}ms`,
      })
    }

    if (failed.length > 0 && failed.length / calls.length > 0.1) {
      const codes = [...new Set(failed.map(e => e.responseCode).filter(Boolean))]
      issues.push({
        severity: 'HIGH',
        category: 'Network',
        title: `${path} failing ${Math.round((failed.length / calls.length) * 100)}% of the time`,
        plain: `${failed.length} out of ${calls.length} calls to ${path} are failing. Users hitting this flow are seeing errors.`,
        reason: `Response codes: ${codes.join(', ')}. ${codes.includes(401) ? '401 means auth token is expired or missing. ' : ''}${codes.includes(429) ? '429 means you\'re being rate-limited — add retry with backoff. ' : ''}${codes.some(c => c >= 500) ? '5xx means the server is erroring — check server logs. ' : ''}`,
        fix: codes.includes(401)
          ? 'Refresh the auth token before making this call. Add a token refresh interceptor.'
          : codes.includes(429)
          ? 'Add exponential backoff retry: wait 1s, 2s, 4s between retries.'
          : 'Add error handling and show a user-friendly retry button.',
        codeHint: codes.includes(401)
          ? `// OkHttp token refresh interceptor\nclass AuthInterceptor : Interceptor {\n  override fun intercept(chain: Chain): Response {\n    val response = chain.proceed(chain.request())\n    if (response.code == 401) {\n      val newToken = refreshToken()\n      return chain.proceed(chain.request().newBuilder()\n        .header("Authorization", "Bearer $newToken").build())\n    }\n    return response\n  }\n}`
          : undefined,
        metric: `${failed.length}/${calls.length} failed`,
      })
    }

    // Parallel API blocked by retry — detect sequential calls to same endpoint
    if (slow.length >= 2) {
      const timestamps = slow.map(e => e.timestamp).sort((a, b) => a - b)
      const gaps = timestamps.slice(1).map((t, i) => t - timestamps[i])
      const hasRetryPattern = gaps.some(g => g > 900 && g < 5000)
      if (hasRetryPattern) {
        issues.push({
          severity: 'HIGH',
          category: 'Network',
          title: `${path} looks like it's retrying on failure`,
          plain: `${path} is being called multiple times in quick succession with delays between them — this is a retry loop. Each retry adds latency to the user's wait time.`,
          reason: `${slow.length} slow calls with gaps of ~${Math.round(gaps.reduce((a,b)=>a+b,0)/gaps.length)}ms between them. A retry interceptor is likely firing, but the underlying issue (timeout/auth) isn't being fixed before retrying.`,
          fix: 'Fix the root cause first (auth token, server error), then add exponential backoff with a max of 3 retries.',
          metric: `${slow.length} retries detected`,
        })
      }
    }
  })

  // ── 4. MEMORY PRESSURE ───────────────────────────────────────────────────
  const latestMem = memory[memory.length - 1]
  if (latestMem) {
    if (latestMem.isLowMemory) {
      issues.push({
        severity: 'CRITICAL',
        category: 'Memory',
        title: 'System low memory warning',
        plain: 'Android is about to kill your app to free memory. Users will lose their state.',
        reason: `Memory usage hit the system low-memory threshold. Your app is using ${latestMem.usedMemoryMb}MB of ${latestMem.maxMemoryMb}MB. Common causes: large bitmaps not recycled, memory leaks holding Activity references, or loading too much data into memory at once.`,
        fix: 'Use Glide/Coil for images (they handle recycling). Check for leaks with LeakCanary. Implement onTrimMemory() to release caches.',
        codeHint: `override fun onTrimMemory(level: Int) {\n  if (level >= ComponentCallbacks2.TRIM_MEMORY_MODERATE) {\n    imageCache.clear()\n    dataCache.clear()\n  }\n}`,
        metric: `${latestMem.usedMemoryMb}MB / ${latestMem.maxMemoryMb}MB (${latestMem.usagePercentage?.toFixed(0)}%)`,
      })
    } else if ((latestMem.usagePercentage ?? 0) > 80) {
      issues.push({
        severity: 'HIGH',
        category: 'Memory',
        title: `Memory at ${latestMem.usagePercentage?.toFixed(0)}% — approaching limit`,
        plain: `Your app is using ${latestMem.usedMemoryMb}MB. At this level, Android may start killing background processes and eventually your app.`,
        reason: 'High memory usage is often caused by: loading full-resolution images without downsampling, keeping large lists entirely in memory, or a memory leak holding references to old Activities.',
        fix: 'Use Coil/Glide with size constraints. Paginate large lists. Run LeakCanary to find leaks.',
        codeHint: `// Coil with size constraint\nAsyncImage(\n  model = ImageRequest.Builder(context)\n    .data(url)\n    .size(300, 300)  // don't load full res\n    .build()\n)`,
        metric: `${latestMem.usedMemoryMb}MB / ${latestMem.maxMemoryMb}MB`,
      })
    }
  }

  // ── 5. FPS / JANK ────────────────────────────────────────────────────────
  if (fps.length > 0) {
    const avgFps    = fps.reduce((s, e) => s + (e.fps ?? 0), 0) / fps.length
    const totalJank = fps.reduce((s, e) => s + (e.jankCount ?? 0), 0)
    const dropped   = fps.reduce((s, e) => s + (e.droppedFrames ?? 0), 0)

    if (avgFps < 45 || totalJank > 20) {
      issues.push({
        severity: avgFps < 30 ? 'CRITICAL' : 'HIGH',
        category: 'Rendering',
        title: `${Math.round(avgFps)} FPS average — ${totalJank} janks`,
        plain: `Your app is dropping frames. Users see stuttering animations and scrolling. ${totalJank} janks means ${totalJank} times the UI froze for at least one frame.`,
        reason: `Average FPS is ${Math.round(avgFps)} (target: 60). ${dropped} frames dropped. This is usually caused by: expensive Compose recompositions, RecyclerView overdraw, large bitmaps decoded on the main thread, or heavy work in onDraw().`,
        fix: 'Profile with Android Studio → CPU Profiler. Look for long frames in the main thread. Use remember{} in Compose to avoid recomputation.',
        codeHint: `// Compose — avoid recomposition\nval expensiveValue = remember(input) {\n  computeExpensiveThing(input)  // only recomputes when input changes\n}\n\n// Check overdraw in Developer Options → Debug GPU overdraw`,
        metric: `${Math.round(avgFps)} fps avg, ${totalJank} janks, ${dropped} dropped frames`,
      })
    }
  }

  // ── 6. CRASH ROOT CAUSE ───────────────────────────────────────────────────
  crashes.forEach(e => {
    const msg = e.message ?? ''
    let plain = '', reason = '', fix = '', codeHint: string | undefined

    if (msg.includes('NullPointerException')) {
      plain  = 'Your app crashed because it tried to use an object that was null.'
      reason = `NullPointerException at ${e.stackTrace?.split('\n')[0] ?? 'unknown location'}. Something was null when the code expected it to have a value. In Kotlin this usually means a Java interop issue or a !! force-unwrap on a null value.`
      fix    = 'Use Kotlin\'s safe-call operator (?.) instead of !! and add null checks before using Java objects.'
      codeHint = `// Bad\nval name = user!!.name  // crashes if user is null\n\n// Good\nval name = user?.name ?: "Unknown"`
    } else if (msg.includes('OutOfMemoryError')) {
      plain  = 'Your app ran out of memory and crashed.'
      reason = 'The heap was exhausted. Most common cause: loading a large bitmap without downsampling, or a memory leak accumulating over time.'
      fix    = 'Use Coil/Glide for images. Run LeakCanary. Avoid storing large data in static fields.'
    } else if (msg.includes('NetworkOnMainThreadException')) {
      plain  = 'Your app tried to make a network call on the UI thread and crashed.'
      reason = 'Android blocks network calls on the main thread since API 11. A network call was made directly in onCreate(), onResume(), or a click handler without a coroutine.'
      fix    = 'Wrap all network calls in lifecycleScope.launch { } or viewModelScope.launch { }.'
      codeHint = `// Bad\nval response = api.fetch()  // crashes on main thread\n\n// Good\nlifecycleScope.launch {\n  val response = api.fetch()  // runs on IO thread via Retrofit\n}`
    } else if (msg.includes('ANR')) {
      plain  = 'Your app stopped responding and Android killed it.'
      reason = 'The main thread was blocked for more than 5 seconds. This is usually a database query, file read, or network call running on the UI thread.'
      fix    = 'Find what\'s blocking the main thread using Android Studio Profiler → CPU → System Trace.'
    } else {
      plain  = 'Your app crashed.'
      reason = msg.slice(0, 200)
      fix    = 'Check the stack trace below for the exact file and line number.'
    }

    issues.push({
      severity: e.isFatal ? 'CRITICAL' : 'HIGH',
      category: 'Crash',
      title: (e.crashType ?? 'Exception').replace('_', ' '),
      plain, reason, fix, codeHint,
      metric: e.threadName ? `Thread: ${e.threadName}` : undefined,
    })
  })

  // Sort: CRITICAL first, then HIGH, MEDIUM, LOW
  const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
  return issues.sort((a, b) => order[a.severity] - order[b.severity])
}

// ── Severity styles ───────────────────────────────────────────────────────────

const SEV: Record<string, { dot: string; badge: string; border: string }> = {
  CRITICAL: { dot: 'bg-red-500',    badge: 'text-red-400 bg-[#2a0f0f] border-red-900',    border: 'border-l-red-500'    },
  HIGH:     { dot: 'bg-orange-400', badge: 'text-orange-400 bg-[#2a1a0a] border-orange-900', border: 'border-l-orange-400' },
  MEDIUM:   { dot: 'bg-yellow-400', badge: 'text-yellow-400 bg-[#2a2a0a] border-yellow-900', border: 'border-l-yellow-400' },
  LOW:      { dot: 'bg-blue-400',   badge: 'text-blue-400 bg-[#0f1a2a] border-blue-900',   border: 'border-l-blue-400'   },
}

// ── Demo issues when no real data ─────────────────────────────────────────────

const DEMO_ISSUES: Issue[] = [
  {
    severity: 'CRITICAL',
    category: 'Startup',
    title: 'LoginActivity takes 2,100ms to open',
    plain: 'Your login screen takes 2.1 seconds to appear. Users expect under 300ms — this is 7× too slow.',
    reason: 'A 2MB profile image is being decoded synchronously on the main thread in onCreate(). BitmapFactory.decodeFile() blocks the UI thread until the entire image is loaded and decoded.',
    fix: 'Use Coil or Glide — they decode images on a background thread automatically.',
    codeHint: `// Bad — blocks UI for ~800ms\nval bmp = BitmapFactory.decodeFile(profileImagePath)\nimageView.setImageBitmap(bmp)\n\n// Good — Coil handles threading\nAsyncImage(\n  model = profileImagePath,\n  contentDescription = null\n)`,
    metric: '2,100ms (target < 300ms)',
  },
  {
    severity: 'HIGH',
    category: 'Network',
    title: '/api/v1/user/config failing 34% of the time with retries',
    plain: 'Your user config API is failing and retrying. Each retry adds 1.2 seconds to the user\'s wait. 3 retries = 3.6 extra seconds before they see an error.',
    reason: 'The retry interceptor fires on every 408 timeout, but the root cause (auth token expiry) isn\'t fixed before retrying. So every retry also fails, and the user waits for all of them.',
    fix: 'Add a token refresh step before retrying. Fix the auth token first, then retry the original request.',
    codeHint: `class AuthRetryInterceptor : Interceptor {\n  override fun intercept(chain: Chain): Response {\n    val response = chain.proceed(chain.request())\n    if (response.code == 401 || response.code == 408) {\n      tokenManager.refresh()  // fix auth first\n      return chain.proceed(chain.request()  // then retry\n        .newBuilder()\n        .header("Authorization", "Bearer \${tokenManager.token}")\n        .build())\n    }\n    return response\n  }\n}`,
    metric: '34% failure rate, avg 1,240ms per attempt',
  },
  {
    severity: 'HIGH',
    category: 'Rendering',
    title: 'RecyclerView overdraw on DashboardActivity transition',
    plain: 'When navigating to the dashboard, the screen stutters. The RecyclerView is drawing the same pixels 3–4 times per frame.',
    reason: 'The RecyclerView items have a white background, the RecyclerView has a white background, and the Activity window also has a white background. Android draws all three, wasting GPU time on pixels that are immediately covered.',
    fix: 'Remove redundant backgrounds. Set the window background to null if your root view covers the whole screen.',
    codeHint: `// In your theme (styles.xml)\n<item name="android:windowBackground">@null</item>\n\n// Or in Activity\nwindow.setBackgroundDrawable(null)\n\n// Remove background from RecyclerView items\n// if the list background already covers them`,
    metric: '42 FPS during transition (target 60 FPS)',
  },
]

// ── Main component ────────────────────────────────────────────────────────────

export function WhySlowPanel({ events }: Props) {
  const [expanded, setExpanded] = useState<number | null>(0)
  const [showCode, setShowCode] = useState<number | null>(null)

  const isDemo  = events.length === 0
  const issues  = useMemo(() => isDemo ? DEMO_ISSUES : analyse(events), [events, isDemo])
  const score   = Math.max(0, 100 - issues.reduce((s, i) => s + (i.severity === 'CRITICAL' ? 30 : i.severity === 'HIGH' ? 15 : i.severity === 'MEDIUM' ? 8 : 3), 0))

  if (issues.length === 0) {
    return (
      <div className="bg-[#111] border border-[#1e1e1e] rounded-lg px-6 py-8 text-center">
        <div className="text-2xl mb-2">✅</div>
        <div className="text-sm font-mono text-green-400 tracking-widest">NO ISSUES DETECTED</div>
        <div className="text-[10px] font-mono text-gray-600 mt-2">Keep using the app to generate more data</div>
      </div>
    )
  }

  return (
    <div className="space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white tracking-tight">Why is your app slow?</h2>
          <p className="text-[10px] font-mono text-gray-500 mt-0.5">
            {issues.length} issue{issues.length !== 1 ? 's' : ''} found — sorted by impact
            {isDemo && <span className="ml-2 text-blue-500">[DEMO DATA]</span>}
          </p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-black ${score >= 80 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
            {score}
          </div>
          <div className="text-[9px] font-mono text-gray-600">PERF SCORE</div>
        </div>
      </div>

      {/* Issue cards */}
      {issues.map((issue, i) => {
        const s   = SEV[issue.severity]
        const open = expanded === i

        return (
          <div
            key={i}
            className={`bg-[#111] border border-[#1e1e1e] border-l-2 rounded-lg overflow-hidden transition-all ${s.border}`}
          >
            {/* Header row — always visible */}
            <button
              onClick={() => setExpanded(open ? null : i)}
              className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-[#161616] transition-colors"
            >
              <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${s.dot}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border tracking-widest ${s.badge}`}>
                    {issue.severity}
                  </span>
                  <span className="text-[9px] font-mono text-gray-600 tracking-widest">{issue.category.toUpperCase()}</span>
                  {issue.metric && (
                    <span className="text-[9px] font-mono text-gray-700">{issue.metric}</span>
                  )}
                </div>
                <div className="text-sm font-bold text-white">{issue.title}</div>
                <div className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{issue.plain}</div>
              </div>
              <svg
                width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#555" strokeWidth="1.5"
                className={`flex-shrink-0 mt-1 transition-transform ${open ? 'rotate-180' : ''}`}
              >
                <polyline points="2,4 6,8 10,4" />
              </svg>
            </button>

            {/* Expanded detail */}
            {open && (
              <div className="px-5 pb-5 space-y-4 border-t border-[#1a1a1a]">

                {/* Why */}
                <div className="pt-4">
                  <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1.5">WHY THIS IS HAPPENING</div>
                  <p className="text-[11px] font-mono text-gray-300 leading-relaxed">{issue.reason}</p>
                </div>

                {/* Fix */}
                <div>
                  <div className="text-[9px] font-mono text-green-700 tracking-widest mb-1.5">HOW TO FIX IT</div>
                  <p className="text-[11px] font-mono text-gray-300 leading-relaxed">{issue.fix}</p>
                </div>

                {/* Code hint */}
                {issue.codeHint && (
                  <div>
                    <button
                      onClick={() => setShowCode(showCode === i ? null : i)}
                      className="text-[9px] font-mono text-blue-500 tracking-widest hover:text-blue-400 transition-colors mb-2"
                    >
                      {showCode === i ? '▼ HIDE CODE' : '▶ SHOW CODE EXAMPLE'}
                    </button>
                    {showCode === i && (
                      <pre className="bg-[#0a0a0a] border border-[#1e1e1e] rounded p-4 text-[10px] font-mono text-gray-300 overflow-x-auto leading-relaxed whitespace-pre">
                        {issue.codeHint}
                      </pre>
                    )}
                  </div>
                )}

              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
