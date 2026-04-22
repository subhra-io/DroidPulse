# 👋 START HERE

Welcome to the **Android Performance Optimizer SDK**!

## 🎯 What Is This?

A production-grade Android SDK that tracks app performance metrics in real-time:
- Activity & Fragment lifecycle timing
- API call monitoring
- Memory usage (coming soon)
- FPS tracking (coming soon)

Plus a beautiful web dashboard to visualize everything live!

## 🚀 Quick Start (5 Minutes)

### Option 1: Run the Demo App

```bash
# 1. Build the SDK
./gradlew build
./gradlew publishToMavenLocal

# 2. Install demo app
./gradlew :sample-app:ecommerce-demo:installDebug

# 3. Start dashboard
cd dashboard-web
npm install
npm run dev

# 4. Open http://localhost:3000
# 5. Use the Android app and watch events appear!
```

### Option 2: Integrate into Your App

```kotlin
// 1. Add to build.gradle.kts
implementation("com.yourcompany:optimizer-core:1.0.0")
implementation("com.yourcompany:optimizer-lifecycle:1.0.0")
implementation("com.yourcompany:optimizer-network:1.0.0")
implementation("com.yourcompany:optimizer-transport:1.0.0")

// 2. Initialize in Application.onCreate()
Optimizer.init(this, OptimizerConfig(debug = true))
ActivityTracker()
FragmentTracker()
LocalServer.start(8080)

// 3. Add to OkHttp (optional)
val client = OkHttpClient.Builder()
    .addInterceptor(OptimizerInterceptor())
    .build()
```

## 📚 Documentation

Start with these files in order:

1. **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** ← Cheat sheet
2. **[QUICK_START.md](docs/QUICK_START.md)** ← Getting started
3. **[SETUP_GUIDE.md](SETUP_GUIDE.md)** ← Detailed setup
4. **[API_REFERENCE.md](docs/API_REFERENCE.md)** ← API docs
5. **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** ← System design

## 📊 What We Built

**69 files** including:
- ✅ 4 SDK modules (core, lifecycle, network, transport)
- ✅ Sample e-commerce app
- ✅ Next.js dashboard with WebSocket
- ✅ Complete documentation
- ✅ Build scripts

## 🎯 Current Status

**Sprint 1: COMPLETE ✅**

Working features:
- Activity/Fragment lifecycle tracking
- API call monitoring via OkHttp
- Real-time WebSocket streaming
- Live web dashboard

Coming in Sprint 2:
- Memory tracking
- FPS monitoring
- Room database storage

## 🐛 Troubleshooting

### Dashboard not connecting?
```bash
# Check Android app is running
adb logcat | grep "WebSocket server started"
```

### No events showing?
```kotlin
// Enable debug mode
OptimizerConfig(debug = true)

// Check logs
adb logcat | grep Optimizer
```

### Build errors?
```bash
./gradlew clean
./gradlew publishToMavenLocal
```

## 📁 Project Structure

```
android-perf-tool/
├── sdk/                    # SDK modules
│   ├── core/              # Main SDK
│   ├── lifecycle/         # Screen tracking
│   ├── network/           # API monitoring
│   └── transport/         # WebSocket server
├── sample-app/            # Demo app
├── dashboard-web/         # Web dashboard
├── docs/                  # Documentation
└── scripts/               # Build scripts
```

## 💡 Key Features

- **Easy Integration**: 3 lines of code
- **Real-Time**: WebSocket streaming
- **Modular**: Include only what you need
- **Production-Ready**: Thread-safe, memory-efficient
- **Beautiful Dashboard**: Dark mode, live updates

## 🎓 Learn More

- **Overview**: [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)
- **Summary**: [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
- **Structure**: [STRUCTURE.txt](STRUCTURE.txt)
- **Checklist**: [CHECKLIST.md](CHECKLIST.md)

## 🚀 Next Steps

1. ✅ Run the demo app
2. ✅ Explore the dashboard
3. ✅ Read the documentation
4. ✅ Integrate into your app
5. 🔨 Build Sprint 2 features

## 💬 Questions?

Check these files:
- **Quick answers**: [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- **Setup help**: [SETUP_GUIDE.md](SETUP_GUIDE.md)
- **API docs**: [docs/API_REFERENCE.md](docs/API_REFERENCE.md)

---

**Ready to optimize your Android app! 🚀**

Start with: `./gradlew build && ./gradlew :sample-app:ecommerce-demo:installDebug`
