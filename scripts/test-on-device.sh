#!/bin/bash

# Test Optimizer SDK on Real Device
# Usage: ./scripts/test-on-device.sh

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║        Testing Optimizer SDK on Real Device                 ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check if adb is available
if ! command -v adb &> /dev/null; then
    echo "❌ Error: adb not found"
    echo "Please install Android SDK Platform Tools"
    exit 1
fi

# Check for connected devices
echo "📱 Checking for connected devices..."
DEVICES=$(adb devices | grep -v "List of devices" | grep "device$" | wc -l)

if [ "$DEVICES" -eq 0 ]; then
    echo ""
    echo "❌ No Android devices connected"
    echo ""
    echo "Please connect a device or start an emulator:"
    echo ""
    echo "Physical Device:"
    echo "  1. Enable Developer Options (tap Build Number 7 times)"
    echo "  2. Enable USB Debugging"
    echo "  3. Connect via USB"
    echo "  4. Accept USB debugging prompt on device"
    echo ""
    echo "Emulator:"
    echo "  1. Open Android Studio"
    echo "  2. Tools → Device Manager"
    echo "  3. Start an emulator"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "✅ Found $DEVICES device(s)"
adb devices
echo ""

# Check if dashboard is running
echo "🌐 Checking dashboard..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Dashboard is running at http://localhost:3000"
else
    echo "⚠️  Dashboard not running"
    echo "Starting dashboard..."
    cd dashboard-web
    npm run dev &
    DASHBOARD_PID=$!
    cd ..
    echo "✅ Dashboard started (PID: $DASHBOARD_PID)"
    sleep 3
fi
echo ""

# Build the app
echo "🔨 Building app..."
./gradlew :sample-app:ecommerce-demo:assembleDebug
echo "✅ Build complete"
echo ""

# Install the app
echo "📲 Installing app on device..."
./gradlew :sample-app:ecommerce-demo:installDebug
echo "✅ App installed"
echo ""

# Launch the app
echo "🚀 Launching app..."
adb shell am start -n com.yourcompany.optimizer.demo.ecommerce/.MainActivity
echo "✅ App launched"
echo ""

# Show instructions
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║                    🎉 Ready to Test!                         ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Dashboard: http://localhost:3000"
echo ""
echo "What you should see:"
echo "  ✅ Connection status: Connected (green)"
echo "  ✅ Memory graph updating every 2 seconds"
echo "  ✅ FPS graph updating every 1 second"
echo "  ✅ Performance summary showing health"
echo "  ✅ Screen timings when you navigate"
echo "  ✅ Event stream showing all events"
echo ""
echo "📱 On your device:"
echo "  • Navigate between screens"
echo "  • Watch the dashboard update in real-time"
echo "  • Check logcat for detailed logs"
echo ""
echo "🔍 View logs:"
echo "  adb logcat | grep Optimizer"
echo ""
echo "🛑 Stop app:"
echo "  adb shell am force-stop com.yourcompany.optimizer.demo.ecommerce"
echo ""
echo "Press Ctrl+C to stop monitoring"
echo ""

# Start monitoring logs
echo "📋 Monitoring logs (Ctrl+C to stop)..."
echo "─────────────────────────────────────────────────────────────"
adb logcat | grep --line-buffered "Optimizer"
