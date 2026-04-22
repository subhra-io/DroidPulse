# Quick Start Guide

## Installation

### Step 1: Add SDK to your project

In your app's `build.gradle.kts`:

```kotlin
dependencies {
    implementation("com.yourcompany:optimizer-sdk:1.0.0")
}
```

### Step 2: Initialize in Application class

```kotlin
class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        
        Optimizer.init(
            app = this,
            config = OptimizerConfig(
                debug = true,
                trackNetwork = true,
                trackMemory = true,
                trackFps = true,
                showOverlay = true
            )
        )
        
        // Start trackers
        ActivityTracker()
        FragmentTracker()
        
        // Start local server
        LocalServer.start(8080)
    }
}
```

### Step 3: Add OkHttp Interceptor

```kotlin
val client = OkHttpClient.Builder()
    .addInterceptor(OptimizerInterceptor())
    .build()
```

### Step 4: Run Dashboard

```bash
cd dashboard-web
npm install
npm run dev
```

Open http://localhost:3000

## What Gets Tracked

- ✅ Activity lifecycle & timing
- ✅ Fragment transitions
- ✅ API calls (via OkHttp)
- ✅ Network latency & errors
- ⏳ Memory usage (coming soon)
- ⏳ FPS & frame drops (coming soon)

## Configuration Options

```kotlin
OptimizerConfig(
    debug = true,              // Enable debug logs
    trackNetwork = true,       // Track API calls
    trackMemory = true,        // Track memory usage
    trackFps = true,           // Track FPS
    showOverlay = true,        // Show floating widget
    enableLocalServer = true,  // Enable WebSocket server
    localServerPort = 8080,    // Server port
    cloudEndpoint = null,      // Optional cloud upload
    sampleRate = 1.0f,         // Event sampling (0.0-1.0)
    maxStoredEvents = 1000     // Max events in storage
)
```

## Compose Navigation

For Jetpack Compose apps, track navigation manually:

```kotlin
NavHost(navController, startDestination = "home") {
    composable("home") {
        ComposeNavTracker.trackRoute("home")
        HomeScreen()
    }
}
```

## Troubleshooting

### Dashboard not connecting?

1. Check Android app is running
2. Verify WebSocket server started: `LocalServer.start(8080)`
3. Check logs for "WebSocket server started on port 8080"
4. Ensure device/emulator can reach localhost

### No events showing?

1. Enable debug mode: `OptimizerConfig(debug = true)`
2. Check logcat for "Optimizer" tag
3. Verify trackers are initialized
4. For network events, ensure OkHttpClient has interceptor

## Next Steps

- [Architecture Overview](./ARCHITECTURE.md)
- [API Reference](./API_REFERENCE.md)
- [Advanced Configuration](./ADVANCED.md)
