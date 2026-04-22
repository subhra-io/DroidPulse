# 🚀 Quick Start: Using Optimizer SDK in Other Projects

## ✅ Publishing Complete!

Your SDK is now published to Maven Local and ready to use in any Android project.

---

## 📦 Step 1: Add Repository

In your **other Android project**, open `settings.gradle.kts`:

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

## 📚 Step 2: Add Dependencies

In your app's `build.gradle.kts`:

```kotlin
dependencies {
    // Optimizer SDK - Add all modules you need
    implementation("com.yourcompany.optimizer:core:1.0.0")
    implementation("com.yourcompany.optimizer:lifecycle:1.0.0")
    implementation("com.yourcompany.optimizer:network:1.0.0")
    implementation("com.yourcompany.optimizer:memory:1.0.0")
    implementation("com.yourcompany.optimizer:fps:1.0.0")
    implementation("com.yourcompany.optimizer:transport:1.0.0")
    
    // Your other dependencies...
}
```

---

## 🔧 Step 3: Initialize SDK

Create or update your `Application` class:

```kotlin
package com.yourapp

import android.app.Application
import com.yourcompany.optimizer.core.Optimizer
import com.yourcompany.optimizer.core.OptimizerConfig
import com.yourcompany.optimizer.lifecycle.ActivityTracker
import com.yourcompany.optimizer.network.OptimizerInterceptor
import com.yourcompany.optimizer.memory.MemoryTracker
import com.yourcompany.optimizer.fps.FpsTracker
import com.yourcompany.optimizer.transport.WebSocketServer

class MyApplication : Application() {
    
    override fun onCreate() {
        super.onCreate()
        
        // Initialize Optimizer SDK
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
```

---

## 📝 Step 4: Register Application Class

In your `AndroidManifest.xml`:

```xml
<application
    android:name=".MyApplication"
    android:label="@string/app_name"
    ...>
    
    <!-- Your activities -->
    
</application>
```

---

## 🌐 Step 5: Add Network Interceptor (Optional)

If you use OkHttp for networking:

```kotlin
import okhttp3.OkHttpClient
import com.yourcompany.optimizer.network.OptimizerInterceptor

val client = OkHttpClient.Builder()
    .addInterceptor(OptimizerInterceptor())
    .build()
```

---

## 📊 Step 6: Run Dashboard

In the **Optimizer SDK project** (this project), start the dashboard:

```bash
cd dashboard-web
npm run dev
```

Dashboard will be available at: **http://localhost:3000**

---

## 🎯 What You'll See

Once your app is running with the SDK:

1. **Screen Timings** - Activity/Fragment navigation times
2. **API Calls** - Network requests with timing and status
3. **Memory Usage** - Real-time heap and RAM tracking
4. **FPS Graph** - Frame rate and jank detection
5. **Performance Summary** - Overall health score

---

## 🔄 Updating the SDK

When you make changes to the SDK:

1. Republish to Maven Local:
   ```bash
   ./scripts/publish-local.sh
   ```

2. In your other project, sync Gradle:
   ```bash
   ./gradlew --refresh-dependencies
   ```

---

## 📍 Published Location

Your SDK is installed at:
```
~/.m2/repository/com/yourcompany/optimizer/
```

Modules available:
- `core:1.0.0`
- `lifecycle:1.0.0`
- `network:1.0.0`
- `memory:1.0.0`
- `fps:1.0.0`
- `transport:1.0.0`

---

## 🎉 That's It!

Your SDK is now ready to use in any Android project. Just add the dependencies and initialize in your Application class.

For more details, see:
- `PUBLISHING_GUIDE.md` - Full publishing documentation
- `INTEGRATION_GUIDE.md` - Detailed integration steps
- `docs/API_REFERENCE.md` - Complete API documentation
