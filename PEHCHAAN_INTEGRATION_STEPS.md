# 📱 Integrating DroidPulse into Pehchaan App

## Step-by-Step Guide for Your Pehchaan Project

After publishing DroidPulse to GitHub, follow these exact steps in your **Pehchaan project**.

---

## 📁 File Locations in Pehchaan Project

```
your-pehchaan-project/
├── app/
│   ├── build.gradle                    ← EDIT THIS (Step 2)
│   └── src/main/java/
│       ├── PehchaanApplication.kt      ← EDIT THIS (Step 3)
│       └── in/gov/uidai/pehchaan/
│           └── RetrofitClient.kt       ← EDIT THIS (Step 4)
├── settings.gradle.kts                 ← EDIT THIS (Step 1)
└── build.gradle.kts
```

---

## ✅ Step 1: Add JitPack Repository

**File**: `settings.gradle.kts` (in project root)

**Find this section:**
```kotlin
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
```

**Change to:**
```kotlin
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://jitpack.io") }  // ← ADD THIS LINE
    }
}
```

---

## ✅ Step 2: Add DroidPulse Dependencies

**File**: `app/build.gradle` (in app module)

**Find the `dependencies` section** (around line 150-200):
```groovy
dependencies {
    implementation libs.androidx.core.ktx
    implementation libs.androidx.appcompat
    // ... your existing dependencies
}
```

**Add DroidPulse at the TOP of dependencies:**
```groovy
dependencies {
    // DroidPulse SDK - Performance Monitoring
    implementation 'com.github.subhra-io.DroidPulse:core:1.0.0'
    implementation 'com.github.subhra-io.DroidPulse:lifecycle:1.0.0'
    implementation 'com.github.subhra-io.DroidPulse:network:1.0.0'
    implementation 'com.github.subhra-io.DroidPulse:memory:1.0.0'
    implementation 'com.github.subhra-io.DroidPulse:fps:1.0.0'
    implementation 'com.github.subhra-io.DroidPulse:transport:1.0.0'

    // Your existing dependencies
    implementation libs.androidx.core.ktx
    implementation libs.androidx.appcompat
    // ... rest of your dependencies
}
```

---

## ✅ Step 3: Initialize in PehchaanApplication

**File**: `app/src/main/java/PehchaanApplication.kt`

### 3.1 Add Imports at the Top

**Find the imports section** (top of file):
```kotlin
package `in`.gov.uidai.pehchaan

import android.app.Activity
import android.app.Application
// ... existing imports
```

**Add these imports:**
```kotlin
package `in`.gov.uidai.pehchaan

import android.app.Activity
import android.app.Application
// ... your existing imports ...

// DroidPulse SDK imports - ADD THESE
import com.yourcompany.optimizer.core.Optimizer
import com.yourcompany.optimizer.core.OptimizerConfig
import com.yourcompany.optimizer.lifecycle.ActivityTracker
import com.yourcompany.optimizer.memory.MemoryTracker
import com.yourcompany.optimizer.fps.FpsTracker
import com.yourcompany.optimizer.transport.WebSocketServer
```

### 3.2 Initialize SDK in onCreate()

**Find the `onCreate()` method:**
```kotlin
@HiltAndroidApp
class PehchaanApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        SessionManager.init()
        // ... your existing code
    }
}
```

**Add DroidPulse initialization at the START of onCreate():**
```kotlin
@HiltAndroidApp
class PehchaanApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        
        // Initialize DroidPulse SDK (Debug mode only)
        if (BuildConfig.DEBUG) {
            initializeDroidPulse()
        }
        
        // Your existing code
        SessionManager.init()
        val token = if (BuildConfig.DEBUG) BuildConfig.MIXPANEL_TOKEN_DEBUG else BuildConfig.MIXPANEL_TOKEN
        AnalyticsService.initialize(applicationContext, token)
        // ... rest of your code
    }
    
    // Add this new method at the end of the class
    private fun initializeDroidPulse() {
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
            
            // Start WebSocket server for dashboard
            WebSocketServer.start(port = 8080)
            
            Log.d("DroidPulse", "✅ Performance monitoring initialized")
            Log.d("DroidPulse", "📊 Dashboard: http://localhost:3000")
        } catch (e: Exception) {
            Log.e("DroidPulse", "❌ Failed to initialize: ${e.message}", e)
        }
    }
}
```

---

## ✅ Step 4: Add Network Interceptor (Optional but Recommended)

**File**: `app/src/main/java/in/gov/uidai/pehchaan/RetrofitClient.kt`

### 4.1 Add Import

**At the top of the file, add:**
```kotlin
import com.yourcompany.optimizer.network.OptimizerInterceptor
```

### 4.2 Add Interceptor to OkHttpClient

**Find this code:**
```kotlin
private val okHttpClient = OkHttpClient.Builder().apply {
    if(BuildConfig.DEBUG){
        addInterceptor(loggingInterceptor)
    }
}.build()
```

**Change to:**
```kotlin
private val okHttpClient = OkHttpClient.Builder().apply {
    if(BuildConfig.DEBUG){
        addInterceptor(loggingInterceptor)
        addInterceptor(OptimizerInterceptor())  // ← ADD THIS LINE
    }
}.build()
```

---

## ✅ Step 5: Sync Gradle

In Android Studio:
1. Click **File** → **Sync Project with Gradle Files**
2. Or click the **Sync Now** banner at the top

Or from terminal:
```bash
./gradlew --refresh-dependencies
```

---

## ✅ Step 6: Build Your App

```bash
./gradlew :app:assembleDebug
```

Or in Android Studio:
- Click **Build** → **Rebuild Project**

---

## ✅ Step 7: Run Dashboard

In a **separate terminal** (in the DroidPulse project):

```bash
# Clone DroidPulse repo (if not already)
git clone https://github.com/subhra-io/DroidPulse.git
cd DroidPulse/dashboard-web

# Install dependencies (first time only)
npm install

# Start dashboard
npm run dev
```

Dashboard will be at: **http://localhost:3000**

---

## ✅ Step 8: Run Your Pehchaan App

```bash
./gradlew :app:installDebug
```

Or in Android Studio:
- Click **Run** → **Run 'app'**

---

## 📊 What You'll See

### In Logcat (Android Studio)
```
D/DroidPulse: ✅ Performance monitoring initialized
D/DroidPulse: 📊 Dashboard: http://localhost:3000
D/DroidPulse: WebSocketServer started on port 8080
```

### In Dashboard (http://localhost:3000)
- 🟢 **Connection Status**: Connected
- 📱 **Screen Timings**: Activity navigation times
- 🌐 **API Calls**: Network requests with timing
- 💾 **Memory Graph**: Real-time memory usage
- 📊 **FPS Graph**: Frame rate monitoring
- ⚡ **Performance Summary**: Health score

---

## 🔍 Troubleshooting

### Issue: "Could not find com.github.subhra-io.DroidPulse"

**Solution**: Make sure you:
1. Created release on GitHub (tag: 1.0.0)
2. JitPack built successfully (check https://jitpack.io/#subhra-io/DroidPulse)
3. Added `maven { url = uri("https://jitpack.io") }` to settings.gradle.kts

### Issue: "Unresolved reference: Optimizer"

**Solution**: 
1. Sync Gradle: **File** → **Sync Project with Gradle Files**
2. Clean build: `./gradlew clean build`
3. Check imports are correct

### Issue: Dashboard shows "Disconnected"

**Solution**:
1. Check WebSocket server started (look for log: "WebSocketServer started on port 8080")
2. Make sure dashboard is running (`npm run dev`)
3. Check ports 8080 and 3000 are not blocked

### Issue: Build errors

**Solution**:
```bash
./gradlew clean
./gradlew --refresh-dependencies
./gradlew :app:assembleDebug
```

---

## 📝 Complete Code Examples

### Complete PehchaanApplication.kt

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

// DroidPulse SDK imports
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
        
        // Initialize DroidPulse SDK (Debug mode only)
        if (BuildConfig.DEBUG) {
            initializeDroidPulse()
        }
        
        SessionManager.init()
        val token = if (BuildConfig.DEBUG) BuildConfig.MIXPANEL_TOKEN_DEBUG else BuildConfig.MIXPANEL_TOKEN

        AnalyticsService.initialize(applicationContext, token)
        NavigationRegistry.languageSelectionLauncher = LanguageSelectionLauncherImpl()

        registerActivityLifecycleCallbacks(object : ActivityLifecycleCallbacks {
            override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {
                activity.window.setFlags(
                    WindowManager.LayoutParams.FLAG_SECURE,
                    WindowManager.LayoutParams.FLAG_SECURE
                )
            }

            override fun onActivityStarted(activity: Activity) {}
            override fun onActivityResumed(activity: Activity) {}
            override fun onActivityPaused(activity: Activity) {}
            override fun onActivityStopped(activity: Activity) {}
            override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
            override fun onActivityDestroyed(activity: Activity) {}
        })

        setCustomBuildValues()
        initializeExternalTools()
        RetrofitProvider.init(this) {
            GlobalScope.launch {
                val sharedPreferences = SharedPreferencesStorage(this@PehchaanApplication)
                sharedPreferences.clearSharedPreferences()
                dataStore.set("is_user_logged_in", false)
                withContext(Dispatchers.Main) {
                    try {
                        startActivity(Intent(this@PehchaanApplication, SplashActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                        })
                    } catch (e: Exception) {
                        Log.e("PehchaanApplication", "Failed to start SplashActivity: ${e.message}", e)
                    }
                }
            }
        }
    }

    private fun initializeExternalTools() {
        if (!BuildConfig.DEBUG) {
            val firebaseCrashlytics = FirebaseCrashlytics.getInstance()
            firebaseCrashlytics.isCrashlyticsCollectionEnabled = true
        }
    }

    private fun setCustomBuildValues() {
        CustomBuild.values = CustomBuildConfig(
            isDebug = BuildConfig.DEBUG,
            appId = BuildConfig.APPLICATION_ID,
            appVersion = "1.2.0",
            appVersionCode = BuildConfig.VERSION_CODE,
            flavor = BuildConfig.FLAVOR,
            buildType = BuildConfig.BUILD_TYPE,
            language = "en"
        )
    }

    /**
     * Initialize DroidPulse SDK for performance monitoring
     * Only runs in DEBUG mode to avoid production overhead
     */
    private fun initializeDroidPulse() {
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
            
            // Start WebSocket server for dashboard
            WebSocketServer.start(port = 8080)
            
            Log.d("DroidPulse", "✅ Performance monitoring initialized")
            Log.d("DroidPulse", "📊 Dashboard: http://localhost:3000")
        } catch (e: Exception) {
            Log.e("DroidPulse", "❌ Failed to initialize: ${e.message}", e)
        }
    }
}
```

### Complete RetrofitClient.kt

```kotlin
package `in`.gov.uidai.pehchaan

import com.fasterxml.jackson.databind.MapperFeature
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.jackson.JacksonConverterFactory
import com.fasterxml.jackson.dataformat.xml.XmlMapper
import com.fasterxml.jackson.dataformat.xml.JacksonXmlModule
import com.yourcompany.optimizer.network.OptimizerInterceptor

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
            addInterceptor(OptimizerInterceptor())  // DroidPulse network monitoring
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

## ✅ Summary

### Files to Edit in Pehchaan Project:
1. ✅ `settings.gradle.kts` - Add JitPack repository
2. ✅ `app/build.gradle` - Add DroidPulse dependencies
3. ✅ `PehchaanApplication.kt` - Initialize SDK
4. ✅ `RetrofitClient.kt` - Add network interceptor

### What Happens:
- ✅ DroidPulse tracks performance automatically
- ✅ Only runs in DEBUG builds (zero production impact)
- ✅ Dashboard shows real-time metrics
- ✅ No SDK folder in your project

---

## 🎉 Done!

Your Pehchaan app now has comprehensive performance monitoring with DroidPulse!

**Dashboard**: http://localhost:3000  
**Logs**: Filter by "DroidPulse" tag in Logcat
