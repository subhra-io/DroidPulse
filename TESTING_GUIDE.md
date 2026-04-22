# 📱 Testing Guide - Real Device Testing

## Prerequisites

### 1. Android Device or Emulator
You need one of the following:
- **Physical Android device** (Android 7.0+ / API 24+)
- **Android Emulator** (via Android Studio)

### 2. Enable Developer Options (Physical Device)
1. Go to **Settings** → **About Phone**
2. Tap **Build Number** 7 times
3. Go back to **Settings** → **Developer Options**
4. Enable **USB Debugging**
5. Connect device via USB

### 3. Verify Connection
```bash
# Check if device is connected
adb devices

# You should see:
# List of devices attached
# ABC123XYZ    device
```

## 🚀 Step-by-Step Testing

### Step 1: Ensure Dashboard is Running

```bash
# Check if dashboard is running
curl http://localhost:3000

# If not running, start it:
cd dashboard-web
npm run dev

# Dashboard will be at: http://localhost:3000
```

### Step 2: Build & Install the App

```bash
# Build the APK
./gradlew :sample-app:ecommerce-demo:assembleDebug

# Install on connected device
./gradlew :sample-app:ecommerce-demo:installDebug

# Or install manually
adb install -r sample-app/ecommerce-demo/build/outputs/apk/debug/ecommerce-demo-debug.apk
```

### Step 3: Launch the App

```bash
# Launch the app
adb shell am start -n com.yourcompany.optimizer.demo.ecommerce/.MainActivity

# Or launch manually from device home screen
```

### Step 4: Open Dashboard

```bash
# Open dashboard in browser
open http://localhost:3000

# Or manually navigate to: http://localhost:3000
```

### Step 5: Watch Live Data!

You should now see:
1. **Connection Status**: Changes to "Connected" (green dot)
2. **Performance Summary**: Shows overall health
3. **Memory Graph**: Updates every 2 seconds
4. **FPS Graph**: Updates every 1 second
5. **Screen Timings**: Shows MainActivity timing
6. **Event Stream**: Shows all events in real-time

## 🎯 What to Test

### Test 1: Screen Navigation
**Goal**: Verify lifecycle tracking

1. **Navigate between screens** in the app
2. **Watch Dashboard**:
   - Screen Timings panel shows each screen
   - Duration for each screen load
   - Event stream shows lifecycle events

**Expected Results**:
```
Screen Timings:
- MainActivity: 234ms
- ProductListActivity: 189ms
- ProductDetailActivity: 156ms
```

### Test 2: Memory Tracking
**Goal**: Verify memory monitoring

1. **Navigate between screens** multiple times
2. **Watch Memory Graph**:
   - Blue line shows used memory
   - Purple line shows heap usage
   - Percentage updates in real-time

**Expected Results**:
```
Memory Usage: 17.5%
45MB / 256MB
Heap: 32MB

Graph shows:
- Smooth line trending upward slightly
- No sudden spikes
- Updates every 2 seconds
```

### Test 3: FPS Monitoring
**Goal**: Verify frame rate tracking

1. **Scroll or animate** in the app
2. **Watch FPS Graph**:
   - Green line shows FPS
   - Should stay near 60 FPS
   - Reference lines at 60 and 30 FPS

**Expected Results**:
```
Current FPS: 60.0
Jank: 0 | Dropped: 0

Graph shows:
- Stable line near 60 FPS
- Green color (good performance)
- Minimal jank
```

### Test 4: Performance Summary
**Goal**: Verify overall health indicator

1. **Use the app normally**
2. **Watch Performance Summary**:
   - Overall health status
   - Memory usage percentage
   - Current FPS
   - API calls count
   - Screens viewed

**Expected Results**:
```
Overall Health: Excellent ✓

Memory: 17%
FPS: 60
API Calls: 0
Screens: 3
```

### Test 5: Event Stream
**Goal**: Verify all events are captured

1. **Perform various actions** in the app
2. **Watch Event Stream**:
   - Shows last 10 events
   - Different event types (lifecycle, memory, fps)
   - Timestamps

**Expected Results**:
```
Event Stream:
- memory - 12:34:56
- fps - 12:34:56
- lifecycle - 12:34:55
- memory - 12:34:54
```

## 🔍 Monitoring with Logcat

### View All Optimizer Logs
```bash
adb logcat | grep Optimizer
```

**You should see**:
```
Optimizer: Initializing Optimizer SDK v1.0.0
Optimizer: Starting memory tracker (interval: 2000ms)
Optimizer: Starting FPS tracker (report interval: 1000ms)
Optimizer: WebSocket server started on port 8080
Optimizer: Activity MainActivity resumed in 234ms
Optimizer: Memory: 45MB / 256MB (17%)
Optimizer: FPS: 60 (EXCELLENT) - Jank: 0, Dropped: 0
```

### View Memory Events Only
```bash
adb logcat | grep "Memory:"
```

### View FPS Events Only
```bash
adb logcat | grep "FPS:"
```

### View WebSocket Events
```bash
adb logcat | grep "WebSocket"
```

## 🐛 Troubleshooting

### Issue: Dashboard Shows "Disconnected"

**Possible Causes**:
1. App not running on device
2. WebSocket server not started
3. Port 8080 blocked

**Solutions**:
```bash
# Check if app is running
adb shell ps | grep optimizer

# Check WebSocket server logs
adb logcat | grep "WebSocket server"

# Restart app
adb shell am force-stop com.yourcompany.optimizer.demo.ecommerce
adb shell am start -n com.yourcompany.optimizer.demo.ecommerce/.MainActivity
```

### Issue: No Events Showing

**Possible Causes**:
1. Trackers not initialized
2. Events not being dispatched
3. WebSocket connection issue

**Solutions**:
```bash
# Check initialization logs
adb logcat | grep "Initializing Optimizer"

# Check tracker logs
adb logcat | grep "Starting.*tracker"

# Check event dispatch
adb logcat | grep "dispatch"
```

### Issue: Memory Graph Not Updating

**Possible Causes**:
1. MemoryTracker not started
2. Events not reaching dashboard

**Solutions**:
```bash
# Check memory tracker
adb logcat | grep "memory tracker"

# Check memory events
adb logcat | grep "Memory:"

# Verify events are being sent
adb logcat | grep "memory.*event"
```

### Issue: FPS Graph Not Updating

**Possible Causes**:
1. FpsTracker not started
2. Choreographer not hooked

**Solutions**:
```bash
# Check FPS tracker
adb logcat | grep "FPS tracker"

# Check FPS events
adb logcat | grep "FPS:"

# Verify Choreographer
adb logcat | grep "Choreographer"
```

### Issue: App Crashes on Launch

**Possible Causes**:
1. Missing dependencies
2. Initialization error
3. Permission issue

**Solutions**:
```bash
# View crash logs
adb logcat | grep "AndroidRuntime"

# Check for exceptions
adb logcat | grep "Exception"

# Reinstall app
./gradlew :sample-app:ecommerce-demo:uninstallDebug
./gradlew :sample-app:ecommerce-demo:installDebug
```

## 📊 Expected Performance

### Memory Tracking
- **Update Frequency**: Every 2 seconds
- **Accuracy**: ±1MB
- **Overhead**: <0.5% CPU
- **Typical Values**: 15-25% usage for demo app

### FPS Tracking
- **Update Frequency**: Every 1 second
- **Accuracy**: ±0.1 FPS
- **Overhead**: <0.3% CPU
- **Typical Values**: 58-60 FPS on modern devices

### Dashboard
- **Connection Latency**: <100ms
- **Update Latency**: <100ms
- **Chart Rendering**: 60 FPS
- **Memory Usage**: ~50MB

## 🎨 What You Should See

### Dashboard Layout
```
┌─────────────────────────────────────────────────────────────┐
│  Optimizer Dashboard                    ● Connected         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────────────────────────┐   │
│  │ Performance  │  │   Memory Usage                   │   │
│  │ Summary      │  │   [Real-time chart showing       │   │
│  │              │  │    memory usage over time]       │   │
│  │ Health: Good │  │   17.5% (45MB / 256MB)          │   │
│  │              │  │                                  │   │
│  │ Memory: 17%  │  └──────────────────────────────────┘   │
│  │ FPS: 60      │                                          │
│  │ API: 0       │  ┌──────────────┐  ┌──────────────┐    │
│  │ Screens: 3   │  │ FPS Monitor  │  │ Screen Times │    │
│  └──────────────┘  │ [Chart]      │  │ MainActivity │    │
│                    │ 60 FPS ✓     │  │ 234ms        │    │
│  ┌──────────────┐  └──────────────┘  └──────────────┘    │
│  │ API Calls    │  ┌──────────────┐                       │
│  │ (empty)      │  │ Event Stream │                       │
│  └──────────────┘  │ memory 12:34 │                       │
│                    │ fps 12:34    │                       │
│                    └──────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

### Logcat Output
```
I/Optimizer: Initializing Optimizer SDK v1.0.0
I/Optimizer: Starting memory tracker (interval: 2000ms)
I/Optimizer: Starting FPS tracker (report interval: 1000ms)
I/Optimizer: WebSocket server started on port 8080
I/Optimizer: Activity MainActivity resumed in 234ms
D/Optimizer: Memory: 45MB / 256MB (17%)
D/Optimizer: FPS: 60 (EXCELLENT) - Jank: 0, Dropped: 0
I/Optimizer: Dashboard connected: /127.0.0.1:54321
```

## 🎯 Success Criteria

Your test is successful if you see:

- ✅ Dashboard shows "Connected" status
- ✅ Memory graph updates every 2 seconds
- ✅ FPS graph updates every 1 second
- ✅ Performance summary shows health status
- ✅ Screen timings appear when navigating
- ✅ Event stream shows all events
- ✅ No crashes or errors in logcat
- ✅ Smooth app performance (60 FPS)

## 📱 Testing on Different Devices

### Low-End Device (2GB RAM)
**Expected**:
- Memory usage: 20-30%
- FPS: 45-60
- Device class: LOW_END or MID_RANGE

### Mid-Range Device (4GB RAM)
**Expected**:
- Memory usage: 15-20%
- FPS: 55-60
- Device class: MID_RANGE

### High-End Device (8GB+ RAM)
**Expected**:
- Memory usage: 10-15%
- FPS: 60
- Device class: HIGH_END

## 🔥 Advanced Testing

### Stress Test Memory
```bash
# Navigate rapidly between screens
# Watch memory graph for spikes
# Check for memory leaks
```

### Stress Test FPS
```bash
# Perform heavy animations
# Scroll rapidly
# Watch for frame drops
```

### Test Network Monitoring
```bash
# Add API calls to the app
# Watch API Calls panel
# Verify timing and status codes
```

## 📞 Quick Commands Reference

```bash
# Device management
adb devices                    # List devices
adb shell                      # Open shell

# App management
./gradlew installDebug         # Install app
adb shell am start -n ...      # Launch app
adb shell am force-stop ...    # Stop app
adb uninstall ...              # Uninstall app

# Logging
adb logcat                     # All logs
adb logcat | grep Optimizer    # SDK logs only
adb logcat -c                  # Clear logs

# Dashboard
open http://localhost:3000     # Open dashboard
curl http://localhost:3000     # Test connection
```

---

## 🎉 Ready to Test!

Once you have a device connected:

1. Run: `adb devices` to verify connection
2. Run: `./gradlew :sample-app:ecommerce-demo:installDebug`
3. Open: http://localhost:3000
4. Launch the app on your device
5. Watch the magic happen! ✨

**The dashboard will show real-time performance data from your Android device!**
