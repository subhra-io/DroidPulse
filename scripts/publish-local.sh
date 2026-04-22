#!/bin/bash

# Publish Optimizer SDK to Maven Local
# Usage: ./scripts/publish-local.sh

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║        Publishing Optimizer SDK to Maven Local              ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Clean build
echo "🧹 Cleaning previous builds..."
./gradlew clean
echo "✅ Clean complete"
echo ""

# Build all modules
echo "🔨 Building SDK modules..."
./gradlew :sdk:core:assembleRelease
./gradlew :sdk:lifecycle:assembleRelease
./gradlew :sdk:network:assembleRelease
./gradlew :sdk:memory:assembleRelease
./gradlew :sdk:fps:assembleRelease
./gradlew :sdk:transport:assembleRelease
echo "✅ Build complete"
echo ""

# Publish to Maven Local
echo "📦 Publishing to Maven Local..."
./gradlew :sdk:core:publishToMavenLocal
./gradlew :sdk:lifecycle:publishToMavenLocal
./gradlew :sdk:network:publishToMavenLocal
./gradlew :sdk:memory:publishToMavenLocal
./gradlew :sdk:fps:publishToMavenLocal
./gradlew :sdk:transport:publishToMavenLocal
echo "✅ Publishing complete"
echo ""

# Verify
echo "🔍 Verifying installation..."
MAVEN_LOCAL="$HOME/.m2/repository/com/yourcompany/optimizer"

if [ -d "$MAVEN_LOCAL" ]; then
    echo "✅ SDK published successfully!"
    echo ""
    echo "📍 Location: $MAVEN_LOCAL"
    echo ""
    echo "📦 Published modules:"
    ls -1 "$MAVEN_LOCAL" 2>/dev/null || echo "  (checking...)"
    echo ""
else
    echo "❌ Publishing failed - directory not found"
    exit 1
fi

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║                    ✅ Publishing Complete!                   ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "📚 How to use in another project:"
echo ""
echo "1. Add to settings.gradle.kts:"
echo "   repositories {"
echo "       mavenLocal()"
echo "   }"
echo ""
echo "2. Add to app/build.gradle.kts:"
echo "   implementation(\"com.yourcompany.optimizer:core:1.0.0\")"
echo "   implementation(\"com.yourcompany.optimizer:lifecycle:1.0.0\")"
echo "   implementation(\"com.yourcompany.optimizer:network:1.0.0\")"
echo "   implementation(\"com.yourcompany.optimizer:memory:1.0.0\")"
echo "   implementation(\"com.yourcompany.optimizer:fps:1.0.0\")"
echo "   implementation(\"com.yourcompany.optimizer:transport:1.0.0\")"
echo ""
echo "3. Use in Application class:"
echo "   Optimizer.init(this, OptimizerConfig(debug = true))"
echo ""
echo "📖 Full guide: PUBLISHING_GUIDE.md"
