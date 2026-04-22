# 🚀 Quick Start: Publish to GitHub

## 3 Simple Steps to Publish Your SDK

### Step 1: Push to GitHub (2 minutes)

```bash
# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - DroidPulse SDK v1.0.0"

# Add your GitHub repository
git remote add origin https://github.com/subhra-io/DroidPulse.git

# Push
git push -u origin main
```

### Step 2: Create Release on GitHub (1 minute)

1. Go to your repo on GitHub
2. Click **Releases** → **Create a new release**
3. Tag: `1.0.0`
4. Title: `v1.0.0 - Initial Release`
5. Click **Publish release**

### Step 3: Use in Your Pehchaan Project (2 minutes)

**In `settings.gradle.kts`:**
```kotlin
repositories {
    maven { url = uri("https://jitpack.io") }
}
```

**In `app/build.gradle`:**
```groovy
implementation 'com.github.subhra-io.DroidPulse:core:1.0.0'
implementation 'com.github.subhra-io.DroidPulse:lifecycle:1.0.0'
implementation 'com.github.subhra-io.DroidPulse:network:1.0.0'
implementation 'com.github.subhra-io.DroidPulse:memory:1.0.0'
implementation 'com.github.subhra-io.DroidPulse:fps:1.0.0'
implementation 'com.github.subhra-io.DroidPulse:transport:1.0.0'
```

**In `PehchaanApplication.kt`:**
```kotlin
if (BuildConfig.DEBUG) {
    Optimizer.init(this, OptimizerConfig(debug = true))
    ActivityTracker(this).start()
    MemoryTracker(this).start()
    FpsTracker().start()
    WebSocketServer.start(port = 8080)
}
```

## ✅ Done!

**No SDK folder needed in your main project!** 🎉

---

## 📊 Run Dashboard

```bash
git clone https://github.com/subhra-io/DroidPulse.git
cd DroidPulse/dashboard-web
npm install
npm run dev
```

Open: http://localhost:3000

---

## 📚 Full Guides

- **Complete Guide**: `GITHUB_JITPACK_GUIDE.md`
- **Integration**: `APP_INTEGRATION_GUIDE.md`
- **Publishing Status**: `GITHUB_PUBLISHING_COMPLETE.md`

---

**That's it! Your SDK is now on GitHub and ready to use! 🚀**
