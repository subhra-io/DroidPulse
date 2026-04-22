# 🚀 Ready to Publish DroidPulse!

## Your Repository: https://github.com/subhra-io/DroidPulse

---

## ✅ Step 1: Push to GitHub (Copy & Paste)

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - DroidPulse SDK v1.0.0"

# Add your GitHub repository
git remote add origin https://github.com/subhra-io/DroidPulse.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## ✅ Step 2: Create Release on GitHub

1. Go to: https://github.com/subhra-io/DroidPulse
2. Click **Releases** → **Create a new release**
3. Click **Choose a tag** → Type `1.0.0` → **Create new tag**
4. **Release title**: `v1.0.0 - Initial Release`
5. **Description**: Copy this:

```markdown
## 🚀 DroidPulse v1.0.0

Android Performance Monitoring SDK with Real-time Dashboard

### ✨ Features
- 📱 Activity/Fragment lifecycle tracking
- 🌐 Network monitoring (OkHttp interceptor)
- 💾 Memory tracking (heap + RAM)
- 📊 FPS monitoring and jank detection
- 🎯 Real-time dashboard with WebSocket
- ⚡ Low overhead (<1% performance impact)
- 🔒 Debug-only (zero production impact)

### 📦 Installation

Add to your `settings.gradle.kts`:
```kotlin
maven { url = uri("https://jitpack.io") }
```

Add to your `app/build.gradle`:
```groovy
implementation 'com.github.subhra-io.DroidPulse:core:1.0.0'
implementation 'com.github.subhra-io.DroidPulse:lifecycle:1.0.0'
implementation 'com.github.subhra-io.DroidPulse:network:1.0.0'
implementation 'com.github.subhra-io.DroidPulse:memory:1.0.0'
implementation 'com.github.subhra-io.DroidPulse:fps:1.0.0'
implementation 'com.github.subhra-io.DroidPulse:transport:1.0.0'
```

### 📖 Documentation
See [README.md](README.md) for complete setup instructions.

### 📊 Dashboard
```bash
cd dashboard-web
npm install
npm run dev
```
Open http://localhost:3000
```

6. Click **Publish release**

---

## ✅ Step 3: Verify on JitPack

1. Go to: https://jitpack.io
2. Enter: `subhra-io/DroidPulse`
3. Click **Look up**
4. Find version `1.0.0`
5. Click **Get it**
6. Wait for green checkmark ✅

---

## ✅ Step 4: Use in Your Pehchaan Project

### In `settings.gradle.kts`:
```kotlin
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://jitpack.io") }  // ← Add this
    }
}
```

### In `app/build.gradle`:
```groovy
dependencies {
    // DroidPulse SDK
    implementation 'com.github.subhra-io.DroidPulse:core:1.0.0'
    implementation 'com.github.subhra-io.DroidPulse:lifecycle:1.0.0'
    implementation 'com.github.subhra-io.DroidPulse:network:1.0.0'
    implementation 'com.github.subhra-io.DroidPulse:memory:1.0.0'
    implementation 'com.github.subhra-io.DroidPulse:fps:1.0.0'
    implementation 'com.github.subhra-io.DroidPulse:transport:1.0.0'
    
    // Your existing dependencies...
}
```

### In `PehchaanApplication.kt`:
```kotlin
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
        
        if (BuildConfig.DEBUG) {
            initializeDroidPulse()
        }
        
        // Your existing code...
    }
    
    private fun initializeDroidPulse() {
        Optimizer.init(this, OptimizerConfig(debug = true))
        ActivityTracker(this).start()
        MemoryTracker(this).start()
        FpsTracker().start()
        WebSocketServer.start(port = 8080)
    }
}
```

### In `RetrofitClient.kt`:
```kotlin
import com.yourcompany.optimizer.network.OptimizerInterceptor

private val okHttpClient = OkHttpClient.Builder().apply {
    if(BuildConfig.DEBUG){
        addInterceptor(loggingInterceptor)
        addInterceptor(OptimizerInterceptor())  // ← Add this
    }
}.build()
```

### Sync and Build:
```bash
./gradlew --refresh-dependencies
./gradlew :app:assembleDebug
```

---

## ✅ Step 5: Run Dashboard

```bash
# Clone DroidPulse repo (only for dashboard)
git clone https://github.com/subhra-io/DroidPulse.git
cd DroidPulse/dashboard-web

# Install and run
npm install
npm run dev
```

Dashboard at: **http://localhost:3000**

---

## 🎉 Done!

Your DroidPulse SDK is now:
- ✅ Published on GitHub
- ✅ Available via JitPack
- ✅ Ready to use in any project
- ✅ No SDK folder needed in your main project!

---

## 📊 What You'll See

Once your Pehchaan app is running:

### In Logs:
```
D/OptimizerSDK: ✅ Performance monitoring initialized
D/OptimizerSDK: 📊 Dashboard: http://localhost:3000
D/OptimizerSDK: WebSocketServer started on port 8080
```

### In Dashboard (http://localhost:3000):
- 🟢 Connection Status: Connected
- 📱 Screen navigation timings
- 🌐 API calls with timing
- 💾 Memory usage graphs
- 📊 FPS monitoring
- ⚡ Performance health score

---

## 🔄 Future Updates

When you update DroidPulse:

```bash
# 1. Make changes, commit, push
git add .
git commit -m "Add new feature"
git push

# 2. Create new release on GitHub (tag: 1.0.1)

# 3. In Pehchaan project, update version
implementation 'com.github.subhra-io.DroidPulse:core:1.0.1'
```

---

## 📚 Documentation

- **This File**: Quick publish guide
- **README.md**: Complete SDK documentation
- **GITHUB_JITPACK_GUIDE.md**: Detailed publishing guide
- **APP_INTEGRATION_GUIDE.md**: Integration for Pehchaan app

---

## 🚀 Start Now!

Copy the commands from **Step 1** above and paste into your terminal!

**Repository**: https://github.com/subhra-io/DroidPulse  
**JitPack**: https://jitpack.io/#subhra-io/DroidPulse
