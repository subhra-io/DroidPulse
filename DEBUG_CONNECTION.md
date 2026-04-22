# 🔍 Debug Dashboard Connection - "Disconnected" Issue

## Problem
Dashboard shows "Disconnected" and no events are coming through.

---

## ✅ Step-by-Step Debugging

### Step 1: Check if App is Running

**In Android Studio → Logcat**, filter by `DroidPulse` and look for:

```
D/DroidPulse: ✅ Performance monitoring initialized
D/DroidPulse: 📊 Dashboard: http://localhost:3000
```

**If you DON'T see these logs:**
- App is not in DEBUG mode
- SDK didn't initialize
- Check `BuildConfig.DEBUG` is true

---

### Step 2: Check WebSocket Server Started

**In Logcat**, look for:

```
I/Optimizer: WebSocket server started on port 8080
I/Optimizer: WebSocket server ready
```

**If you DON'T see this:**

The WebSocket server didn't start. Check:

1. **Is the app running?**
2. **Is it a DEBUG build?** (not release)
3. **Check for errors in Logcat** (filter by `Optimizer` or `WebSocket`)

---

### Step 3: Check Network Permissions

**In `AndroidManifest.xml`**, make sure you have:

```xml
<uses-permission android:name="android.permission.INTERNET" />

<application
    android:usesCleartextTraffic="true"
    ...>
```

**Without `usesCleartextTraffic="true"`**, the WebSocket server won't work on Android 9+.

---

### Step 4: Check Device IP vs Dashboard URL

#### For Physical Device:

**Your device must be on the same WiFi as your Mac.**

1. **Find your Mac's IP:**
   ```bash
   ipconfig getifaddr en0
   # Should show: 192.168.1.9
   ```

2. **Dashboard `.env.local` should have:**
   ```
   NEXT_PUBLIC_WS_URL=ws://192.168.1.9:8080
   ```

3. **Restart dashboard after changing `.env.local`:**
   ```bash
   cd dashboard-web
   npm run dev
   ```

#### For Emulator:

**Change `.env.local` to:**
```
NEXT_PUBLIC_WS_URL=ws://10.0.2.2:8080
```

But wait — the WebSocket server runs **on the device**, not your Mac!

**For emulator, use:**
```
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

And set up **port forwarding**:
```bash
adb forward tcp:8080 tcp:8080
```

---

### Step 5: Check Browser Console

**Open browser console (F12 → Console)** and look for:

```
[DroidPulse] Connecting to ws://192.168.1.9:8080...
```

**If you see:**
```
WebSocket connection failed
Error: Connection refused
```

This means:
- WebSocket server is not running on device
- Device IP is wrong
- Firewall is blocking

---

### Step 6: Test WebSocket Server Manually

**From your Mac terminal:**

```bash
# Test if port 8080 is reachable
nc -zv 192.168.1.9 8080
```

**Expected output:**
```
Connection to 192.168.1.9 port 8080 [tcp/http-alt] succeeded!
```

**If you get "Connection refused":**
- WebSocket server is not running
- Wrong IP address
- Device not on same network

---

## 🔧 Common Issues & Fixes

### Issue 1: "Connection refused"

**Cause:** WebSocket server not running on device

**Fix:**
1. Check Logcat for "WebSocket server started"
2. Make sure app is in DEBUG mode
3. Restart the app

### Issue 2: "Disconnected" but server is running

**Cause:** Wrong IP address in `.env.local`

**Fix:**
1. Get your Mac's IP: `ipconfig getifaddr en0`
2. Update `.env.local` with correct IP
3. Restart dashboard: `npm run dev`

### Issue 3: Works on emulator but not physical device

**Cause:** Device and Mac on different networks

**Fix:**
1. Connect phone to same WiFi as Mac
2. Check WiFi settings on both devices
3. Disable mobile data on phone

### Issue 4: "usesCleartextTraffic" error

**Cause:** Android blocks non-HTTPS connections by default

**Fix:** Add to `AndroidManifest.xml`:
```xml
<application
    android:usesCleartextTraffic="true"
    ...>
```

---

## 📱 For Physical Device - Complete Setup

### 1. Check WiFi Connection

**On your Mac:**
```bash
ipconfig getifaddr en0
# Output: 192.168.1.9
```

**On your phone:**
- Settings → WiFi → Check connected to same network
- Note: Should be same network name as Mac

### 2. Update Dashboard Config

**File:** `dashboard-web/.env.local`
```
NEXT_PUBLIC_WS_URL=ws://192.168.1.9:8080
```

### 3. Add Permissions

**File:** `app/src/main/AndroidManifest.xml`
```xml
<uses-permission android:name="android.permission.INTERNET" />

<application
    android:usesCleartextTraffic="true"
    android:name=".PehchaanApplication"
    ...>
```

### 4. Restart Everything

```bash
# 1. Rebuild app
./gradlew :app:assembleDebug
./gradlew :app:installDebug

# 2. Restart dashboard
cd dashboard-web
npm run dev
```

### 5. Check Logs

**Logcat (filter: DroidPulse):**
```
D/DroidPulse: ✅ Performance monitoring initialized
I/Optimizer: WebSocket server started on port 8080
I/Optimizer: WebSocket server ready
I/Optimizer: Dashboard connected: /192.168.1.9:xxxxx  ← Should see this when browser connects
```

**Browser Console:**
```
[DroidPulse] Connecting to ws://192.168.1.9:8080...
[DroidPulse] ✅ Connected to SDK
```

---

## 🖥️ For Emulator - Complete Setup

### 1. Update Dashboard Config

**File:** `dashboard-web/.env.local`
```
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

### 2. Set Up Port Forwarding

```bash
adb forward tcp:8080 tcp:8080
```

### 3. Restart Dashboard

```bash
cd dashboard-web
npm run dev
```

### 4. Check Connection

**Browser should show:**
```
[DroidPulse] ✅ Connected to SDK
```

---

## 🔍 Quick Diagnostic

Run this in your terminal:

```bash
# Check if device is connected
adb devices

# Check if app is running
adb shell ps | grep pehchaan

# Check if port 8080 is listening on device
adb shell netstat -an | grep 8080

# Forward port (for emulator)
adb forward tcp:8080 tcp:8080

# Test connection from Mac
nc -zv localhost 8080  # For emulator
nc -zv 192.168.1.9 8080  # For physical device
```

---

## ✅ Checklist

- [ ] App is running in DEBUG mode
- [ ] Logcat shows "WebSocket server started"
- [ ] `INTERNET` permission in AndroidManifest
- [ ] `usesCleartextTraffic="true"` in AndroidManifest
- [ ] Device and Mac on same WiFi (physical device)
- [ ] `.env.local` has correct IP address
- [ ] Dashboard restarted after changing `.env.local`
- [ ] Browser console shows connection attempt
- [ ] Port 8080 is not blocked by firewall

---

## 🎯 Most Likely Issues

1. **WebSocket server not starting** → Check Logcat for errors
2. **Wrong IP in `.env.local`** → Update and restart dashboard
3. **Missing `usesCleartextTraffic`** → Add to AndroidManifest
4. **Different WiFi networks** → Connect to same network

---

## 📞 Still Not Working?

Share these logs:

1. **Logcat output** (filter: `DroidPulse` and `Optimizer`)
2. **Browser console output** (F12 → Console)
3. **Output of:** `adb shell netstat -an | grep 8080`
4. **Your `.env.local` content**

This will help identify the exact issue!
