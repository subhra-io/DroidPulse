# 🚀 Integration Guide - Where to Add the Code

## Quick Answer

Add the Optimizer SDK initialization code in your **Application class** in the `onCreate()` method.

---

## Step-by-Step Integration

### Step 1: Create an Application Class (if you don't have one)

Create a new Kotlin file: `app/src/main/java/com/yourapp/MyApplication.kt`

```kotlin
package com.yourapp

import android.app.Application
import com.yourcompany.optimizer.core.Optimizer
import com.yourcompany.optimizer.core.OptimizerConfig
import com.yourcompany.optimizer.lifecycle.ActivityTracker
import com.yourcompany.optimizer.lifecycle.FragmentTracker
import com.yourcompany.optimizer.memory.MemoryTracker
import com.yourcompany.optimizer.fps.FpsTracker
import com.yourcompany.optimizer.transport.LocalServer

class MyApplication : Application() {
    
    private lateinit var memoryTracker: MemoryTracker
    private lateinit var fpsTracker: FpsTracker
    
    override fun onCreate() {
        super.onCreate()
        
        // 👇 ADD THIS CODE HERE 👇
        
        // Initialize Optimizer SDK
        Optimizer.init(
            app = this,
            config = OptimizerConfig(debug = true)
        )
        
        // Start lifecycle tracking
        ActivityTracker()
        FragmentTracker()
        
        // Start memory tracking
        memoryTracker = MemoryTracker(this)
        memoryTracker.start()
        
        // Start FPS tracking
        fpsTracker = FpsTracker()
        fpsTracker.start()
        
        // Start local server for dashboard
        LocalServer.start(8080)
    }
}
```

### Step 2: Register Application Class in AndroidManifest.xml

Open `app/src/main/AndroidManifest.xml` and add `android:name`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:name=".MyApplication"  👈 ADD THIS LINE
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/Theme.MyApp">
        
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
        
    </application>

</manifest>
```

### Step 3: Add Dependencies to build.gradle.kts

Open `app/build.gradle.kts` and add:

```kotlin
dependencies {
    // Optimizer SDK
    implementation(project(":sdk:core"))
    implementation(project(":sdk:lifecycle"))
    implementation(project(":sdk:network"))
    implementation(project(":sdk:memory"))
    implementation(project(":sdk:fps"))
    implementation(project(":sdk:transport"))
    
    // Your other dependencies...
}
```

---

## 📍 Exact Location Breakdown

### File Structure:
```
your-app/
├── app/
│   ├── src/
│   │   └── main/
│   │       ├── java/com/yourapp/
│   │       │   ├── MyApplication.kt  👈 CREATE THIS FILE
│   │       │   └── MainActivity.kt
│   │       └── AndroidManifest.xml   👈 UPDATE THIS FILE
│   └── build.gradle.kts              👈 UPDATE THIS FILE
```

### In MyApplication.kt:
```kotlin
class MyApplication : Application() {
    
    override fun onCreate() {
        super.onCreate()
        
        // 👇 ALL YOUR OPTIMIZER CODE GOES HERE 👇
        Optimizer.init(this, OptimizerConfig(debug = true))
        MemoryTracker(this).start()
        FpsTracker().start()
        // 👆 ALL YOUR OPTIMIZER CODE GOES HERE 👆
    }
}
```

---

## 🎯 Why Application Class?

The Application class is the **first thing that runs** when your app starts, making it the perfect place to:
- Initialize SDKs
- Set up global configurations
- Start background services
- Register lifecycle callbacks

The `onCreate()` method is called **once** when the app process starts, before any Activity is created.

---

## 📝 Complete Example

Here's a complete, copy-paste ready example:

### 1. MyApplication.kt
```kotlin
package com.yourapp

import android.app.Application
import com.yourcompany.optimizer.core.Optimizer
import com.yourcompany.optimizer.core.OptimizerConfig
import com.yourcompany.optimizer.lifecycle.ActivityTracker
import com.yourcompany.optimizer.lifecycle.FragmentTracker
import com.yourcompany.optimizer.memory.MemoryTracker
import com.yourcompany.optimizer.fps.FpsTracker
import com.yourcompany.optimizer.transport.LocalServer

class MyApplication : Application() {
    
    private lateinit var memoryTracker: MemoryTracker
    private lateinit var fpsTracker: FpsTracker
    
    override fun onCreate() {
        super.onCreate()
        
        // Initialize Optimizer SDK
        Optimizer.init(
            app = this,
            config = OptimizerConfig(
                debug = true,                  // Enable debug logging
                trackNetwork = true,           // Track API calls
                trackMemory = true,            // Track memory usage
                trackFps = true,               // Track FPS
                enableLocalServer = true,      // Enable WebSocket server
                localServerPort = 8080         // Dashboard port
            )
        )
        
        // Start lifecycle tracking
        ActivityTracker()
        FragmentTracker()
        
        // Start memory tracking (every 2 seconds)
        memoryTracker = MemoryTracker(this)
        memoryTracker.start(intervalMs = 2000)
        
        // Start FPS tracking (every 1 second)
        fpsTracker = FpsTracker()
        fpsTracker.start(reportIntervalMs = 1000)
        
        // Start local server for dashboard
        LocalServer.start(8080)
    }
}
```

### 2. AndroidManifest.xml
```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.yourapp">

    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:name=".MyApplication"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/Theme.MyApp">
        
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
        
    </application>

</manifest>
```

### 3. build.gradle.kts (app level)
```kotlin
dependencies {
    // Optimizer SDK
    implementation(project(":sdk:core"))
    implementation(project(":sdk:lifecycle"))
    implementation(project(":sdk:network"))
    implementation(project(":sdk:memory"))
    implementation(project(":sdk:fps"))
    implementation(project(":sdk:transport"))
    
    // Your other dependencies
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    // ... etc
}
```

---

## 🔍 How to Verify It's Working

### 1. Check Logcat
After running your app, check logcat:

```bash
adb logcat | grep Optimizer
```

You should see:
```
I/Optimizer: Initializing Optimizer SDK v1.0.0
I/Optimizer: Starting memory tracker (interval: 2000ms)
I/Optimizer: Starting FPS tracker (report interval: 1000ms)
I/Optimizer: WebSocket server started on port 8080
```

### 2. Check Dashboard
Open http://localhost:3000 and you should see:
- Connection status: "Connected" (green)
- Memory graph updating
- FPS graph updating
- Events appearing in stream

---

## ⚠️ Common Mistakes

### ❌ Wrong: Adding in MainActivity
```kotlin
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // ❌ DON'T DO THIS - Too late, won't track app start
        Optimizer.init(this, OptimizerConfig(debug = true))
    }
}
```

### ✅ Correct: Adding in Application class
```kotlin
class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        
        // ✅ DO THIS - Runs before any Activity
        Optimizer.init(this, OptimizerConfig(debug = true))
    }
}
```

### ❌ Wrong: Forgetting to register in Manifest
```xml
<application
    android:icon="@mipmap/ic_launcher"
    <!-- ❌ Missing android:name=".MyApplication" -->
```

### ✅ Correct: Registering in Manifest
```xml
<application
    android:name=".MyApplication"  <!-- ✅ This is required! -->
    android:icon="@mipmap/ic_launcher"
```

---

## 🎯 Quick Checklist

Before running your app, verify:

- [ ] Created `MyApplication.kt` file
- [ ] Added `Optimizer.init()` in `onCreate()`
- [ ] Started `MemoryTracker()`
- [ ] Started `FpsTracker()`
- [ ] Started `LocalServer.start(8080)`
- [ ] Added `android:name=".MyApplication"` in manifest
- [ ] Added SDK dependencies in `build.gradle.kts`
- [ ] Added `INTERNET` permission in manifest
- [ ] Synced Gradle
- [ ] Built the app

---

## 🚀 Next Steps

After adding the code:

1. **Build your app**:
   ```bash
   ./gradlew assembleDebug
   ```

2. **Install on device**:
   ```bash
   ./gradlew installDebug
   ```

3. **Open dashboard**:
   ```bash
   open http://localhost:3000
   ```

4. **Launch your app** and watch the dashboard come alive!

---

## 💡 Pro Tips

### Tip 1: Only in Debug Builds
```kotlin
override fun onCreate() {
    super.onCreate()
    
    if (BuildConfig.DEBUG) {
        // Only initialize in debug builds
        Optimizer.init(this, OptimizerConfig(debug = true))
        MemoryTracker(this).start()
        FpsTracker().start()
        LocalServer.start(8080)
    }
}
```

### Tip 2: Configurable Intervals
```kotlin
// Adjust tracking intervals based on your needs
memoryTracker.start(intervalMs = 5000)  // Every 5 seconds
fpsTracker.start(reportIntervalMs = 2000)  // Every 2 seconds
```

### Tip 3: Conditional Features
```kotlin
val config = OptimizerConfig(
    debug = BuildConfig.DEBUG,
    trackNetwork = true,
    trackMemory = true,
    trackFps = false,  // Disable FPS tracking if not needed
    enableLocalServer = BuildConfig.DEBUG
)
```

---

## 📞 Need Help?

If you're still unsure:

1. **Check our sample app**: `sample-app/ecommerce-demo/src/main/java/.../DemoApplication.kt`
2. **Read the docs**: `docs/QUICK_START.md`
3. **View logs**: `adb logcat | grep Optimizer`

---

**That's it! Your app is now monitoring performance in real-time! 🎉**
