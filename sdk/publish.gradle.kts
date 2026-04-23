// Publishing configuration for SDK modules
// Apply this to each SDK module to enable Maven publishing

apply(plugin = "maven-publish")

// JitPack sets the PROJECT_VERSION env var from the git tag.
// Fallback to "1.5.2" for local builds.
val sdkVersion = System.getenv("PROJECT_VERSION")
    ?.removePrefix("v")
    ?: "1.5.2"

configure<PublishingExtension> {
    publications {
        create<MavenPublication>("release") {
            groupId    = "com.github.subhra-io"
            artifactId = "DroidPulse-${project.name}"
            version    = sdkVersion

            afterEvaluate {
                from(components["release"])
            }

            pom {
                name.set("DroidPulse SDK — ${project.name}")
                description.set("Android Performance Monitoring SDK — ${project.name} module")
                url.set("https://github.com/subhra-io/DroidPulse")

                licenses {
                    license {
                        name.set("MIT License")
                        url.set("https://opensource.org/licenses/MIT")
                    }
                }

                developers {
                    developer {
                        id.set("subhra-io")
                        name.set("DroidPulse")
                        email.set("dev@droidpulse.io")
                    }
                }
            }
        }
    }
}
