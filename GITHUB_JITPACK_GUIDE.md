# 🚀 Publishing to GitHub + JitPack

## Why GitHub + JitPack?

✅ **No SDK folder needed in your main project**  
✅ **Easy to share with team**  
✅ **Automatic versioning with Git tags**  
✅ **Free for public and private repos**  
✅ **No complex setup like Maven Central**

---

## 📋 Step-by-Step Guide

### Step 1: Prepare Your Repository

The SDK is already configured! Just need to add JitPack support.

**Add to root `build.gradle.kts`:**

```kotlin
plugins {
    id("com.android.application") version "8.3.0" apply false
    id("com.android.library") version "8.3.0" apply false
    id("org.jetbrains.kotlin.android") version "1.9.22" apply false
    id("maven-publish") apply false  // Add this
}
```

**Create `jitpack.yml` in root:**

```yaml
jdk:
  - openjdk17
before_install:
  - sdk install java 17.0.1-open
  - sdk use java 17.0.1-open
```

---

### Step 2: Push to GitHub

```bash
# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Optimizer SDK v1.0.0"

# Create GitHub repo (on github.com)
# Then add remote
git remote add origin https://github.com/YOUR_USERNAME/optimizer-sdk.git

# Push
git push -u origin main
```

---

### Step 3: Create a Release on GitHub

1. Go to your GitHub repository
2. Click **Releases** → **Create a new release**
3. Click **Choose a tag** → Type `1.0.0` → **Create new tag**
4. **Release title**: `v1.0.0 - Initial Release`
5. **Description**:
   ```markdown
   ## Optimizer SDK v1.0.0
   
   Android Performance Monitoring SDK
   
   ### Features
   - ✅ Activity/Fragment lifecycle tracking
   - ✅ Network monitoring (OkHttp interceptor)
   - ✅ Memory tracking (heap + RAM)
   - ✅ FPS monitoring and jank detection
   - ✅ Real-time dashboard
   - ✅ WebSocket transport
   
   ### Installation
   See README.md for integration instructions.
   ```
6. Click **Publish release**

---

### Step 4: Verify on JitPack

1. Go to https://jitpack.io
2. Enter your repo: `YOUR_USERNAME/optimizer-sdk`
3. Click **Look up**
4. Find version `1.0.0` and click **Get it**
5. Wait for build to complete (green checkmark ✅)

---

### Step 5: Use in Your Pehchaan Project

Now you can use the SDK **without copying any folders**!

#### In your Pehchaan project's `settings.gradle.kts`:

```kotlin
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://jitpack.io") }  // Add this
    }
}
```

#### In your `app/build.gradle`:

```groovy
dependencies {
    // Optimizer SDK from JitPack
    implementation 'com.github.YOUR_USERNAME.optimizer-sdk:core:1.0.0'
    implementation 'com.github.YOUR_USERNAME.optimizer-sdk:lifecycle:1.0.0'
    implementation 'com.github.YOUR_USERNAME.optimizer-sdk:network:1.0.0'
    implementation 'com.github.YOUR_USERNAME.optimizer-sdk:memory:1.0.0'
    implementation 'com.github.YOUR_USERNAME.optimizer-sdk:fps:1.0.0'
    implementation 'com.github.YOUR_USERNAME.optimizer-sdk:transport:1.0.0'
    
    // Your existing dependencies...
}
```

#### In your `PehchaanApplication.kt`:

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
            initializeOptimizerSDK()
        }
        
        // Your existing code...
    }
    
    private fun initializeOptimizerSDK() {
        Optimizer.init(this, OptimizerConfig(debug = true))
        ActivityTracker(this).start()
        MemoryTracker(this).start()
        FpsTracker().start()
        WebSocketServer.start(port = 8080)
    }
}
```

---

### Step 6: Sync and Build

```bash
# In your Pehchaan project
./gradlew --refresh-dependencies
./gradlew :app:assembleDebug
```

---

## 🎯 Benefits

### ✅ No SDK Folder in Your Project
Your Pehchaan project stays clean:
```
your-pehchaan-project/
├── app/
├── registration/
├── utility/
└── network/
# No sdk/ folder needed! ✨
```

### ✅ Easy Updates
When SDK is updated:
```groovy
// Just change version number
implementation 'com.github.YOUR_USERNAME.optimizer-sdk:core:1.0.1'
```

### ✅ Team Sharing
Anyone on your team can use it:
```bash
# They just need to add JitPack repo
# No need to copy SDK files
```

### ✅ Version Control
```bash
# Use specific versions
implementation 'com.github.YOUR_USERNAME.optimizer-sdk:core:1.0.0'

# Or use latest
implementation 'com.github.YOUR_USERNAME.optimizer-sdk:core:main-SNAPSHOT'
```

---

## 🔄 Updating the SDK

### When you make changes to SDK:

```bash
# 1. Commit changes
git add .
git commit -m "Add new feature"
git push

# 2. Create new release on GitHub
# Tag: 1.0.1
# Title: v1.0.1 - Bug fixes

# 3. In your Pehchaan project, update version
implementation 'com.github.YOUR_USERNAME.optimizer-sdk:core:1.0.1'

# 4. Sync
./gradlew --refresh-dependencies
```

---

## 📊 Dashboard Setup

The dashboard is **separate** from the SDK:

### Option 1: Run Locally (Development)

```bash
# Clone SDK repo (only for dashboard)
git clone https://github.com/YOUR_USERNAME/optimizer-sdk.git
cd optimizer-sdk/dashboard-web
npm install
npm run dev
```

Dashboard at: http://localhost:3000

### Option 2: Deploy Dashboard (Production)

Deploy to Vercel/Netlify:

```bash
cd dashboard-web

# Deploy to Vercel
vercel deploy

# Or Netlify
netlify deploy
```

Then your team can access: `https://your-dashboard.vercel.app`

---

## 🔐 Private Repository

If your repo is private:

### Step 1: Generate GitHub Token

1. GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select scope: `repo` (Full control)
4. Copy token

### Step 2: Add to Gradle

In your Pehchaan project's `gradle.properties`:

```properties
# Add to ~/.gradle/gradle.properties (NOT in project)
gpr.user=YOUR_GITHUB_USERNAME
gpr.token=YOUR_GITHUB_TOKEN
```

### Step 3: Configure Repository

In `settings.gradle.kts`:

```kotlin
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven {
            url = uri("https://jitpack.io")
            credentials {
                username = providers.gradleProperty("gpr.user").get()
                password = providers.gradleProperty("gpr.token").get()
            }
        }
    }
}
```

---

## 📝 Complete Example

### Your Pehchaan Project Structure

```
pehchaan-app/
├── app/
│   ├── build.gradle          # Add SDK dependencies here
│   └── src/
│       └── main/
│           └── java/
│               └── PehchaanApplication.kt  # Initialize SDK here
├── registration/
├── utility/
├── network/
├── settings.gradle.kts       # Add JitPack repo here
└── build.gradle.kts
```

### settings.gradle.kts

```kotlin
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://jitpack.io") }  // ← Add this
    }
}

rootProject.name = "Pehchaan"
include(":app")
include(":registration")
include(":utility")
include(":network")
include(":analytics")
include(":capture")
include(":opencv")
include(":embedding")
```

### app/build.gradle

```groovy
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    // ... your existing plugins
}

dependencies {
    // Optimizer SDK from JitPack ← Add these
    implementation 'com.github.YOUR_USERNAME.optimizer-sdk:core:1.0.0'
    implementation 'com.github.YOUR_USERNAME.optimizer-sdk:lifecycle:1.0.0'
    implementation 'com.github.YOUR_USERNAME.optimizer-sdk:network:1.0.0'
    implementation 'com.github.YOUR_USERNAME.optimizer-sdk:memory:1.0.0'
    implementation 'com.github.YOUR_USERNAME.optimizer-sdk:fps:1.0.0'
    implementation 'com.github.YOUR_USERNAME.optimizer-sdk:transport:1.0.0'
    
    // Your existing dependencies
    implementation libs.androidx.core.ktx
    implementation libs.androidx.appcompat
    // ...
}
```

---

## 🎉 Summary

### What You Need to Do:

1. **Push SDK to GitHub** (one time)
   ```bash
   git push origin main
   ```

2. **Create Release** (one time)
   - Tag: `1.0.0`
   - Publish on GitHub

3. **In Your Pehchaan Project** (one time setup)
   - Add JitPack to repositories
   - Add SDK dependencies
   - Initialize in Application class

4. **That's It!** 🎉
   - No SDK folder in your project
   - Easy to update
   - Easy to share with team

---

## 🆚 Comparison

| Method | SDK in Project? | Internet Required? | Team Sharing |
|--------|----------------|-------------------|--------------|
| **Copy SDK folder** | ❌ Yes (messy) | ❌ No | ❌ Hard |
| **Maven Local** | ✅ No | ❌ No | ❌ Hard |
| **GitHub + JitPack** | ✅ No | ✅ Yes | ✅ Easy |

---

## 🚀 Next Steps

1. ✅ Push this SDK to GitHub
2. ✅ Create release (tag: 1.0.0)
3. ✅ Add JitPack to your Pehchaan project
4. ✅ Add dependencies
5. ✅ Initialize SDK
6. ✅ Run and monitor!

**No SDK folder needed in your main project! 🎉**

---

## 📞 Need Help?

- **JitPack Build Failed?** Check `jitpack.yml` configuration
- **Dependency Not Found?** Verify release tag matches version
- **Build Errors?** Check JitPack build log at jitpack.io

---

## 📚 Resources

- JitPack: https://jitpack.io
- GitHub Releases: https://docs.github.com/en/repositories/releasing-projects-on-github
- SDK Documentation: See `README.md`
