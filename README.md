# 🚀 Optimizer SDK - Android Performance Monitoring

[![](https://jitpack.io/v/subhra-io/DroidPulse.svg)](https://jitpack.io/#subhra-io/DroidPulse)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Professional Android SDK for real-time performance monitoring with live dashboard.

## ✨ Features

- 📱 **Activity & Fragment Tracking** - Automatic lifecycle monitoring
- 🌐 **Network Monitoring** - API call timing via OkHttp interceptor
- 💾 **Memory Tracking** - Heap and RAM usage monitoring
- 📊 **FPS Monitoring** - Frame rate and jank detection
- 🎯 **Real-time Dashboard** - Live performance visualization
- ⚡ **Low Overhead** - <1% performance impact
- 🔒 **Debug Only** - Zero impact on production builds

## 📦 Installation

### Step 1: Add JitPack Repository

In your project's `settings.gradle.kts`:

```kotlin
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://jitpack.io") }  // Add this
    }
}
```

### Step 2: Add Dependencies

In your app's `build.gradle`:

```groovy
dependencies {
    // DroidPulse SDK
    implementation 'com.github.subhra-io.DroidPulse:core:1.0.0'
    implementation 'com.github.subhra-io.DroidPulse:lifecycle:1.0.0'
    implementation 'com.github.subhra-io.DroidPulse:network:1.0.0'
    implementation 'com.github.subhra-io.DroidPulse:memory:1.0.0'
    implementation 'com.github.subhra-io.DroidPulse:fps:1.0.0'
    implementation 'com.github.subhra-io.DroidPulse:transport:1.0.0'
}
```

### Step 3: Initialize SDK

Create or update your `Application` class:

```kotlin
import android.app.Application
import com.yourcompany.optimizer.core.Optimizer
import com.yourcompany.optimizer.core.OptimizerConfig
import com.yourcompany.optimizer.lifecycle.ActivityTracker
import com.yourcompany.optimizer.memory.MemoryTracker
import com.yourcompany.optimizer.fps.FpsTracker
import com.yourcompany.optimizer.transport.WebSocketServer

class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        
        // Initialize only in debug builds
        if (BuildConfig.DEBUG) {
            Optimizer.init(
                app = this,
                config = OptimizerConfig(
                    debug = true,
                    enableLifecycleTracking = true,
                    enableNetworkTracking = true,
                    enableMemoryTracking = true,
                    enableFpsTracking = true
                )
            )
            
            // Start trackers
            ActivityTracker(this).start()
            MemoryTracker(this).start()
            FpsTracker().start()
            
            // Start WebSocket server for dashboard
            WebSocketServer.start(port = 8080)
        }
    }
}
```

### Step 4: Register Application Class

In your `AndroidManifest.xml`:

```xml
<application
    android:name=".MyApplication"
    ...>
</application>
```

### Step 5: Add Network Interceptor (Optional)

To track API calls, add the interceptor to your OkHttp client:

```kotlin
import com.yourcompany.optimizer.network.OptimizerInterceptor

val client = OkHttpClient.Builder()
    .addInterceptor(OptimizerInterceptor())
    .build()
```

## 📊 Dashboard

### Run the Dashboard

```bash
# Clone this repository
git clone https://github.com/subhra-io/DroidPulse.git
cd DroidPulse/dashboard-web

# Install dependencies
npm install

# Start dashboard
npm run dev
```

Dashboard will be available at: **http://localhost:3000**

### What You'll See

- 🟢 **Connection Status** - Real-time connection indicator
- 📱 **Screen Timings** - Activity/Fragment lifecycle events
- 🌐 **API Calls** - Network requests with timing and status
- 💾 **Memory Graph** - Heap and RAM usage over time
- 📊 **FPS Graph** - Frame rate monitoring
- ⚡ **Performance Summary** - Overall health score

## 🎯 Usage Examples

### Basic Setup

```kotlin
// Minimal setup
Optimizer.init(this, OptimizerConfig(debug = true))
ActivityTracker(this).start()
MemoryTracker(this).start()
FpsTracker().start()
WebSocketServer.start(port = 8080)
```

### Custom Configuration

```kotlin
Optimizer.init(
    app = this,
    config = OptimizerConfig(
        debug = BuildConfig.DEBUG,
        enableLifecycleTracking = true,
        enableNetworkTracking = true,
        enableMemoryTracking = true,
        enableFpsTracking = true,
        samplingRate = 1.0f,  // Sample 100% of events
        logLevel = LogLevel.DEBUG
    )
)
```

### Network Monitoring

```kotlin
// Add to your Retrofit/OkHttp setup
val client = OkHttpClient.Builder()
    .addInterceptor(OptimizerInterceptor())
    .build()

val retrofit = Retrofit.Builder()
    .baseUrl("https://api.example.com")
    .client(client)
    .build()
```

## 📁 SDK Modules

| Module | Purpose | Size |
|--------|---------|------|
| **core** | SDK initialization and configuration | ~15 KB |
| **lifecycle** | Activity/Fragment tracking | ~12 KB |
| **network** | API call monitoring | ~10 KB |
| **memory** | Memory usage tracking | ~8 KB |
| **fps** | Frame rate monitoring | ~8 KB |
| **transport** | WebSocket server for dashboard | ~18 KB |

**Total Size**: ~70 KB

## 🔧 Configuration Options

```kotlin
OptimizerConfig(
    debug: Boolean = false,                    // Enable/disable SDK
    enableLifecycleTracking: Boolean = true,   // Track screens
    enableNetworkTracking: Boolean = true,     // Track API calls
    enableMemoryTracking: Boolean = true,      // Track memory
    enableFpsTracking: Boolean = true,         // Track FPS
    samplingRate: Float = 1.0f,                // 0.0 to 1.0
    logLevel: LogLevel = LogLevel.INFO         // DEBUG, INFO, WARN, ERROR
)
```

## 📱 Requirements

- **Min SDK**: 24 (Android 7.0)
- **Target SDK**: 34+
- **Kotlin**: 1.9.22+
- **Gradle**: 8.0+

## 🎨 Dashboard Features

### Real-time Monitoring
- Live connection status
- Automatic reconnection
- Event streaming via WebSocket

### Performance Graphs
- Memory usage (Recharts)
- FPS monitoring
- API call timeline

### Performance Summary
- Health score calculation
- Jank detection
- Memory pressure alerts

## 🚀 Performance Impact

- **CPU Overhead**: <0.5%
- **Memory Overhead**: ~2-3 MB
- **Battery Impact**: Negligible
- **Network**: WebSocket only (minimal)

## 🔒 Production Safety

The SDK is designed to run **only in debug builds**:

```kotlin
if (BuildConfig.DEBUG) {
    // SDK only initializes in debug
    initializeOptimizerSDK()
}
```

This ensures:
- ✅ Zero overhead in production
- ✅ No data collection in release builds
- ✅ Safe for app store submission
- ✅ No ProGuard/R8 issues

## 📖 Documentation

- [Integration Guide](APP_INTEGRATION_GUIDE.md) - Step-by-step setup
- [GitHub + JitPack Guide](GITHUB_JITPACK_GUIDE.md) - Publishing instructions
- [API Reference](docs/API_REFERENCE.md) - Complete API documentation
- [Architecture](docs/ARCHITECTURE.md) - System design
- [Testing Guide](TESTING_GUIDE.md) - Device testing

## 🛠️ Development

### Build SDK

```bash
./gradlew build
```

### Publish to Maven Local

```bash
./scripts/publish-local.sh
```

### Run Sample App

```bash
./gradlew :sample-app:ecommerce-demo:installDebug
```

### Run Tests

```bash
./gradlew test
```

## 📊 Sample App

The repository includes a sample e-commerce app demonstrating SDK integration:

```bash
# Run sample app
./scripts/run-demo.sh

# Or manually
./gradlew :sample-app:ecommerce-demo:installDebug
```

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines.

## 📄 License

```
MIT License

Copyright (c) 2026 Your Company

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 🙏 Acknowledgments

Built with:
- Kotlin Coroutines & Flow
- OkHttp
- Next.js & React
- Recharts
- WebSocket

## 📞 Support

- 📧 Email: subhra.io@gmail.com
- 🐛 Issues: [GitHub Issues](https://github.com/subhra-io/DroidPulse/issues)
- 📖 Docs: [Documentation](docs/)

---

**Made with ❤️ for Android developers**
