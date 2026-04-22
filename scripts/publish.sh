#!/bin/bash

# Publish SDK to Maven Central
# Usage: ./scripts/publish.sh

set -e

echo "🚀 Publishing Optimizer SDK..."

# Build all modules
./gradlew clean build

# Run tests
./gradlew test

# Publish to Maven Local (for testing)
./gradlew publishToMavenLocal

echo "✅ Published to Maven Local"
echo ""
echo "To publish to Maven Central:"
echo "1. Configure credentials in gradle.properties"
echo "2. Run: ./gradlew publish"
echo ""
echo "To test locally:"
echo "implementation(\"com.yourcompany:optimizer-sdk:1.0.0\")"
