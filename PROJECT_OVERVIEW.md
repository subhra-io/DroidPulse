# Android Performance Optimizer SDK - Project Overview

## 🎯 What We Built

A **production-grade Android SDK** that developers can add to their apps to track performance metrics in real-time. Think of it as a developer tool for monitoring app health during development.

## 📦 Project Structure

```
android-perf-tool/
├── sdk/                          # SDK modules
│   ├── core/                     # ✅ Main entry point & dispatcher
│   ├── lifecycle/                # ✅ Activity/Fragment tracking
│   ├── network/                  # ✅ OkHttp interceptor
│   ├── transport/                # ✅ WebSocket server & HTTP upload
│   ├── memory/                   # ⏳ Memory tracking (skeleton)
│   ├── fps/                      # ⏳ FPS tracking (skeleton)
│   ├── device/                   # ⏳ Device info (skeleton)
│   ├── storage/                  # ⏳ Room database (skeleton)
│   ├── ui-overlay/               # ⏳ Floating widget (skeleton)
│   └── reports/                  # ⏳ Performance reports (skeleton)
│
├── sample-app/                   # Demo applications
│   └── ecommerce-demo/           # ✅ Sample e-commerce app
│
├── dashboard-web/                # ✅ Next.js dashboard
│   ├── src/app/                  # Pages
│   ├── src/components/           # React components
│   └── src/hooks/                # WebSocket hook
│
├── docs/                         # ✅ Documentation
│   ├── QUICK_START.md
│   ├── API_REFERENCE.md
│   └── ARCHITECTURE.md
│
└── scripts/                      # ✅ Build & run scripts
    ├── run-demo.sh
    └── publish.sh
```

## ✅ What's Implemented (Sprint 1)

### 1. Core Module (`sdk/core/`)
- **Optimizer.kt**: Main SDK entry point with `init()` method
- **OptimizerConfig.kt**: Configuration data class
- **Dispatcher.kt**: Event bus using Kotlin Flow
- **Logger.kt**: Internal logging system
- **LifecycleRegistry.kt**: Global activity lifecycle callbacks
- **Constants.kt**: SDK constants

### 2. Lifecycle Module (`sdk/lifecycle/`)
- **ActivityTracker.kt**: Tracks Activity lifecycle & timing
- **FragmentTracker.kt**: Tracks Fragment transitions
- **ComposeNavTracker.kt**: Manual Compose navigation tracking
- **ScreenEvent.kt**: Lifecycle event data class

### 3. Network Module (`sdk/network/`)
- **OptimizerInterceptor.kt**: OkHttp interceptor for API tracking
- **ApiEvent.kt**: Network event data class
- **NetworkCollector.kt**: Network statistics aggregation
- **CurlGenerator.kt**: Generate cURL commands for debugging

### 4. Transport Module (`sdk/transport/`)
- **WebSocketServer.kt**: Local WebSocket server (port 8080)
- **LocalServer.kt**: Server management
- **EventSerializer.kt**: JSON serialization
- **HttpUploader.kt**: Cloud upload capability

### 5. Sample App (`sample-app/ecommerce-demo/`)
- **DemoApplication.kt**: Shows SDK integration
- **MainActivity.kt**: Sample activities
- Complete Android app structure

### 6. Dashboard (`dashboard-web/`)
- **Next.js 14** with TypeScript
- **WebSocket client** for live updates
- **Dark mode UI** with Tailwind CSS
- **Components**:
  - ScreenTimings: Activity/Fragment timing
  - ApiCalls: Network request monitoring
  - MemoryGraph: Memory visualization (placeholder)
  - FpsGraph: FPS monitoring (placeholder)
  - ConnectionStatus: WebSocket status

### 7. Documentation
- Quick Start Guide
- API Reference
- Architecture Overview
- README with installation instructions

## 🚀 How to Use

### For SDK Users (App Developers)

```kotlin
// 1. Add dependency
implementation("com.yourcompany:optimizer-sdk:1.0.0")

// 2. Initialize in Application
class MyApp : Application() {
    override fun onCreate() {
        super.onCreate()
        
        Optimizer.init(
            app = this,
            config = OptimizerConfig(
                debug = true,
                trackNetwork = true,
                showOverlay = true
            )
        )
        
        ActivityTracker()
        FragmentTracker()
        LocalServer.start(8080)
    }
}

// 3. Add OkHttp interceptor
val client = OkHttpClient.Builder()
    .addInterceptor(OptimizerInterceptor())
    .build()
```

### For Dashboard

```bash
cd dashboard-web
npm install
npm run dev
# Open http://localhost:3000
```

## 🔥 Key Features

### Event Flow Architecture
```
Activity/API Call → Tracker → Dispatcher → [Storage, WebSocket, HTTP]
                                                ↓
                                           Dashboard
```

### Thread Safety
- Kotlin Coroutines for async operations
- Flow for reactive event streaming
- Thread-safe event dispatching

### Performance
- Zero overhead when disabled
- Buffered Flow prevents backpressure
- Lazy module initialization
- ProGuard rules for release builds

### Developer Experience
- Simple one-line initialization
- Auto-tracking for Activities/Fragments
- Easy OkHttp integration
- Real-time dashboard feedback

## ⏳ What's Next (Sprint 2 & 3)

### Sprint 2
- **Memory Module**: Heap analysis, RAM tracking, leak detection
- **FPS Module**: Frame drop detection using Choreographer
- **Storage Module**: Room database for event persistence
- **Dashboard**: Enhanced charts with Recharts

### Sprint 3
- **Reports Module**: Performance scoring & recommendations
- **UI Overlay**: Floating debug widget
- **Device Module**: CPU, battery, thermal tracking
- **Cloud Sync**: Batch upload to backend

## 🛠️ Tech Stack

### Android SDK
- **Language**: Kotlin
- **Async**: Coroutines + Flow
- **Network**: OkHttp
- **Storage**: Room (planned)
- **Min SDK**: 24 (Android 7.0)

### Dashboard
- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts (planned)
- **WebSocket**: Native WebSocket API

## 📊 Current Capabilities

| Feature | Status | Notes |
|---------|--------|-------|
| Activity Tracking | ✅ | Full lifecycle + timing |
| Fragment Tracking | ✅ | Full lifecycle + timing |
| Compose Navigation | ✅ | Manual tracking |
| Network Monitoring | ✅ | Via OkHttp interceptor |
| WebSocket Server | ✅ | Port 8080 |
| Dashboard UI | ✅ | Basic real-time view |
| Memory Tracking | ⏳ | Skeleton only |
| FPS Tracking | ⏳ | Skeleton only |
| Storage | ⏳ | Skeleton only |
| Reports | ⏳ | Skeleton only |

## 🎓 Learning Resources

- **Quick Start**: `docs/QUICK_START.md`
- **API Docs**: `docs/API_REFERENCE.md`
- **Architecture**: `docs/ARCHITECTURE.md`
- **Sample App**: `sample-app/ecommerce-demo/`

## 🚢 Publishing

```bash
# Test locally
./gradlew publishToMavenLocal

# Publish to Maven Central (requires credentials)
./gradlew publish
```

## 💡 Design Decisions

1. **Modular Architecture**: Each feature is a separate Gradle module for flexibility
2. **Flow over LiveData**: Better for background processing
3. **WebSocket over HTTP**: Real-time updates with lower latency
4. **Local-first**: Works without internet, cloud is optional
5. **Debug-only**: Designed for development, not production monitoring

## 🎯 Target Users

- Android developers building apps
- QA teams testing performance
- Product teams monitoring metrics
- Indie developers optimizing apps

## 📈 Success Metrics

- Easy integration (< 5 minutes)
- Low overhead (< 1% CPU)
- Real-time feedback (< 100ms latency)
- Comprehensive tracking (lifecycle, network, memory, FPS)

## 🔐 Security & Privacy

- Debug builds only by default
- No PII collection
- Local-first architecture
- Optional cloud upload
- Configurable data retention

---

**Status**: Sprint 1 Complete ✅  
**Next**: Implement memory & FPS tracking (Sprint 2)  
**Goal**: Production-ready SDK for developer tools market
