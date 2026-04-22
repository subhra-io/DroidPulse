# 📱 Device Testing Checklist

## Before You Start

### ✅ Prerequisites Checklist

- [ ] Android device or emulator available
- [ ] USB debugging enabled (physical device)
- [ ] Device connected and recognized by adb
- [ ] Dashboard running at http://localhost:3000
- [ ] Latest APK built

## 🚀 Quick Start (Automated)

### Option 1: Use the Test Script
```bash
./scripts/test-on-device.sh
```

This script will:
1. ✅ Check for connected devices
2. ✅ Verify dashboard is running
3. ✅ Build the app
4. ✅ Install on device
5. ✅ Launch the app
6. ✅ Start monitoring logs

### Option 2: Manual Steps
```bash
# 1. Check device
adb devices

# 2. Build & install
./gradlew :sample-app:ecommerce-demo:installDebug

# 3. Launch app
adb shell am start -n com.yourcompany.optimizer.demo.ecommerce/.MainActivity

# 4. Open dashboard
open http://localhost:3000

# 5. Monitor logs
adb logcat | grep Optimizer
```

## 📊 What to Verify

### 1. Dashboard Connection
- [ ] Connection status shows "Connected" (green dot)
- [ ] Status changed from "Disconnected" to "Connected"
- [ ] No connection errors in browser console

**Expected**: Green dot with "Connected" text

### 2. Performance Summary
- [ ] Overall health status displayed (Excellent/Good/Fair/Poor)
- [ ] Memory percentage shown
- [ ] Current FPS displayed
- [ ] API calls count visible
- [ ] Screens viewed count visible

**Expected**:
```
Overall Health: Good ✓
Memory: 15-25%
FPS: 55-60
API Calls: 0
Screens: 1+
```

### 3. Memory Graph
- [ ] Graph is visible and rendering
- [ ] Blue line (used memory) updating every 2 seconds
- [ ] Purple line (heap) updating every 2 seconds
- [ ] Current usage percentage displayed
- [ ] Memory values in MB shown

**Expected**:
```
Memory Usage: 17.5%
45MB / 256MB
Graph shows smooth line with gradual changes
```

### 4. FPS Graph
- [ ] Graph is visible and rendering
- [ ] Green line (FPS) updating every 1 second
- [ ] Reference lines at 60 FPS and 30 FPS visible
- [ ] Current FPS value displayed
- [ ] Jank and dropped frame counts shown

**Expected**:
```
60.0 FPS (green)
Jank: 0 | Dropped: 0
Graph shows stable line near 60 FPS
```

### 5. Screen Timings
- [ ] MainActivity appears in list
- [ ] Duration shown in milliseconds
- [ ] New screens appear when navigating
- [ ] Screen type indicated (ACTIVITY)

**Expected**:
```
MainActivity (ACTIVITY)
234ms
```

### 6. Event Stream
- [ ] Events appearing in real-time
- [ ] Different event types visible (memory, fps, lifecycle)
- [ ] Timestamps shown
- [ ] Last 10 events displayed

**Expected**:
```
memory - 12:34:56
fps - 12:34:56
lifecycle - 12:34:55
```

## 🧪 Test Scenarios

### Test 1: Basic Functionality
**Steps**:
1. Launch app
2. Wait 5 seconds
3. Check dashboard

**Verify**:
- [ ] Connection established
- [ ] Memory graph has data points
- [ ] FPS graph has data points
- [ ] MainActivity in screen timings

### Test 2: Screen Navigation
**Steps**:
1. Navigate to ProductListActivity
2. Navigate to ProductDetailActivity
3. Navigate back to MainActivity

**Verify**:
- [ ] All screens appear in timings
- [ ] Durations are reasonable (100-500ms)
- [ ] Lifecycle events in stream
- [ ] No crashes

### Test 3: Memory Monitoring
**Steps**:
1. Watch memory graph for 30 seconds
2. Navigate between screens
3. Check for memory changes

**Verify**:
- [ ] Graph updates every 2 seconds
- [ ] Memory usage changes slightly
- [ ] No sudden spikes
- [ ] Percentage stays reasonable (<50%)

### Test 4: FPS Monitoring
**Steps**:
1. Watch FPS graph for 30 seconds
2. Scroll or animate in app
3. Check FPS stability

**Verify**:
- [ ] Graph updates every 1 second
- [ ] FPS stays near 60
- [ ] Minimal jank detected
- [ ] No critical performance issues

### Test 5: Performance Under Load
**Steps**:
1. Rapidly navigate between screens (10 times)
2. Watch all metrics
3. Check for issues

**Verify**:
- [ ] Memory increases but stabilizes
- [ ] FPS remains stable
- [ ] No crashes
- [ ] Dashboard stays responsive

## 🔍 Logcat Verification

### Expected Log Messages

**Initialization**:
```
I/Optimizer: Initializing Optimizer SDK v1.0.0
I/Optimizer: Starting memory tracker (interval: 2000ms)
I/Optimizer: Starting FPS tracker (report interval: 1000ms)
I/Optimizer: WebSocket server started on port 8080
```

**Memory Events**:
```
D/Optimizer: Memory: 45MB / 256MB (17%)
D/Optimizer: Memory: 46MB / 256MB (18%)
```

**FPS Events**:
```
D/Optimizer: FPS: 60 (EXCELLENT) - Jank: 0, Dropped: 0
D/Optimizer: FPS: 59 (EXCELLENT) - Jank: 1, Dropped: 2
```

**Lifecycle Events**:
```
I/Optimizer: Activity MainActivity resumed in 234ms
I/Optimizer: Activity ProductListActivity resumed in 189ms
```

**WebSocket**:
```
I/Optimizer: Dashboard connected: /127.0.0.1:54321
```

## ❌ Common Issues & Solutions

### Issue: "No devices connected"
**Solution**:
```bash
# Check USB connection
adb devices

# Restart adb server
adb kill-server
adb start-server

# Check device authorization
adb devices
# If "unauthorized", check device for prompt
```

### Issue: Dashboard shows "Disconnected"
**Solution**:
```bash
# Check if app is running
adb shell ps | grep optimizer

# Check WebSocket logs
adb logcat | grep WebSocket

# Restart app
adb shell am force-stop com.yourcompany.optimizer.demo.ecommerce
adb shell am start -n com.yourcompany.optimizer.demo.ecommerce/.MainActivity
```

### Issue: No memory data
**Solution**:
```bash
# Check memory tracker logs
adb logcat | grep "memory tracker"

# Check for errors
adb logcat | grep -i error
```

### Issue: No FPS data
**Solution**:
```bash
# Check FPS tracker logs
adb logcat | grep "FPS tracker"

# Check Choreographer
adb logcat | grep Choreographer
```

### Issue: App crashes
**Solution**:
```bash
# View crash logs
adb logcat | grep AndroidRuntime

# Reinstall app
./gradlew :sample-app:ecommerce-demo:uninstallDebug
./gradlew :sample-app:ecommerce-demo:installDebug
```

## 📸 Screenshot Checklist

Take screenshots of:
- [ ] Dashboard with all panels visible
- [ ] Memory graph with data
- [ ] FPS graph with data
- [ ] Performance summary
- [ ] Event stream
- [ ] Logcat output

## ✅ Final Verification

Before considering testing complete:

- [ ] All dashboard panels show data
- [ ] Connection is stable for 5+ minutes
- [ ] Memory tracking works continuously
- [ ] FPS tracking works continuously
- [ ] Screen navigation is tracked
- [ ] No crashes or errors
- [ ] Performance is acceptable (60 FPS)
- [ ] Logcat shows expected messages

## 🎯 Success Criteria

Your testing is successful if:

1. ✅ Dashboard connects within 5 seconds
2. ✅ Memory graph updates every 2 seconds
3. ✅ FPS graph updates every 1 second
4. ✅ All screen navigations are tracked
5. ✅ Performance summary shows accurate data
6. ✅ No crashes or errors occur
7. ✅ App maintains 55+ FPS
8. ✅ Memory usage stays under 30%

## 📊 Performance Benchmarks

### Excellent Performance
- Memory: <20%
- FPS: 58-60
- Jank: 0-2
- Screen load: <200ms

### Good Performance
- Memory: 20-30%
- FPS: 50-58
- Jank: 2-5
- Screen load: 200-400ms

### Fair Performance
- Memory: 30-50%
- FPS: 40-50
- Jank: 5-10
- Screen load: 400-600ms

### Poor Performance
- Memory: >50%
- FPS: <40
- Jank: >10
- Screen load: >600ms

---

## 🎉 Ready to Test!

**Quick Start Command**:
```bash
./scripts/test-on-device.sh
```

**Manual Testing**:
1. Connect device: `adb devices`
2. Install app: `./gradlew installDebug`
3. Open dashboard: http://localhost:3000
4. Launch app on device
5. Watch the magic! ✨

**Need Help?**
- See: `TESTING_GUIDE.md` for detailed instructions
- Check: `TROUBLESHOOTING.md` for common issues
- Run: `adb logcat | grep Optimizer` for logs
