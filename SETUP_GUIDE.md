# Complete Setup Guide

## Prerequisites

- **Android Studio**: Arctic Fox or newer
- **JDK**: 17+
- **Node.js**: 18+
- **Gradle**: 8.0+ (included in wrapper)

## Step-by-Step Setup

### 1. Clone & Build SDK

```bash
# Navigate to project
cd android-perf-tool

# Build all modules
./gradlew build

# Publish to Maven Local for testing
./gradlew publishToMavenLocal
```

### 2. Run Sample App

```bash
# Install on device/emulator
./gradlew :sample-app:ecommerce-demo:installDebug

# Or open in Android Studio and run
```

### 3. Start Dashboard

```bash
cd dashboard-web

# Install dependencies
npm install

# Start dev server
npm run dev

# Dashboard will be at http://localhost:3000
```

### 4. Test the Integration

1. **Launch the Android app** on emulator/device
2. **Open dashboard** at http://localhost:3000
3. **Navigate between screens** in the app
4. **Watch events appear** in real-time on dashboard

## Integrating into Your Own App

### Step 1: Add Repository

In your project's `settings.gradle.kts`:

```kotlin
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        mavenLocal() // For local testing
    }
}
```

### Step 2: Add Dependencies

In your app's `build.gradle.kts`:

```kotlin
dependencies {
    // Core is required
    implementation("com.yourcompany:optimizer-core:1.0.0")
    
    // Add modules you need
    implementation("com.yourcompany:optimizer-lifecycle:1.0.0")
    implementation("com.yourcompany:optimizer-network:1.0.0")
    implementation("com.yourcompany:optimizer-transport:1.0.0")
}
```

### Step 3: Create Application Class

```kotlin
package com.example.myapp

import android.app.Application
import com.yourcompany.optimizer.core.Optimizer
import com.yourcompany.optimizer.core.OptimizerConfig
import com.yourcompany.optimizer.lifecycle.ActivityTracker
import com.yourcompany.optimizer.lifecycle.FragmentTracker
import com.yourcompany.optimizer.transport.LocalServer

class MyApplication : Application() {
    
    override fun onCreate() {
        super.onCreate()
        
        // Initialize SDK
        Optimizer.init(
            app = this,
            config = OptimizerConfig(
                debug = BuildConfig.DEBUG, // Only in debug builds
                trackNetwork = true,
                trackMemory = true,
                trackFps = true,
                enableLocalServer = true,
                localServerPort = 8080
            )
        )
        
        // Start trackers
        ActivityTracker()
        FragmentTracker()
        
        // Start local server
        if (BuildConfig.DEBUG) {
            LocalServer.start(8080)
        }
    }
}
```

### Step 4: Register Application in Manifest

```xml
<application
    android:name=".MyApplication"
    ...>
```

### Step 5: Add Network Interceptor (Optional)

If you use OkHttp/Retrofit:

```kotlin
import com.yourcompany.optimizer.network.OptimizerInterceptor

val okHttpClient = OkHttpClient.Builder()
    .addInterceptor(OptimizerInterceptor())
    .build()

val retrofit = Retrofit.Builder()
    .client(okHttpClient)
    .baseUrl("https://api.example.com")
    .build()
```

### Step 6: Track Compose Navigation (Optional)

For Jetpack Compose apps:

```kotlin
import com.yourcompany.optimizer.lifecycle.ComposeNavTracker

@Composable
fun MyNavHost() {
    val navController = rememberNavController()
    
    NavHost(navController, startDestination = "home") {
        composable("home") {
            ComposeNavTracker.trackRoute("home")
            HomeScreen()
        }
        composable("profile") {
            ComposeNavTracker.trackRoute("profile")
            ProfileScreen()
        }
    }
}
```

## Troubleshooting

### Build Errors

**Error**: `Could not find com.yourcompany:optimizer-core:1.0.0`

**Solution**: Run `./gradlew publishToMavenLocal` first

---

**Error**: `Duplicate class found`

**Solution**: Check you're not including modules twice

---

### Runtime Issues

**Issue**: Dashboard not connecting

**Solutions**:
1. Check Android app is running
2. Verify `LocalServer.start(8080)` was called
3. Check logcat for "WebSocket server started"
4. Ensure emulator can reach localhost (use 10.0.2.2 for Android emulator)

---

**Issue**: No events showing

**Solutions**:
1. Enable debug: `OptimizerConfig(debug = true)`
2. Check logcat for "Optimizer" tag
3. Verify trackers are initialized
4. For network events, ensure interceptor is added

---

**Issue**: App crashes on startup

**Solutions**:
1. Check you called `Optimizer.init()` in `Application.onCreate()`
2. Verify all dependencies are added
3. Check ProGuard rules if using minification

---

### Dashboard Issues

**Issue**: `npm install` fails

**Solution**: Update Node.js to 18+

---

**Issue**: WebSocket connection refused

**Solutions**:
1. Check Android app is running first
2. Verify port 8080 is not in use
3. For physical device, use device IP instead of localhost

---

## Advanced Configuration

### Custom Port

```kotlin
OptimizerConfig(
    enableLocalServer = true,
    localServerPort = 9000 // Custom port
)
```

Update dashboard WebSocket URL:
```typescript
const { events } = useWebSocket('ws://localhost:9000')
```

### Cloud Upload

```kotlin
OptimizerConfig(
    cloudEndpoint = "https://api.yourcompany.com/events"
)
```

### Sampling

Reduce event volume:

```kotlin
OptimizerConfig(
    sampleRate = 0.5f // Track 50% of events
)
```

### Disable in Release

```kotlin
if (BuildConfig.DEBUG) {
    Optimizer.init(app, config)
    ActivityTracker()
    LocalServer.start()
}
```

## Next Steps

1. ✅ Run the sample app
2. ✅ Explore the dashboard
3. ✅ Integrate into your app
4. 📖 Read [API Reference](docs/API_REFERENCE.md)
5. 🏗️ Check [Architecture](docs/ARCHITECTURE.md)
6. 🚀 Build memory & FPS modules (Sprint 2)

## Getting Help

- Check `docs/` folder for detailed documentation
- Review `sample-app/` for integration examples
- Read `PROJECT_OVERVIEW.md` for architecture details

## Contributing

This is a foundational implementation. Key areas for contribution:

1. **Memory Module**: Implement heap analysis
2. **FPS Module**: Add Choreographer-based tracking
3. **Storage Module**: Add Room database
4. **UI Overlay**: Build floating widget
5. **Reports**: Generate performance scores

---

**Happy Coding!** 🚀
