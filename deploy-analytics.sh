#!/bin/bash

# DroidPulse Analytics - One-Click Deployment Script
# Deploys your analytics backend to Railway/Heroku/Vercel

set -e

echo "🚀 DroidPulse Analytics Deployment"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "docker-compose.analytics.yml" ]; then
    echo "❌ Error: Run this script from the DroidPulse root directory"
    exit 1
fi

# Function to deploy to Railway
deploy_railway() {
    echo "📡 Deploying to Railway..."
    
    # Check if Railway CLI is installed
    if ! command -v railway &> /dev/null; then
        echo "Installing Railway CLI..."
        npm install -g @railway/cli
    fi
    
    # Login to Railway
    echo "Please login to Railway:"
    railway login
    
    # Initialize project
    railway init
    
    # Deploy ClickHouse (using Railway's database service)
    echo "Setting up ClickHouse database..."
    railway add --service postgresql  # We'll use PostgreSQL for now, can migrate to ClickHouse later
    
    # Deploy analytics API
    cd cloud-backend
    
    # Set environment variables
    railway variables set NODE_ENV=production
    railway variables set PORT=3001
    
    # Deploy
    railway up
    
    # Get the deployment URL
    RAILWAY_URL=$(railway status --json | jq -r '.deployments[0].url')
    echo "✅ Analytics API deployed to: $RAILWAY_URL"
    
    cd ..
    
    # Deploy dashboard
    cd dashboard-web
    
    # Set environment variables for dashboard
    railway variables set NEXT_PUBLIC_API_URL=$RAILWAY_URL
    railway variables set NEXT_PUBLIC_WS_URL=${RAILWAY_URL/https/wss}
    
    # Deploy dashboard
    railway up
    
    DASHBOARD_URL=$(railway status --json | jq -r '.deployments[0].url')
    echo "✅ Dashboard deployed to: $DASHBOARD_URL"
    
    cd ..
    
    echo ""
    echo "🎉 Deployment Complete!"
    echo "======================="
    echo "Analytics API: $RAILWAY_URL"
    echo "Dashboard: $DASHBOARD_URL"
    echo ""
    echo "Next steps:"
    echo "1. Update your Android app with the API URL"
    echo "2. Generate API keys in the dashboard"
    echo "3. Start tracking events!"
}

# Function to deploy to Vercel
deploy_vercel() {
    echo "📡 Deploying to Vercel..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        echo "Installing Vercel CLI..."
        npm install -g vercel
    fi
    
    # Deploy analytics API
    cd cloud-backend
    echo "Deploying analytics API..."
    vercel --prod
    API_URL=$(vercel --prod 2>&1 | grep -o 'https://[^[:space:]]*')
    echo "✅ Analytics API deployed to: $API_URL"
    cd ..
    
    # Deploy dashboard
    cd dashboard-web
    
    # Set environment variables
    echo "NEXT_PUBLIC_API_URL=$API_URL" > .env.production
    echo "NEXT_PUBLIC_WS_URL=${API_URL/https/wss}" >> .env.production
    
    echo "Deploying dashboard..."
    vercel --prod
    DASHBOARD_URL=$(vercel --prod 2>&1 | grep -o 'https://[^[:space:]]*')
    echo "✅ Dashboard deployed to: $DASHBOARD_URL"
    cd ..
    
    echo ""
    echo "🎉 Deployment Complete!"
    echo "======================="
    echo "Analytics API: $API_URL"
    echo "Dashboard: $DASHBOARD_URL"
}

# Function to deploy locally with Docker
deploy_local() {
    echo "🐳 Starting local deployment with Docker..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        echo "❌ Error: Docker is not running. Please start Docker Desktop."
        exit 1
    fi
    
    # Start the analytics stack
    echo "Starting ClickHouse and Redis..."
    docker-compose -f docker-compose.simple.yml up -d
    
    # Wait for services to be ready
    echo "Waiting for services to start..."
    sleep 10
    
    # Initialize ClickHouse schema
    echo "Initializing database schema..."
    if command -v curl &> /dev/null; then
        curl -X POST 'http://localhost:8123' \
            --user 'analytics:droidpulse123' \
            --data-binary @cloud-backend/analytics-schema.sql
        echo "✅ Database schema initialized"
    else
        echo "⚠️  Please run the schema manually: cat cloud-backend/analytics-schema.sql | curl -X POST 'http://localhost:8123' --user 'analytics:droidpulse123' --data-binary @-"
    fi
    
    # Start analytics API
    cd cloud-backend
    echo "Installing API dependencies..."
    npm install
    
    echo "Starting analytics API..."
    CLICKHOUSE_URL=http://localhost:8123 \
    CLICKHOUSE_USER=analytics \
    CLICKHOUSE_PASSWORD=droidpulse123 \
    npm start &
    
    API_PID=$!
    cd ..
    
    # Start dashboard
    cd dashboard-web
    echo "Starting dashboard..."
    NEXT_PUBLIC_API_URL=http://localhost:3001 \
    NEXT_PUBLIC_WS_URL=ws://localhost:8081 \
    npm run dev &
    
    DASHBOARD_PID=$!
    cd ..
    
    echo ""
    echo "🎉 Local Deployment Complete!"
    echo "============================="
    echo "ClickHouse: http://localhost:8123"
    echo "Analytics API: http://localhost:3001"
    echo "Dashboard: http://localhost:3000"
    echo ""
    echo "To stop services:"
    echo "kill $API_PID $DASHBOARD_PID"
    echo "docker-compose -f docker-compose.simple.yml down"
}

# Function to setup SDK publishing
setup_sdk() {
    echo "📦 Setting up SDK for publishing..."
    
    # Check if we have a git tag
    if ! git describe --tags --exact-match HEAD > /dev/null 2>&1; then
        echo "Creating git tag for release..."
        read -p "Enter version (e.g., v1.0.0): " VERSION
        git tag -a "$VERSION" -m "DroidPulse Analytics $VERSION"
        git push origin "$VERSION"
        echo "✅ Tagged release: $VERSION"
    fi
    
    # Get the current tag
    TAG=$(git describe --tags --exact-match HEAD)
    
    echo ""
    echo "📦 SDK Publishing Instructions:"
    echo "=============================="
    echo "1. Visit: https://jitpack.io/#subhra-io/DroidPulse/$TAG"
    echo "2. Click 'Get it' to build the SDK"
    echo "3. Wait for green checkmark ✅"
    echo ""
    echo "Then developers can add to their apps:"
    echo "implementation(\"com.github.subhra-io:DroidPulse:$TAG\")"
}

# Main menu
echo "Choose deployment option:"
echo "1) Railway (Recommended - Free tier available)"
echo "2) Vercel (Serverless)"
echo "3) Local Docker (Development)"
echo "4) Setup SDK Publishing"
echo "5) All (Deploy + Setup SDK)"

read -p "Enter choice (1-5): " choice

case $choice in
    1)
        deploy_railway
        ;;
    2)
        deploy_vercel
        ;;
    3)
        deploy_local
        ;;
    4)
        setup_sdk
        ;;
    5)
        deploy_railway
        setup_sdk
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🎯 Next Steps:"
echo "=============="
echo "1. Copy integration code from INTEGRATION_EXAMPLES.md"
echo "2. Add DroidPulse to your Android app"
echo "3. Start tracking events with performance correlation"
echo "4. Watch the insights appear in your dashboard!"
echo ""
echo "🚀 You're now ready to become the Mixpanel killer for mobile!"