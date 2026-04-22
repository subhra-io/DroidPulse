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
        mavenLocal()  // Added for Optimizer SDK
    }
}

rootProject.name = "android-perf-tool"

// SDK modules
include(":sdk:core")
include(":sdk:lifecycle")
include(":sdk:network")
include(":sdk:transport")
include(":sdk:memory")
include(":sdk:fps")
// Future modules (Sprint 3)
// include(":sdk:device")
// include(":sdk:storage")
// include(":sdk:ui-overlay")
// include(":sdk:reports")

// Sample apps
include(":sample-app:ecommerce-demo")
// include(":sample-app:social-demo")  // Future
// include(":sample-app:compose-demo")  // Future

// Note: app/ folder is excluded (from different project)
