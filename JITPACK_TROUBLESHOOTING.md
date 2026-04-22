# 🔍 JitPack Build Troubleshooting

## Why JitPack Might Be Slow or Failing

### Common Reasons:

1. **Building unnecessary modules** (sample-app, dashboard)
2. **Large dependencies** being downloaded
3. **Multiple Gradle daemons** starting
4. **Android SDK download** (first time)
5. **JitPack server load**

---

## 🚀 Quick Fix: Optimize Build

### Issue: Building Sample App

The `sample-app` is included in `settings.gradle.kts` which JitPack tries to build but doesn't need.

### Solution: Exclude Sample App from JitPack Build

**Option 1: Update `jitpack.yml` (Recommended)**

```yaml
jdk:
  - openjdk17
before_install:
  - sdk install java 17.0.1-open || true
  - sdk use java 17.0.1-open || true
install:
  - ./gradlew :sdk:core:build :sdk:lifecycle:build :sdk:network:build :sdk:memory:build :sdk:fps:build :sdk:transport:build publishToMavenLocal -x test
```

This tells JitPack to only build SDK modules, not the sample app.

**Option 2: Create Separate Settings for JitPack**

Create `settings-jitpack.gradle.kts`:

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
    }
}

rootProject.name = "DroidPulse"

// Only SDK modules for JitPack
include(":sdk:core")
include(":sdk:lifecycle")
include(":sdk:network")
include(":sdk:transport")
include(":sdk:memory")
include(":sdk:fps")
```

Then update `jitpack.yml`:

```yaml
jdk:
  - openjdk17
before_install:
  - sdk install java 17.0.1-open || true
  - sdk use java 17.0.1-open || true
  - mv settings-jitpack.gradle.kts settings.gradle.kts
```

---

## 🔍 Check JitPack Build Status

### 1. View Build Log

Go to: https://jitpack.io/com/github/subhra-io/DroidPulse/1.0.0/build.log

This shows the complete build output.

### 2. Check Build Status

Go to: https://jitpack.io/#subhra-io/DroidPulse

Look for:
- 🟢 Green checkmark = Success
- 🔴 Red X = Failed
- 🟡 Yellow spinner = Building
- ⚪ Gray = Not built yet

### 3. Typical Build Time

- **First build**: 5-15 minutes (downloading Android SDK, dependencies)
- **Rebuild**: 2-5 minutes (cached dependencies)
- **If stuck >20 minutes**: Likely failed, check logs

---

## 🐛 Common JitPack Errors

### Error 1: "Could not find com.android.tools.build:gradle"

**Cause**: Android Gradle Plugin version too new

**Fix**: Use stable version in `build.gradle.kts`:
```kotlin
id("com.android.library") version "8.1.0" apply false
```

### Error 2: "Execution failed for task ':sample-app:...'"

**Cause**: Sample app has issues or missing dependencies

**Fix**: Exclude sample app (see solutions above)

### Error 3: "Could not resolve all dependencies"

**Cause**: Missing repository or dependency

**Fix**: Check all dependencies are available on Maven Central

### Error 4: Timeout

**Cause**: Build taking too long

**Fix**: Optimize build (exclude tests, sample app)

---

## ✅ Recommended Configuration

### File: `jitpack.yml`

```yaml
jdk:
  - openjdk17
before_install:
  - sdk install java 17.0.1-open || true
  - sdk use java 17.0.1-open || true
install:
  - ./gradlew :sdk:core:publishToMavenLocal :sdk:lifecycle:publishToMavenLocal :sdk:network:publishToMavenLocal :sdk:memory:publishToMavenLocal :sdk:fps:publishToMavenLocal :sdk:transport:publishToMavenLocal -x test -x lint --stacktrace
```

This:
- ✅ Only builds SDK modules
- ✅ Skips tests (faster)
- ✅ Skips lint (faster)
- ✅ Shows stacktrace if error
- ✅ Publishes to Maven Local (what JitPack needs)

---

## 🚀 Apply the Fix

### Step 1: Update `jitpack.yml`

```bash
# Edit jitpack.yml with the recommended configuration above
```

### Step 2: Commit and Push

```bash
git add jitpack.yml
git commit -m "Optimize JitPack build - exclude sample app and tests"
git push origin main
```

### Step 3: Rebuild on JitPack

1. Go to: https://jitpack.io/#subhra-io/DroidPulse
2. Delete the failed build (trash icon)
3. Click **Get it** again
4. Wait 5-10 minutes

---

## 📊 Monitor Build Progress

### Check Build Log in Real-Time

```bash
# In browser, open:
https://jitpack.io/com/github/subhra-io/DroidPulse/1.0.0/build.log

# Refresh every 30 seconds to see progress
```

### What to Look For

**Good signs:**
```
✅ Downloading dependencies...
✅ Compiling Kotlin...
✅ Building :sdk:core...
✅ Publishing to Maven Local...
✅ BUILD SUCCESSFUL
```

**Bad signs:**
```
❌ FAILURE: Build failed with an exception
❌ Could not resolve...
❌ Execution failed for task...
❌ BUILD FAILED
```

---

## 🔄 Alternative: Use GitHub Packages Instead

If JitPack continues to have issues, you can use GitHub Packages:

### 1. Create GitHub Token

1. GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select: `write:packages`, `read:packages`
4. Copy token

### 2. Configure Publishing

Add to `sdk/publish.gradle.kts`:

```kotlin
publishing {
    repositories {
        maven {
            name = "GitHubPackages"
            url = uri("https://maven.pkg.github.com/subhra-io/DroidPulse")
            credentials {
                username = System.getenv("GITHUB_ACTOR")
                password = System.getenv("GITHUB_TOKEN")
            }
        }
    }
}
```

### 3. Publish from Local

```bash
export GITHUB_ACTOR=subhra-io
export GITHUB_TOKEN=your_token_here
./gradlew publish
```

### 4. Use in Pehchaan

```kotlin
repositories {
    maven {
        url = uri("https://maven.pkg.github.com/subhra-io/DroidPulse")
        credentials {
            username = "subhra-io"
            password = "your_token_here"
        }
    }
}
```

---

## 💡 Quick Diagnosis

### If JitPack is stuck:

1. **Check build log**: https://jitpack.io/com/github/subhra-io/DroidPulse/1.0.0/build.log
2. **Look for errors**: Search for "FAILED" or "ERROR"
3. **Check last line**: Should show "BUILD SUCCESSFUL" or error
4. **If timeout**: Build is too slow, optimize (exclude sample app)
5. **If error**: Fix the error and push again

---

## 🎯 Most Likely Issue

Based on your configuration, the most likely issue is:

**JitPack is trying to build the sample-app which has dependencies on the SDK modules that aren't published yet.**

**Solution**: Update `jitpack.yml` to only build SDK modules (see recommended configuration above).

---

## 📞 Need Help?

1. **Check build log**: https://jitpack.io/com/github/subhra-io/DroidPulse/1.0.0/build.log
2. **Copy the error** and I can help debug
3. **Try the optimized jitpack.yml** above
4. **Consider GitHub Packages** as alternative

---

## ✅ Summary

**Problem**: JitPack slow or failing  
**Likely Cause**: Building unnecessary modules (sample-app)  
**Solution**: Update `jitpack.yml` to only build SDK modules  
**Expected Time**: 5-10 minutes after fix  

**Next**: Update `jitpack.yml` with the recommended configuration and push!
