# 🌐 Add Network Interceptor to Track API Calls

## What You Need to Add

The **OptimizerInterceptor** tracks all your API calls (timing, status, payload size, etc.) and sends them to the dashboard.

---

## 📝 File to Edit: RetrofitClient.kt

**Location**: `app/src/main/java/in/gov/uidai/pehchaan/RetrofitClient.kt`

### Step 1: Add Import

At the top of the file, add:

```kotlin
import com.yourcompany.optimizer.network.OptimizerInterceptor
```

### Step 2: Add Interceptor to OkHttpClient

Find this code:

```kotlin
private val okHttpClient = OkHttpClient.Builder().apply {
    if(BuildConfig.DEBUG){
        addInterceptor(loggingInterceptor)
    }
}.build()
```

Change to:

```kotlin
private val okHttpClient = OkHttpClient.Builder().apply {
    if(BuildConfig.DEBUG){
        addInterceptor(loggingInterceptor)
        addInterceptor(OptimizerInterceptor())  // ← ADD THIS LINE
    }
}.build()
```

---

## 📄 Complete Updated RetrofitClient.kt

```kotlin
package `in`.gov.uidai.pehchaan

import com.fasterxml.jackson.databind.MapperFeature
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.jackson.JacksonConverterFactory
import com.fasterxml.jackson.dataformat.xml.XmlMapper
import com.fasterxml.jackson.dataformat.xml.JacksonXmlModule
import com.yourcompany.optimizer.network.OptimizerInterceptor  // ← ADD THIS IMPORT

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

## 🔍 If You Have Multiple OkHttpClient Instances

You mentioned you have multiple Retrofit/OkHttp setups. Add the interceptor to **all of them**:

### OpenIdRetrofitClient.kt

```kotlin
import com.yourcompany.optimizer.network.OptimizerInterceptor

private val okHttpClient = OkHttpClient.Builder().apply {
    if(BuildConfig.DEBUG){
        addInterceptor(loggingInterceptor)
        addInterceptor(OptimizerInterceptor())  // ← ADD THIS
    }
    connectTimeout(60, TimeUnit.SECONDS)
    readTimeout(60, TimeUnit.SECONDS)
}.build()
```

### Any ViewModel with OkHttpClient

If you have OkHttpClient in ViewModels (like `ConsentApproveViewModel`, `MainActivityViewModel`), add:

```kotlin
private val client = OkHttpClient.Builder()
    .apply {
        if(BuildConfig.DEBUG){
            addInterceptor(OptimizerInterceptor())  // ← ADD THIS
        }
    }
    .connectTimeout(15, TimeUnit.SECONDS)
    .readTimeout(15, TimeUnit.SECONDS)
    .build()
```

---

## ✅ What This Tracks

Once added, the dashboard will show:

- **URL**: Full API endpoint
- **Method**: GET, POST, PUT, DELETE, etc.
- **Status Code**: 200, 404, 500, etc.
- **Duration**: Request timing in milliseconds
- **Request Size**: Payload size
- **Response Size**: Response body size
- **Timestamp**: When the call was made

---

## 📊 Dashboard View

After adding the interceptor, you'll see in the **API Calls** section:

```
┌─────────────────────────────────────────────────┐
│ API Calls                                       │
├─────────────────────────────────────────────────┤
│ POST /api/auth/login                            │
│ Status: 200 | Duration: 342ms | Size: 1.2 KB   │
│                                                 │
│ GET /api/user/profile                           │
│ Status: 200 | Duration: 156ms | Size: 3.4 KB   │
│                                                 │
│ POST /api/payment/process                       │
│ Status: 201 | Duration: 1234ms | Size: 5.6 KB  │
└─────────────────────────────────────────────────┘
```

---

## 🔍 Verify It's Working

### 1. Check Logcat

After making an API call, you should see:

```
D/DroidPulse: Event received: network {...}
```

### 2. Check Browser Console

```
[DroidPulse] Event received: network {
  type: "network",
  url: "https://api.example.com/endpoint",
  method: "POST",
  statusCode: 200,
  duration: 342,
  ...
}
```

### 3. Check Dashboard

The **API Calls** card should populate with your API requests.

---

## 🎯 Summary

**What to add**: 1 import + 1 line of code

**Where**: `RetrofitClient.kt` (and any other OkHttpClient instances)

**Result**: All API calls tracked and visible in dashboard

---

## 📝 Quick Checklist

- [ ] Add import: `import com.yourcompany.optimizer.network.OptimizerInterceptor`
- [ ] Add interceptor: `addInterceptor(OptimizerInterceptor())`
- [ ] Sync Gradle
- [ ] Build and run app
- [ ] Make an API call
- [ ] Check dashboard for API calls

---

**That's it! Your API calls will now be tracked! 🚀**
