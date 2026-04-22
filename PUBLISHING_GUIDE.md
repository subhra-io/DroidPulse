# 📦 Publishing Guide - Use SDK in Different Projects

## Overview

To use the Optimizer SDK in a **different Android project**, you have 3 options:

1. **Maven Local** (Quick & Easy - for testing)
2. **JitPack** (Easy - for sharing with team)
3. **Maven Central** (Professional - for public release)

---

## Option 1: Maven Local (Recommended for Testing)

### What is Maven Local?
A local repository on your computer where you can publish libraries for testing.

### Step 1: Add Publishing Configuration

Create `sdk/publish.gradle.kts`:

```kotlin
// sdk/publish.gradle.kts
apply(plugin = "maven-publish")

configure<PublishingExtension> {
    publications {
        create<MavenPublication>("release") {
            groupId = "com.yourcompany.optimizer"
            artifactId = project.name
            version = "1.0.0"
            
            afterEvaluate {
                from(components["release"])
            }
        }
    }
}
```

### Step 2: Apply to Each Module

Add to each SDK module's `build.gradle.kts`:

```kotlin
// sdk/core/build.gradle.kts
plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("maven-publish")  // Add this
}

// ... rest of your config

apply(from = "../publish.gradle.kts")
```

### Step 3: Publish to Maven Local

```bash
# Publish all SDK modules
./gradlew publishToMavenLocal

# You should see:
# BUILD SUCCESSFUL
# Published to: ~/.m2/repository/com/yourcompany/optimizer/
```

### Step 4: Use in Different Project

In your **other Android project**:

**1. Add Maven Local to repositories** (`settings.gradle.kts`):
```kotlin
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        mavenLocal()  // Add this
    }
}
```

**2. Add dependencies** (`app/build.gradle.kts`):
```kotlin
dependencies {
    implementation("com.yourcompany.optimizer:core:1.0.0")
    implementation("com.yourcompany.optimizer:lifecycle:1.0.0")
    implementation("com.yourcompany.optimizer:network:1.0.0")
    implementation("com.yourcompany.optimizer:memory:1.0.0")
    implementation("com.yourcompany.optimizer:fps:1.0.0")
    implementation("com.yourcompany.optimizer:transport:1.0.0")
}
```

**3. Use it** (same as before):
```kotlin
class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        
        Optimizer.init(this, OptimizerConfig(debug = true))
        MemoryTracker(this).start()
        FpsTracker().start()
    }
}
```

---

## Option 2: JitPack (Easy Sharing)

### What is JitPack?
A service that builds and publishes your GitHub repository as a Maven dependency.

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/optimizer-sdk.git
git push -u origin main
```

### Step 2: Create a Release

On GitHub:
1. Go to **Releases** → **Create a new release**
2. Tag: `v1.0.0`
3. Title: `Version 1.0.0`
4. Click **Publish release**

### Step 3: Add JitPack Plugin

Add to root `build.gradle.kts`:

```kotlin
plugins {
    id("com.android.application") version "8.3.0" apply false
    id("com.android.library") version "8.3.0" apply false
    id("org.jetbrains.kotlin.android") version "1.9.22" apply false
    id("com.github.dcendents.android-maven") version "2.1" apply false  // Add this
}
```

### Step 4: Use in Different Project

In your **other Android project**:

**1. Add JitPack repository** (`settings.gradle.kts`):
```kotlin
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://jitpack.io") }  // Add this
    }
}
```

**2. Add dependency** (`app/build.gradle.kts`):
```kotlin
dependencies {
    implementation("com.github.yourusername:optimizer-sdk:v1.0.0")
}
```

---

## Option 3: Maven Central (Professional)

### What is Maven Central?
The official public repository for Java/Kotlin libraries (like AndroidX, Retrofit, etc.)

### Requirements:
- Sonatype account
- GPG key for signing
- Domain ownership (or use io.github.username)

### Step 1: Create Sonatype Account

1. Go to https://issues.sonatype.org
2. Create account
3. Create a ticket for new project
4. Wait for approval (~2 business days)

### Step 2: Generate GPG Key

```bash
# Generate key
gpg --gen-key

# List keys
gpg --list-keys

# Export public key
gpg --keyserver keyserver.ubuntu.com --send-keys YOUR_KEY_ID
```

### Step 3: Add Publishing Configuration

Create `gradle.properties`:
```properties
signing.keyId=YOUR_KEY_ID
signing.password=YOUR_PASSWORD
signing.secretKeyRingFile=/path/to/.gnupg/secring.gpg

ossrhUsername=YOUR_SONATYPE_USERNAME
ossrhPassword=YOUR_SONATYPE_PASSWORD
```

### Step 4: Configure Publishing

Add to root `build.gradle.kts`:
```kotlin
plugins {
    id("io.github.gradle-nexus.publish-plugin") version "1.3.0"
}

nexusPublishing {
    repositories {
        sonatype {
            nexusUrl.set(uri("https://s01.oss.sonatype.org/service/local/"))
            snapshotRepositoryUrl.set(uri("https://s01.oss.sonatype.org/content/repositories/snapshots/"))
        }
    }
}
```

### Step 5: Publish

```bash
./gradlew publishToSonatype closeAndReleaseSonatypeStagingRepository
```

### Step 6: Use in Different Project

After ~2 hours (sync time):

```kotlin
dependencies {
    implementation("com.yourcompany.optimizer:core:1.0.0")
}
```

---

## Quick Comparison

| Method | Difficulty | Sharing | Best For |
|--------|-----------|---------|----------|
| **Maven Local** | ⭐ Easy | Local only | Testing, development |
| **JitPack** | ⭐⭐ Medium | Public/Private repos | Teams, open source |
| **Maven Central** | ⭐⭐⭐⭐⭐ Hard | Public | Professional libraries |

---

## Recommended Approach

### For Your Use Case:

**Start with Maven Local** (Option 1):

```bash
# 1. Publish SDK
cd /path/to/optimizer-sdk
./gradlew publishToMavenLocal

# 2. Use in your other project
# Just add mavenLocal() to repositories
# Add implementation("com.yourcompany.optimizer:core:1.0.0")
```

**Advantages**:
- ✅ Works immediately
- ✅ No internet required
- ✅ Easy to update
- ✅ Perfect for testing

**Disadvantages**:
- ❌ Only works on your computer
- ❌ Need to republish after changes

---

## Complete Maven Local Setup

### In SDK Project (This Project)

**1. Create `sdk/publish.gradle.kts`:**

```kotlin
apply(plugin = "maven-publish")

configure<PublishingExtension> {
    publications {
        create<MavenPublication>("release") {
            groupId = "com.yourcompany.optimizer"
            artifactId = project.name
            version = "1.0.0"
            
            afterEvaluate {
                from(components["release"])
            }
        }
    }
}
```

**2. Update each module's `build.gradle.kts`:**

```kotlin
// sdk/core/build.gradle.kts
plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("maven-publish")
}

// ... existing config ...

publishing {
    publications {
        create<MavenPublication>("release") {
            groupId = "com.yourcompany.optimizer"
            artifactId = "core"
            version = "1.0.0"
            
            afterEvaluate {
                from(components["release"])
            }
        }
    }
}
```

**3. Publish:**

```bash
./gradlew publishToMavenLocal
```

### In Your Other Project

**1. Update `settings.gradle.kts`:**

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
        mavenLocal()  // Add this line
    }
}

rootProject.name = "MyOtherApp"
include(":app")
```

**2. Update `app/build.gradle.kts`:**

```kotlin
dependencies {
    // Optimizer SDK from Maven Local
    implementation("com.yourcompany.optimizer:core:1.0.0")
    implementation("com.yourcompany.optimizer:lifecycle:1.0.0")
    implementation("com.yourcompany.optimizer:network:1.0.0")
    implementation("com.yourcompany.optimizer:memory:1.0.0")
    implementation("com.yourcompany.optimizer:fps:1.0.0")
    implementation("com.yourcompany.optimizer:transport:1.0.0")
    
    // Your other dependencies
    implementation("androidx.core:core-ktx:1.12.0")
    // ...
}
```

**3. Create Application class:**

```kotlin
// app/src/main/java/com/myapp/MyApplication.kt
package com.myapp

import android.app.Application
import com.yourcompany.optimizer.core.Optimizer
import com.yourcompany.optimizer.core.OptimizerConfig
import com.yourcompany.optimizer.lifecycle.ActivityTracker
import com.yourcompany.optimizer.memory.MemoryTracker
import com.yourcompany.optimizer.fps.FpsTracker
import com.yourcompany.optimizer.transport.LocalServer

class MyApplication : Application() {
    
    override fun onCreate() {
        super.onCreate()
        
        Optimizer.init(this, OptimizerConfig(debug = true))
        ActivityTracker()
        MemoryTracker(this).start()
        FpsTracker().start()
        LocalServer.start(8080)
    }
}
```

**4. Update `AndroidManifest.xml`:**

```xml
<application
    android:name=".MyApplication"
    ...>
```

**5. Sync & Build:**

```bash
# In your other project
./gradlew build
```

---

## Troubleshooting

### Issue: "Could not find com.yourcompany.optimizer:core:1.0.0"

**Solution 1**: Check Maven Local
```bash
ls ~/.m2/repository/com/yourcompany/optimizer/
```

**Solution 2**: Republish
```bash
cd /path/to/optimizer-sdk
./gradlew clean publishToMavenLocal
```

**Solution 3**: Check group ID matches
```kotlin
// Must match in both projects
groupId = "com.yourcompany.optimizer"
```

### Issue: "Duplicate class found"

**Solution**: Check you're not including the SDK twice
```kotlin
// Remove any project() references if using Maven
// ❌ implementation(project(":sdk:core"))
// ✅ implementation("com.yourcompany.optimizer:core:1.0.0")
```

---

## Quick Commands Reference

### Publishing SDK

```bash
# Navigate to SDK project
cd /path/to/optimizer-sdk

# Clean build
./gradlew clean

# Publish to Maven Local
./gradlew publishToMavenLocal

# Verify
ls ~/.m2/repository/com/yourcompany/optimizer/
```

### Using in Other Project

```bash
# Navigate to your project
cd /path/to/my-other-app

# Sync Gradle
./gradlew --refresh-dependencies

# Build
./gradlew build

# Install
./gradlew installDebug
```

---

## File Locations

### Maven Local Repository

**macOS/Linux**:
```
~/.m2/repository/com/yourcompany/optimizer/
├── core/
│   └── 1.0.0/
│       ├── core-1.0.0.aar
│       └── core-1.0.0.pom
├── lifecycle/
├── network/
├── memory/
├── fps/
└── transport/
```

**Windows**:
```
C:\Users\YourName\.m2\repository\com\yourcompany\optimizer\
```

---

## Best Practices

### 1. Version Management

Use semantic versioning:
```kotlin
version = "1.0.0"  // Major.Minor.Patch
```

Update version when:
- **Major**: Breaking changes
- **Minor**: New features
- **Patch**: Bug fixes

### 2. Keep Dashboard Separate

The dashboard is a web app, not part of the SDK:
```bash
# SDK: Publish to Maven
./gradlew publishToMavenLocal

# Dashboard: Run separately
cd dashboard-web
npm run dev
```

### 3. Documentation

Include in your other project's README:
```markdown
## Performance Monitoring

This app uses Optimizer SDK for performance monitoring.

### Setup Dashboard
1. Clone SDK repo
2. Run: `cd dashboard-web && npm run dev`
3. Open: http://localhost:3000
```

---

## Summary

**To use SDK in a different project:**

1. **Publish SDK** (one time):
   ```bash
   cd optimizer-sdk
   ./gradlew publishToMavenLocal
   ```

2. **Add to other project**:
   - Add `mavenLocal()` to repositories
   - Add `implementation("com.yourcompany.optimizer:core:1.0.0")`
   - Create Application class with SDK init
   - Register in manifest

3. **Run dashboard** (when needed):
   ```bash
   cd optimizer-sdk/dashboard-web
   npm run dev
   ```

**That's it! Your SDK is now reusable across all your Android projects! 🎉**
