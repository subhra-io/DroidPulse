# DroidPulse

A comprehensive Android performance monitoring SDK with real-time dashboard for tracking app performance, API calls, memory usage, and user flows.

## Features

- **Real-time Performance Monitoring**: Track screen transitions, API calls, memory usage, and FPS
- **Live Dashboard**: Web-based dashboard with real-time WebSocket connection
- **Network Monitoring**: Automatic OkHttp interceptor for API call tracking
- **Memory Profiling**: Monitor memory usage and detect potential leaks
- **Crash Detection**: Detect and analyze ANRs and crashes
- **Device Simulation**: Test app behavior under different network conditions
- **Export Reports**: Generate detailed performance reports

## Quick Start

### 1. Add Dependency

Add to your app's `build.gradle.kts`:

```kotlin
dependencies {
    implementation("com.github.subhra-io:DroidPulse:1.0.0")
}
```

### 2. Initialize SDK

In your `Application` class:

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
                showOverlay = true
            )
        )
        
        // Start trackers
        ActivityTracker()
        FragmentTracker()
        
        // Start local server for dashboard
        LocalServer.start(8080)
    }
}
```

### 3. Add Network Interceptor

For OkHttp network tracking:

```kotlin
val client = OkHttpClient.Builder()
    .addInterceptor(OptimizerInterceptor())
    .build()
```

### 4. Run Dashboard

```bash
cd dashboard-web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Dashboard Features

- **Overview**: Real-time performance metrics and alerts
- **Network**: API call monitoring with timing and error analysis
- **Diagnostics**: Crash detection and root cause analysis
- **Device Twin**: Simulate different device conditions
- **Heatmap**: Visual performance analysis across screens
- **Session History**: Historical performance data

## Configuration

```kotlin
OptimizerConfig(
    debug = true,              // Enable debug logs
    trackNetwork = true,       // Track API calls
    trackMemory = true,        // Track memory usage
    trackFps = true,           // Track FPS
    showOverlay = true,        // Show floating widget
    enableLocalServer = true,  // Enable WebSocket server
    localServerPort = 8080,    // Server port
    sampleRate = 1.0f,         // Event sampling (0.0-1.0)
    maxStoredEvents = 1000     // Max events in storage
)
```

## Architecture

The SDK consists of several modules:

- **Core**: Main SDK entry point and configuration
- **Lifecycle**: Activity and Fragment tracking
- **Network**: OkHttp interceptor and API monitoring
- **Transport**: WebSocket server and data transmission
- **Dashboard**: React-based web interface

## Requirements

- Android API 21+
- OkHttp 4.0+ (for network monitoring)
- Node.js 18+ (for dashboard)

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions, please use the GitHub Issues page.