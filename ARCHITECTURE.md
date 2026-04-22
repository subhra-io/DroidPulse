# 🏗️ DroidPulse SDK — Architecture & Optimization Guide

> Written simply — like explaining to a 12th standard student who wants to go deeper.

---

## 🧠 The Big Picture

Think of DroidPulse like a **CCTV system for your Android app**.

```
YOUR APP (Android Device)
│
├── 📹 Cameras (Trackers)
│   ├── AutoLifecycleTracker  → watches every screen open/close
│   ├── AutoMemoryTracker     → checks RAM every 2 seconds
│   ├── AutoFpsTracker        → counts frames every second
│   └── OptimizerInterceptor  → intercepts every API call
│
├── 📡 Control Room (Dispatcher)
│   └── All cameras send footage here (Kotlin SharedFlow)
│
└── 📺 TV Screen (WebSocketServer)
    └── Streams footage to your browser dashboard in real-time
```

---

## 🔄 Complete Data Flow

```
USER DOES SOMETHING IN APP
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│                    TRACKER LAYER                        │
│                                                         │
│  Opens Screen?  → AutoLifecycleTracker.onActivityResumed│
│  RAM check?     → AutoMemoryTracker.capture() [2s loop] │
│  Frame drawn?   → AutoFpsTracker.doFrame() [every frame]│
│  API called?    → OptimizerInterceptor.intercept()      │
└─────────────────────────┬───────────────────────────────┘
                          │ dispatch(event)
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   DISPATCHER (Core)                     │
│                                                         │
│   MutableSharedFlow<Event>                              │
│   Buffer: 100 events                                    │
│   Overflow: DROP_OLDEST (never blocks your app)         │
│   Thread: Any (thread-safe)                             │
└─────────────────────────┬───────────────────────────────┘
                          │ events.collect { }
                          ▼
┌─────────────────────────────────────────────────────────┐
│              WEBSOCKET SERVER (Transport)               │
│                                                         │
│   Port: 8080                                            │
│   Library: Java-WebSocket                               │
│   Serializer: EventSerializer (JSON via org.json)       │
│   Broadcast: to all connected dashboard clients         │
└─────────────────────────┬───────────────────────────────┘
                          │ JSON over WebSocket
                          ▼
┌─────────────────────────────────────────────────────────┐
│              ADB PORT FORWARDING                        │
│                                                         │
│   adb forward tcp:8080 tcp:8080                         │
│   Device port 8080 → Mac localhost:8080                 │
└─────────────────────────┬───────────────────────────────┘
                          │ ws://localhost:8080
                          ▼
┌─────────────────────────────────────────────────────────┐
│              DASHBOARD (Next.js Browser)                │
│                                                         │
│   useWebSocket hook → receives JSON events              │
│   React state → re-renders components                   │
│   FlowTrace, ApiCalls, MemoryGraph, FpsGraph            │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Module Breakdown

### `sdk/core` — The Brain
```
DroidPulse.kt          → Entry point. DroidPulse.start(app)
Dispatcher.kt          → Central event bus (SharedFlow)
AutoLifecycleTracker   → Watches all Activity open/close
AutoMemoryTracker      → RAM polling every 2s
AutoFpsTracker         → Choreographer frame callback
AutoWebSocketServer    → Starts transport via reflection
DroidPulseConfig       → All settings with defaults
ScreenEvent.kt         → Data class for screen events
Logger.kt              → Debug logging
```

### `sdk/network` — API Spy
```
OptimizerInterceptor   → OkHttp interceptor
ApiEvent.kt            → Data class: url, method, code, duration
```

### `sdk/transport` — The Broadcaster
```
WebSocketServer.kt     → Java-WebSocket server on port 8080
EventSerializer.kt     → Converts Event → JSON string
```

### `sdk/memory` — RAM Watcher
```
MemoryTracker.kt       → Detailed memory tracking (legacy)
HeapAnalyzer.kt        → Heap analysis
RamClassifier.kt       → Classifies memory pressure
```

### `sdk/fps` — Frame Counter
```
FpsTracker.kt          → FPS tracking (legacy)
JankDetector.kt        → Detects dropped frames
ChoreographerHook.kt   → Android Choreographer hook
```

### `sdk/lifecycle` — Screen Watcher
```
ActivityTracker.kt     → Activity lifecycle (legacy)
FragmentTracker.kt     → Fragment tracking
ScreenEvent.kt         → Screen event data class
```

---

## ⚡ How Each Tracker Works

### 1. AutoLifecycleTracker
```
Android System
    │
    │ calls onActivityResumed(activity)
    ▼
AutoLifecycleTracker
    │
    ├── records createTime[activityName] = now
    ├── calculates launchDuration = now - createTime
    ├── updates navigationStack
    │
    └── dispatches ScreenEvent(
            screenName = "LoginActivity",
            eventType  = RESUMED,
            duration   = 245ms,  ← time to open
            navStack   = ["SplashActivity", "LoginActivity"]
        )
```

### 2. AutoMemoryTracker
```
Coroutine (every 2 seconds on Dispatchers.Default)
    │
    ├── Runtime.getRuntime().totalMemory() - freeMemory()
    ├── ActivityManager.getMemoryInfo()
    │
    └── dispatches MemoryEvent(
            usedMemoryMb   = 45,
            maxMemoryMb    = 128,
            usagePercent   = 35.1%,
            isLowMemory    = false
        )
```

### 3. AutoFpsTracker
```
Choreographer.FrameCallback (called every frame by Android)
    │
    ├── calculates frameTimeMs = (now - lastFrame) / 1,000,000
    ├── if frameTimeMs > 16.67ms → jank detected!
    │
    └── every 1 second, dispatches FpsEvent(
            fps          = 58.3,
            jankCount    = 2,
            droppedFrames = 3,
            totalFrames  = 58
        )
```

### 4. OptimizerInterceptor
```
Your app calls API
    │
    ▼
OkHttp → OptimizerInterceptor.intercept()
    │
    ├── records startTime = now
    ├── chain.proceed(request)  ← actual network call
    ├── records duration = now - startTime
    │
    └── dispatches ApiEvent(
            url          = "https://api.example.com/login",
            method       = "POST",
            responseCode = 200,
            duration     = 342ms,
            requestSize  = 1200 bytes,
            responseSize = 3400 bytes
        )
```

### 5. Dispatcher
```
Any Tracker
    │
    │ dispatcher.dispatch(event)
    ▼
MutableSharedFlow<Event>
    │
    │ (non-blocking, tryEmit)
    │ (buffer = 100 events)
    │ (overflow = DROP_OLDEST)
    ▼
WebSocketServer.collect { event → broadcast(json) }
```

### 6. WebSocketServer
```
Dispatcher.events.collect { event }
    │
    ├── EventSerializer.serialize(event) → JSON string
    │   {
    │     "type": "lifecycle",
    │     "screenName": "LoginActivity",
    │     "duration": 245,
    │     "timestamp": 1714000000000
    │   }
    │
    └── clients.forEach { client.send(json) }
            │
            │ WebSocket frame over TCP
            ▼
        Browser Dashboard
```

---

## 🔌 Device → Dashboard Connection

```
ANDROID DEVICE (Physical Phone)
│
│  WebSocketServer listening on 0.0.0.0:8080
│  (all network interfaces)
│
└── USB Cable ──────────────────────────────────────────┐
                                                        │
YOUR MAC                                                │
│                                                       │
│  adb forward tcp:8080 tcp:8080                        │
│  (routes Mac's localhost:8080 → device's port 8080)   │
│                                                       │
│  Browser opens ws://localhost:8080                    │
│  → goes through ADB tunnel                            │
│  → reaches WebSocketServer on device                  │
│  → connection established ✅                          │
│                                                       │
│  Next.js Dashboard at http://localhost:3001           │
└───────────────────────────────────────────────────────┘
```

---

## 📊 Current Performance Cost

| Component | CPU | Memory | Battery |
|-----------|-----|--------|---------|
| AutoLifecycleTracker | ~0% | ~1KB | None |
| AutoMemoryTracker | ~0.1% | ~2KB | Tiny |
| AutoFpsTracker | ~0.2% | ~2KB | Small |
| OptimizerInterceptor | ~0% | ~1KB | None |
| WebSocketServer | ~0.3% | ~5MB | Small |
| **Total** | **~0.6%** | **~10MB** | **Tiny** |

> All runs on `Dispatchers.Default` — background thread pool, never blocks UI.

---

## 🚨 Current Weaknesses (Honest Assessment)

### 1. ❌ No Compose Navigation Tracking
**Problem**: `AutoLifecycleTracker` only tracks Activities.
If your app uses Jetpack Compose with `NavHost`, screen changes
inside a single Activity are NOT tracked.

**Fix needed**:
```kotlin
// Need to add NavController listener
navController.addOnDestinationChangedListener { _, destination, _ ->
    DroidPulse.dispatcher.dispatch(
        ScreenEvent(
            screenName = destination.route ?: "unknown",
            screenType = ScreenType.COMPOSE_ROUTE,
            eventType  = LifecycleEventType.RESUMED
        )
    )
}
```

---

### 2. ❌ EventSerializer Uses Reflection
**Problem**: `EventSerializer` uses Java reflection to read fields.
Reflection is slow and can break with ProGuard/R8 obfuscation.

**Current code**:
```kotlin
event.javaClass.declaredFields.forEach { field ->
    field.isAccessible = true  // ← slow, unsafe
    val value = field.get(event)
}
```

**Fix needed**: Use explicit serialization per event type:
```kotlin
fun serialize(event: Event): String = when (event) {
    is ScreenEvent -> JSONObject().apply {
        put("type", event.type)
        put("screenName", event.screenName)
        put("duration", event.duration)
        put("timestamp", event.timestamp)
    }.toString()
    is ApiEvent -> JSONObject().apply { ... }.toString()
    // etc.
}
```

---

### 3. ❌ WebSocketServer Starts via Reflection
**Problem**: `AutoWebSocketServer` uses reflection to load the
transport module. This is fragile and slow.

**Current code**:
```kotlin
val clazz = Class.forName("com.yourcompany.optimizer.transport.WebSocketServer")
val constructor = clazz.getConstructor(Int::class.java)
val server = constructor.newInstance(port)
```

**Fix needed**: Use a proper interface in core:
```kotlin
// In core module
interface DashboardServer {
    fun start()
    fun stop()
}

// In transport module
class WebSocketServer : DashboardServer { ... }

// In DroidPulse.init()
// Pass server implementation via constructor
```

---

### 4. ❌ Memory Polling is Inefficient
**Problem**: `AutoMemoryTracker` polls every 2 seconds even when
nothing has changed. Wastes battery.

**Fix needed**: Only dispatch if memory changed significantly:
```kotlin
private var lastUsedMb = 0L

private fun capture() {
    val usedMb = (runtime.totalMemory() - runtime.freeMemory()) / (1024 * 1024)
    
    // Only dispatch if changed by more than 1MB
    if (Math.abs(usedMb - lastUsedMb) < 1) return
    
    lastUsedMb = usedMb
    DroidPulse.dispatcher.dispatch(MemoryEvent(...))
}
```

---

### 5. ❌ No Event Batching
**Problem**: Every event is sent immediately over WebSocket.
If 10 events happen in 100ms, 10 separate WebSocket frames are sent.

**Fix needed**: Batch events every 100ms:
```kotlin
// In WebSocketServer
val batchedEvents = mutableListOf<Event>()

DroidPulse.scope.launch {
    DroidPulse.dispatcher.events.collect { event ->
        batchedEvents.add(event)
    }
}

// Send batch every 100ms
DroidPulse.scope.launch {
    while (isActive) {
        delay(100)
        if (batchedEvents.isNotEmpty()) {
            val batch = batchedEvents.toList()
            batchedEvents.clear()
            broadcast(EventSerializer.serializeBatch(batch))
        }
    }
}
```

---

### 6. ❌ FpsTracker Not Thread-Safe
**Problem**: `frameCount`, `jankCount` etc. are modified from
Choreographer callback (main thread) AND read from coroutine
(background thread). Race condition possible.

**Fix needed**: Use `AtomicInteger`:
```kotlin
private val frameCount    = AtomicInteger(0)
private val jankCount     = AtomicInteger(0)
private val droppedFrames = AtomicInteger(0)
```

---

### 7. ❌ No Offline Storage
**Problem**: If dashboard is not connected, all events are lost.
The SharedFlow buffer only holds 100 events.

**Fix needed**: Add Room database to store events locally:
```kotlin
// In sdk/storage module (already planned!)
@Entity
data class StoredEvent(
    @PrimaryKey val id: Long = 0,
    val type: String,
    val json: String,
    val timestamp: Long,
    val synced: Boolean = false
)
```

---

### 8. ❌ WebSocket Has No Authentication
**Problem**: Anyone on the same network can connect to port 8080
and see your app's data.

**Fix needed**: Add a simple token:
```kotlin
DroidPulseConfig(
    dashboardToken = "my-secret-token"
)

// In WebSocketServer.onOpen()
if (handshake.getFieldValue("Authorization") != config.dashboardToken) {
    conn.close()
    return
}
```

---

## 🗺️ Optimization Roadmap

### Sprint 4 — Quick Wins (1-2 days each)
- [ ] Fix EventSerializer — remove reflection
- [ ] Fix FpsTracker — use AtomicInteger
- [ ] Fix memory polling — only dispatch on change
- [ ] Add event batching in WebSocketServer

### Sprint 5 — Big Features (3-5 days each)
- [ ] Add Compose Navigation tracking
- [ ] Add offline storage (Room database)
- [ ] Replace reflection in AutoWebSocketServer
- [ ] Add WebSocket authentication token

### Sprint 6 — Production Ready
- [ ] Add Fragment tracking
- [ ] Add CPU tracking
- [ ] Add battery tracking
- [ ] Add crash reporting
- [ ] Add cloud sync option

---

## 🧵 Threading Model

```
Main Thread (UI)
    │
    ├── AutoLifecycleTracker callbacks (Android calls these)
    ├── AutoFpsTracker.doFrame() (Choreographer)
    └── dispatcher.tryEmit() ← non-blocking, instant

Dispatchers.Default (Background Thread Pool)
    │
    ├── AutoMemoryTracker coroutine (every 2s)
    ├── AutoFpsTracker report coroutine (every 1s)
    ├── WebSocketServer event collector
    └── WebSocketServer broadcast

WebSocket Thread (Java-WebSocket library)
    │
    └── client.send(json) ← actual network write
```

> **Key insight**: `dispatcher.tryEmit()` is called from the main thread
> but never blocks it. The SharedFlow buffer absorbs the event instantly
> and the background coroutine processes it asynchronously.

---

## 📐 Event JSON Format

Every event sent to dashboard looks like this:

### Screen Event
```json
{
  "type": "lifecycle",
  "screenName": "LoginActivity",
  "screenType": "ACTIVITY",
  "eventType": "RESUMED",
  "duration": 245,
  "navigationStack": ["SplashActivity", "LoginActivity"],
  "timestamp": 1714000000000
}
```

### API Event
```json
{
  "type": "network",
  "url": "https://api.example.com/auth/login",
  "method": "POST",
  "responseCode": 200,
  "duration": 342,
  "requestSize": 1200,
  "responseSize": 3400,
  "success": true,
  "timestamp": 1714000000000
}
```

### Memory Event
```json
{
  "type": "memory",
  "usedMemoryMb": 45,
  "maxMemoryMb": 128,
  "usagePercentage": 35.1,
  "isLowMemory": false,
  "timestamp": 1714000000000
}
```

### FPS Event
```json
{
  "type": "fps",
  "fps": 58.3,
  "jankCount": 2,
  "droppedFrames": 3,
  "totalFrames": 58,
  "timestamp": 1714000000000
}
```

---

## 🔑 Key Design Decisions

| Decision | Why |
|----------|-----|
| `SharedFlow` for events | Non-blocking, multiple collectors, backpressure handling |
| `Dispatchers.Default` | Background thread pool, never blocks UI |
| `SupervisorJob` | One tracker failing doesn't kill others |
| `tryEmit` not `emit` | Never suspends the calling thread |
| `DROP_OLDEST` overflow | Prefer fresh data over old data |
| Reflection for transport | Keeps core module lightweight |
| ADB port forwarding | No WiFi needed, works on any device |
| Debug-only init | Zero production impact |

---

## 📁 File Map

```
sdk/
├── core/           ← Start here. DroidPulse.start() lives here
│   ├── Optimizer.kt           ← DroidPulse object
│   ├── Dispatcher.kt          ← SharedFlow event bus
│   ├── AutoLifecycleTracker   ← Activity watcher
│   ├── AutoMemoryTracker      ← RAM watcher
│   ├── AutoFpsTracker         ← Frame counter
│   ├── AutoWebSocketServer    ← Starts transport
│   ├── DroidPulseConfig       ← All settings
│   └── ScreenEvent.kt         ← Event data classes
│
├── network/        ← Add OptimizerInterceptor to OkHttp
│   ├── OptimizerInterceptor   ← OkHttp interceptor
│   └── ApiEvent.kt            ← API event data class
│
├── transport/      ← WebSocket server
│   ├── WebSocketServer        ← Java-WebSocket server
│   └── EventSerializer        ← Event → JSON
│
├── memory/         ← Legacy, kept for compatibility
├── fps/            ← Legacy, kept for compatibility
└── lifecycle/      ← Legacy, kept for compatibility

dashboard-web/
├── src/hooks/useWebSocket.ts  ← WebSocket connection + reconnect
├── src/app/page.tsx           ← Main dashboard layout
└── src/components/
    ├── FlowTrace.tsx          ← Journey map ← NEW
    ├── ApiCalls.tsx           ← API call list ← ENHANCED
    ├── ScreenTimings.tsx      ← Screen timing table
    ├── MemoryGraph.tsx        ← Memory chart
    ├── FpsGraph.tsx           ← FPS chart
    ├── PerformanceSummary.tsx ← Health score
    └── ConnectionStatus.tsx   ← Connected/Disconnected
```

---

## 🎯 Summary

**What works well:**
- ✅ Zero-config setup (`DroidPulse.start(this)`)
- ✅ Non-blocking event dispatch
- ✅ Auto-tracks all Activities
- ✅ Real-time dashboard via WebSocket
- ✅ ADB tunnel works without WiFi

**What needs fixing (priority order):**
1. 🔴 EventSerializer reflection → explicit serialization
2. 🔴 FpsTracker thread safety → AtomicInteger
3. 🟡 Memory polling efficiency → delta-based dispatch
4. 🟡 Event batching → reduce WebSocket frames
5. 🟡 Compose navigation tracking → NavController listener
6. 🟢 Offline storage → Room database
7. 🟢 WebSocket auth → token-based security

---

*Last updated: v1.0.4 — April 2026*
