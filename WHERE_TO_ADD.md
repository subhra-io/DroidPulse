# 📍 Where to Add DroidPulse in Pehchaan - Visual Guide

## Quick Reference: 4 Files to Edit

```
your-pehchaan-project/
│
├── settings.gradle.kts          ← FILE 1: Add JitPack
│
├── app/
│   ├── build.gradle             ← FILE 2: Add dependencies
│   │
│   └── src/main/java/
│       ├── PehchaanApplication.kt    ← FILE 3: Initialize SDK
│       │
│       └── in/gov/uidai/pehchaan/
│           └── RetrofitClient.kt     ← FILE 4: Add interceptor
```

---

## 📝 FILE 1: settings.gradle.kts

**Location**: Project root

**What to add**: JitPack repository

```kotlin
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://jitpack.io") }  // ← ADD THIS
    }
}
```

---

## 📝 FILE 2: app/build.gradle

**Location**: `app/build.gradle`

**What to add**: DroidPulse dependencies

**Find this:**
```groovy
dependencies {
    implementation libs.androidx.core.ktx
    implementation libs.androidx.appcompat
    // ... more dependencies
}
```

**Add at the top:**
```groovy
dependencies {
    // ← ADD THESE 6 LINES
    implementation 'com.github.subhra-io.DroidPulse:core:1.0.0'
    implementation 'com.github.subhra-io.DroidPulse:lifecycle:1.0.0'
    implementation 'com.github.subhra-io.DroidPulse:network:1.0.0'
    implementation 'com.github.subhra-io.DroidPulse:memory:1.0.0'
    implementation 'com.github.subhra-io.DroidPulse:fps:1.0.0'
    implementation 'com.github.subhra-io.DroidPulse:transport:1.0.0'

    // Your existing dependencies
    implementation libs.androidx.core.ktx
    implementation libs.androidx.appcompat
    // ... rest
}
```

---

## 📝 FILE 3: PehchaanApplication.kt

**Location**: `app/src/main/java/PehchaanApplication.kt`

### Part A: Add Imports (at the top)

**Find this:**
```kotlin
package `in`.gov.uidai.pehchaan

import android.app.Activity
import android.app.Application
// ... existing imports
```

**Add these imports:**
```kotlin
// ← ADD THESE 6 IMPORTS
import com.yourcompany.optimizer.core.Optimizer
import com.yourcompany.optimizer.core.OptimizerConfig
import com.yourcompany.optimizer.lifecycle.ActivityTracker
import com.yourcompany.optimizer.memory.MemoryTracker
import com.yourcompany.optimizer.fps.FpsTracker
import com.yourcompany.optimizer.transport.WebSocketServer
```

### Part B: Initialize in onCreate()

**Find this:**
```kotlin
@HiltAndroidApp
class PehchaanApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        SessionManager.init()  // ← Your existing code starts here
        // ...
    }
}
```

**Change to:**
```kotlin
@HiltAndroidApp
class PehchaanApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        
        // ← ADD THESE 3 LINES
        if (BuildConfig.DEBUG) {
            initializeDroidPulse()
        }
        
        // Your existing code
        SessionManager.init()
        // ... rest of your code
    }
    
    // ← ADD THIS ENTIRE METHOD at the end of the class
    private fun initializeDroidPulse() {
        try {
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
            
            ActivityTracker(this).start()
            MemoryTracker(this).start()
            FpsTracker().start()
            WebSocketServer.start(port = 8080)
            
            Log.d("DroidPulse", "✅ Performance monitoring initialized")
        } catch (e: Exception) {
            Log.e("DroidPulse", "❌ Failed: ${e.message}", e)
        }
    }
}
```

---

## 📝 FILE 4: RetrofitClient.kt

**Location**: `app/src/main/java/in/gov/uidai/pehchaan/RetrofitClient.kt`

### Part A: Add Import (at the top)

**Find this:**
```kotlin
package `in`.gov.uidai.pehchaan

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
// ... other imports
```

**Add this import:**
```kotlin
import com.yourcompany.optimizer.network.OptimizerInterceptor  // ← ADD THIS
```

### Part B: Add Interceptor

**Find this:**
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

## ✅ That's It! Only 4 Files

### Summary:
1. ✅ `settings.gradle.kts` - 1 line (JitPack repo)
2. ✅ `app/build.gradle` - 6 lines (dependencies)
3. ✅ `PehchaanApplication.kt` - 6 imports + 1 method
4. ✅ `RetrofitClient.kt` - 1 import + 1 line

---

## 🔄 After Editing

### 1. Sync Gradle
```bash
./gradlew --refresh-dependencies
```

Or in Android Studio: **File** → **Sync Project with Gradle Files**

### 2. Build
```bash
./gradlew :app:assembleDebug
```

### 3. Run Dashboard (separate terminal)
```bash
cd /path/to/DroidPulse/dashboard-web
npm run dev
```

### 4. Run App
```bash
./gradlew :app:installDebug
```

---

## 📊 What You'll See

### In Logcat:
```
D/DroidPulse: ✅ Performance monitoring initialized
D/DroidPulse: 📊 Dashboard: http://localhost:3000
```

### In Dashboard (http://localhost:3000):
- 🟢 Connected
- 📱 Screen timings
- 🌐 API calls
- 💾 Memory graphs
- 📊 FPS monitoring

---

## 🎯 Key Points

✅ **Only 4 files to edit**  
✅ **Only runs in DEBUG mode**  
✅ **Zero production impact**  
✅ **No SDK folder in your project**  
✅ **Easy to remove** (just delete the added lines)

---

## 📚 Detailed Guide

For complete code examples and troubleshooting, see:
**`PEHCHAAN_INTEGRATION_STEPS.md`**
