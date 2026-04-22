# Quick Reference Card

## 🚀 Get Started in 5 Minutes

### 1. Build & Publish Locally
```bash
./gradlew build
./gradlew publishToMavenLocal
```

### 2. Add to Your App
```kotlin
// build.gradle.kts
dependencies {
    implementation("com.yourcompany:optimizer-core:1.0.0")
    implementation("com.yourcompany:optimizer-lifecycle:1.0.0")
    implementation("com.yourcompany:optimizer-network:1.0.0")
    implementation("com.yourcompany:optimizer-transport:1.0.0")
}
```

### 3. Initialize SDK
```kotlin
// Application.kt
class MyApp : Application() {
    override fun onCreate() {
        super.onCreate()
        
        Optimizer.init(this, OptimizerConfig(debug = true))
        ActivityTracker()
        FragmentTracker()
        LocalServer.start(8080)
    }
}
```

### 4. Add Network Tracking
```kotlin
val client = OkHttpClient.Builder()
    .addInterceptor(OptimizerInterceptor())
    .build()
```

### 5. Start Dashboard
```bash
cd dashboard-web
npm install
npm run dev
# Open http://localhost:3000
```

---

## 📋 Common Tasks

### Run Sample App
```bash
./gradlew :sample-app:ecommerce-demo:installDebug
```

### Check Logs
```bash
adb logcat | grep Optimizer
```

### Test WebSocket
```bash
# Check if server is running
adb logcat | grep "WebSocket server started"
```

### Rebuild Everything
```bash
./gradlew clean build
```

---

## 🔧 Configuration Options

```kotlin
OptimizerConfig(
    debug = true,                  // Enable debug logs
    trackNetwork = true,           // Track API calls
    trackMemory = true,            // Track memory (future)
    trackFps = true,               // Track FPS (future)
    trackDevice = true,            // Track device info (future)
    showOverlay = false,           // Show floating widget (future)
    enableLocalServer = true,      // Enable WebSocket server
    localServerPort = 8080,        // Server port
    cloudEndpoint = null,          // Cloud upload URL
    sampleRate = 1.0f,             // Event sampling (0.0-1.0)
    maxStoredEvents = 1000         // Max events in storage
)
```

---

## 📊 What Gets Tracked

| Feature | Status | How |
|---------|--------|-----|
| Activity Lifecycle | ✅ | Automatic |
| Fragment Lifecycle | ✅ | Automatic |
| Compose Navigation | ✅ | Manual: `ComposeNavTracker.trackRoute()` |
| API Calls | ✅ | Add `OptimizerInterceptor()` |
| Memory Usage | ⏳ | Sprint 2 |
| FPS & Jank | ⏳ | Sprint 2 |
| Device Info | ⏳ | Sprint 3 |

---

## 🐛 Troubleshooting

### Dashboard Not Connecting?
1. Check Android app is running
2. Verify: `LocalServer.start(8080)` was called
3. Check logs: `adb logcat | grep WebSocket`
4. For emulator, use `ws://10.0.2.2:8080` in dashboard

### No Events Showing?
1. Enable debug: `OptimizerConfig(debug = true)`
2. Check logs: `adb logcat | grep Optimizer`
3. Verify trackers initialized: `ActivityTracker()`
4. For network: Add `OptimizerInterceptor()`

### Build Errors?
1. Run: `./gradlew publishToMavenLocal`
2. Sync Gradle
3. Clean: `./gradlew clean`

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `README.md` | Project overview |
| `QUICK_START.md` | Getting started guide |
| `API_REFERENCE.md` | Complete API docs |
| `ARCHITECTURE.md` | System design |
| `SETUP_GUIDE.md` | Detailed setup |
| `PROJECT_OVERVIEW.md` | Comprehensive guide |
| `IMPLEMENTATION_SUMMARY.md` | What we built |
| `STRUCTURE.txt` | Visual structure |
| `CHECKLIST.md` | Progress tracking |
| `SUMMARY.txt` | Visual summary |

---

## 🎯 API Cheat Sheet

### Initialization
```kotlin
Optimizer.init(app, config)
Optimizer.isInitialized()
Optimizer.getConfig()
Optimizer.shutdown()
```

### Trackers
```kotlin
ActivityTracker()                    // Auto-tracks activities
FragmentTracker()                    // Auto-tracks fragments
ComposeNavTracker.trackRoute("home") // Manual compose tracking
```

### Server
```kotlin
LocalServer.start(8080)
LocalServer.stop()
LocalServer.isRunning()
```

### Network
```kotlin
OkHttpClient.Builder()
    .addInterceptor(OptimizerInterceptor())
    .build()
```

---

## 📦 Module Structure

```
sdk/
├── core/        → Required (Optimizer, Config, Dispatcher)
├── lifecycle/   → Optional (Activity/Fragment tracking)
├── network/     → Optional (API monitoring)
└── transport/   → Optional (WebSocket server)
```

---

## 🚀 Next Steps

1. **Test**: Run sample app + dashboard
2. **Integrate**: Add to your own app
3. **Customize**: Adjust configuration
4. **Extend**: Build Sprint 2 features
5. **Publish**: Deploy to Maven Central

---

## 💡 Pro Tips

- Use `debug = BuildConfig.DEBUG` to auto-disable in release
- Set `sampleRate = 0.1f` to reduce event volume
- Use `cloudEndpoint` for production monitoring
- Check `Optimizer.isInitialized()` before using
- Call `Optimizer.shutdown()` when done

---

## 📞 Resources

- **Docs**: `docs/` folder
- **Sample**: `sample-app/ecommerce-demo/`
- **Dashboard**: `dashboard-web/`
- **Scripts**: `scripts/`

---

**Ready to build! 🚀**
