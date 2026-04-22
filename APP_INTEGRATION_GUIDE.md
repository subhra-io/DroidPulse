# 🚀 Integrating Optimizer SDK into Your Pehchaan App

## Overview

This guide shows you how to integrate the Optimizer SDK into your existing Pehchaan application for performance monitoring.

---

## ✅ Step 1: Add Maven Local Repository

In your project's `settings.gradle.kts`, add `mavenLocal()`:

```kotlin
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        mavenLocal()  // ← Add this line
    }
}
```

---

## ✅ Step 2: Add SDK Dependencies

In your `app/build.gradle`, add the Optimizer SDK dependencies:

### Option A: Using Maven Local (Recommended for Testing)

```groovy
dependencies {
    // Optimizer SDK - Performance Monitoring
    implementation("com.yourcompany.optimizer:core:1.0.0")
    implementation("com.yourcompany.optimizer:lifecycle:1.0.0")
    implementation("com.yourcompany.optimizer:network:1.0.0")
    implementation("com.yourcompany.optimizer:memory:1.0.0")
    implementation("com.yourcompany.optimizer:fps:1.0.0")
    implementation("com.yourcompany.optimizer:transport:1.0.0")
    
    // Your existing dependencies...
}
```

### Option B: Using Project Dependencies (If in Same Workspace)

```groovy
dependencies {
    // Optimizer SDK - Performance Monitoring
    implementation(project(":sdk:core"))
    implementation(project(":sdk:lifecycle"))
    implementation(project(":sdk:network"))
    implementation(project(":sdk:memory"))
    implementation(project(":sdk:fps"))
    implementation(project(":sdk:transport"))
    
    // Your existing dependencies...
}
```

---

## ✅ Step 3: Update PehchaanApplication Class

Update your `app/src/main/java/PehchaanApplication.kt`:

```kotlin
package `in`.gov.uidai.pehchaan

import android.app.Activity
import android.app.Application
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.WindowManager
import com.google.firebase.crashlytics.FirebaseCrashlytics
import dagger.hilt.android.HiltAndroidApp
import `in`.gov.uidai.analyticsmod.AnalyticsService
import `in`.gov.uidai.pehchaan.`in`.gov.uidai.pehchaan.util.LanguageSelectionLauncherImpl
import `in`.gov.uidai.pehchaan.network.RetrofitProvider
import `in`.gov.uidai.pehchaan.onboarding.SplashActivity
import `in`.gov.uidai.pehchaan.utility.SessionManager
import `in`.gov.uidai.pehchaan.utility.datastore.dataStore
import `in`.gov.uidai.pehchaan.utility.datastore.set
import `in`.gov.uidai.pehchaan.utility.utils.CustomBuild
import `in`.gov.uidai.pehchaan.utility.utils.CustomBuildConfig
import `in`.gov.uidai.pehchaan.utility.utils.NavigationRegistry
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

// ← ADD THESE IMPORTS
import com.yourcompany.optimizer.core.Optimizer
import com.yourcompany.optimizer.core.OptimizerConfig
import com.yourcompany.optimizer.lifecycle.ActivityTracker
import com.yourcompany.optimizer.memory.MemoryTracker
import com.yourcompany.optimizer.fps.FpsTracker
import com.yourcompany.optimizer.transport.WebSocketServer

@HiltAndroidApp
class PehchaanApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        
        // ← ADD THIS: Initialize Optimizer SDK (Debug mode only)
        if (BuildConfig.DEBUG) {
            initializeOptimizerSDK()
        }
        
        // Your existing initialization code...
        SessionManager.init()
        val token = if (BuildConfig.DEBUG) BuildConfig.MIXPANEL_TOKEN_DEBUG else BuildConfig.MIXPANEL_TOKEN
        
        AnalyticsService.initialize(applicationContext, token)
        NavigationRegistry.languageSelectionLauncher = LanguageSelectionLauncherImpl()
        
        // ... rest of your code ...
    }
    
    // ← ADD THIS METHOD
    /**
     * Initialize Optimizer SDK for performance monitoring
     * Only runs in DEBUG mode to avoid production overhead
     */
    private fun initializeOptimizerSDK() {
        try {
            // Initialize core SDK
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
            
            // Start performance trackers
            ActivityTracker(this).start()
            MemoryTracker(this).start()
            FpsTracker().start()
            
            // Start WebSocket server for dashboard connection
            WebSocketServer.start(port = 8080)
            
            Log.d("OptimizerSDK", "✅ Performance monitoring initialized")
            Log.d("OptimizerSDK", "📊 Dashboard: http://localhost:3000")
        } catch (e: Exception) {
            Log.e("OptimizerSDK", "❌ Failed to initialize: ${e.message}", e)
        }
    }
    
    // ... rest of your existing code ...
}
```

---

## ✅ Step 4: Add Network Interceptor (Optional but Recommended)

Update your `RetrofitClient.kt` to track API calls:

```kotlin
package `in`.gov.uidai.pehchaan

import com.fasterxml.jackson.databind.MapperFeature
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.jackson.JacksonConverterFactory
import com.fasterxml.jackson.dataformat.xml.XmlMapper
import com.fasterxml.jackson.dataformat.xml.JacksonXmlModule
import com.yourcompany.optimizer.network.OptimizerInterceptor  // ← ADD THIS

object RetrofitClient {
    private val xmlMapper: XmlMapper = XmlMapper(JacksonXmlModule().apply {
        setDefaultUseWrapper(false)
    }).apply {
        configure(MapperFeature.USE_ANNOTATIONS, true)
    }

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val okHttpClient = OkHttpClient.Builder().apply {
        if(BuildConfig.DEBUG){
            addInterceptor(loggingInterceptor)
            addInterceptor(OptimizerInterceptor())  // ← ADD THIS LINE
        }
    }.build()

    val instance: ApiService by lazy {
        retrofit.create(ApiService::class.java)
    }

    val retrofit = Retrofit.Builder()
        .baseUrl("https://example.com")
        .client(okHttpClient)
        .addConverterFactory(JacksonConverterFactory.create(xmlMapper))
        .build()
}
```

---

## ✅ Step 5: Sync and Build

1. **Sync Gradle**:
   ```bash
   ./gradlew --refresh-dependencies
   ```

2. **Build your app**:
   ```bash
   ./gradlew :app:assembleDebug
   ```

---

## ✅ Step 6: Start the Dashboard

In the Optimizer SDK project (this project), start the dashboard:

```bash
cd dashboard-web
npm run dev
```

Dashboard will be available at: **http://localhost:3000**

---

## ✅ Step 7: Run Your App

1. Run your Pehchaan app on a device or emulator
2. Open the dashboard at http://localhost:3000
3. You should see:
   - ✅ Connection status (Connected)
   - 📱 Screen navigation timings
   - 🌐 API call monitoring
   - 💾 Memory usage graphs
   - 📊 FPS monitoring

---

## 🎯 What Gets Tracked

### Automatically Tracked
- ✅ Activity lifecycle (onCreate, onStart, onResume, etc.)
- ✅ Fragment transitions
- ✅ Screen navigation timing
- ✅ Memory usage (heap + RAM)
- ✅ FPS and frame drops
- ✅ API calls (when using OptimizerInterceptor)

### Dashboard Features
- 📊 Real-time performance graphs
- 🔴 Live connection indicator
- 📈 Memory usage over time
- 🎮 FPS monitoring
- 🌐 API call list with timing
- ⚡ Performance health score

---

## 🔧 Configuration Options

You can customize the SDK behavior:

```kotlin
OptimizerConfig(
    debug = true,                      // Enable/disable SDK
    enableLifecycleTracking = true,    // Track screens
    enableNetworkTracking = true,      // Track API calls
    enableMemoryTracking = true,       // Track memory
    enableFpsTracking = true,          // Track FPS
    samplingRate = 1.0f,               // Sample 100% of events
    logLevel = LogLevel.DEBUG          // Logging verbosity
)
```

---

## 🚨 Important Notes

### Debug Mode Only
The SDK is configured to run **only in DEBUG builds**:
```kotlin
if (BuildConfig.DEBUG) {
    initializeOptimizerSDK()
}
```

This ensures:
- ✅ Zero overhead in production
- ✅ No data collection in release builds
- ✅ Safe for app store submission

### Port Configuration
- **WebSocket Server**: Port 8080 (in your app)
- **Dashboard**: Port 3000 (Next.js dev server)

Make sure these ports are available.

### Network Requirements
- App and dashboard must be on the same network
- For emulator: Use `10.0.2.2:3000` instead of `localhost:3000`
- For physical device: Use your computer's IP address

---

## 🐛 Troubleshooting

### Dashboard Shows "Disconnected"
1. Check if WebSocket server started (look for log: "WebSocketServer started on port 8080")
2. Verify ports 8080 and 3000 are not blocked
3. Check network connectivity

### Build Errors
1. Make sure SDK is published to Maven Local:
   ```bash
   ./scripts/publish-local.sh
   ```
2. Sync Gradle dependencies:
   ```bash
   ./gradlew --refresh-dependencies
   ```

### No Data in Dashboard
1. Verify SDK initialized (check logs for "Performance monitoring initialized")
2. Make sure you're in DEBUG build variant
3. Check that trackers started successfully

---

## 📊 Example Dashboard View

Once running, you'll see:

```
┌─────────────────────────────────────────┐
│ Connection Status: 🟢 Connected         │
├─────────────────────────────────────────┤
│ Screen Timings                          │
│ MainActivity → onCreate: 245ms          │
│ ProductListActivity → onResume: 89ms    │
├─────────────────────────────────────────┤
│ API Calls                               │
│ GET /api/products → 200 (342ms)         │
│ POST /api/checkout → 201 (567ms)        │
├─────────────────────────────────────────┤
│ Memory Usage                            │
│ [Graph showing heap/RAM over time]      │
├─────────────────────────────────────────┤
│ FPS Monitor                             │
│ Current: 60 FPS | Janks: 2              │
│ [Graph showing FPS over time]           │
└─────────────────────────────────────────┘
```

---

## 🎉 You're All Set!

Your Pehchaan app now has comprehensive performance monitoring. The SDK will track:
- Screen navigation performance
- API call timing and status
- Memory usage patterns
- Frame rate and UI smoothness

All data is displayed in real-time on the dashboard at http://localhost:3000

---

## 📚 Additional Resources

- **Full API Reference**: `docs/API_REFERENCE.md`
- **Publishing Guide**: `PUBLISHING_GUIDE.md`
- **Testing Guide**: `TESTING_GUIDE.md`
- **Architecture**: `docs/ARCHITECTURE.md`

---

## 🔄 Updating the SDK

When you make changes to the SDK:

1. Republish to Maven Local:
   ```bash
   ./scripts/publish-local.sh
   ```

2. In your app project:
   ```bash
   ./gradlew --refresh-dependencies
   ./gradlew clean :app:assembleDebug
   ```

---

**Need Help?** Check the logs for "OptimizerSDK" tag to see initialization status and any errors.
