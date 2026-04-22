#!/bin/bash

# Run demo app and dashboard
# Usage: ./scripts/run-demo.sh

set -e

echo "🚀 Starting Optimizer Demo..."

# Start dashboard in background
echo "📊 Starting dashboard..."
cd dashboard-web
npm install
npm run dev &
DASHBOARD_PID=$!

echo ""
echo "✅ Dashboard running at http://localhost:3000"
echo ""
echo "📱 Now run the Android app:"
echo "   ./gradlew :sample-app:ecommerce-demo:installDebug"
echo ""
echo "Press Ctrl+C to stop dashboard"

# Wait for Ctrl+C
trap "kill $DASHBOARD_PID" EXIT
wait $DASHBOARD_PID
