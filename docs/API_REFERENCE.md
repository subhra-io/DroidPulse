# API Reference

## Optimizer

Main SDK entry point.

### init()

Initialize the SDK. Must be called in `Application.onCreate()`.

```kotlin
fun init(app: Application, config: OptimizerConfig = OptimizerConfig())
```

**Parameters:**
- `app`: Application instance
- `config`: Configuration options

**Example:**
```kotlin
Optimizer.init(
    app = this,
    config = OptimizerConfig(debug = true)
)
```

### isInitialized()

Check if SDK is initialized.

```kotlin
fun isInitialized(): Boolean
```

### getConfig()

Get current configuration.

```kotlin
fun getConfig(): OptimizerConfig
```

### shutdown()

Shutdown SDK and release resources.

```kotlin
fun shutdown()
```

## OptimizerConfig

Configuration data class.

```kotlin
data class OptimizerConfig(
    val debug: Boolean = false,
    val trackNetwork: Boolean = true,
    val trackMemory: Boolean = true,
    val trackFps: Boolean = true,
    val trackDevice: Boolean = true,
    val showOverlay: Boolean = false,
    val enableLocalServer: Boolean = true,
    val localServerPort: Int = 8080,
    val cloudEndpoint: String? = null,
    val sampleRate: Float = 1.0f,
    val maxStoredEvents: Int = 1000
)
```

## ActivityTracker

Tracks Activity lifecycle events.

```kotlin
class ActivityTracker()
```

**Usage:**
```kotlin
ActivityTracker() // Auto-registers with LifecycleRegistry
```

## FragmentTracker

Tracks Fragment lifecycle events.

```kotlin
class FragmentTracker()
```

## ComposeNavTracker

Tracks Compose navigation.

### trackRoute()

```kotlin
fun trackRoute(route: String)
```

**Example:**
```kotlin
ComposeNavTracker.trackRoute("home")
```

## OptimizerInterceptor

OkHttp interceptor for network tracking.

```kotlin
class OptimizerInterceptor : Interceptor
```

**Usage:**
```kotlin
val client = OkHttpClient.Builder()
    .addInterceptor(OptimizerInterceptor())
    .build()
```

## LocalServer

Manages local WebSocket server.

### start()

```kotlin
fun start(port: Int = 8080)
```

### stop()

```kotlin
fun stop()
```

### isRunning()

```kotlin
fun isRunning(): Boolean
```

## Events

### ScreenEvent

```kotlin
data class ScreenEvent(
    val timestamp: Long,
    val type: String,
    val screenName: String,
    val screenType: ScreenType,
    val eventType: LifecycleEventType,
    val duration: Long?,
    val metadata: Map<String, Any>
)
```

### ApiEvent

```kotlin
data class ApiEvent(
    val timestamp: Long,
    val type: String,
    val url: String,
    val method: String,
    val requestSize: Long,
    val responseCode: Int?,
    val responseSize: Long,
    val duration: Long,
    val success: Boolean,
    val errorMessage: String?,
    val headers: Map<String, String>
)
```

## Enums

### ScreenType

```kotlin
enum class ScreenType {
    ACTIVITY,
    FRAGMENT,
    COMPOSE_ROUTE
}
```

### LifecycleEventType

```kotlin
enum class LifecycleEventType {
    CREATED,
    STARTED,
    RESUMED,
    PAUSED,
    STOPPED,
    DESTROYED
}
```
