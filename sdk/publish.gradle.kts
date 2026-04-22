// Publishing configuration for SDK modules
// Apply this to each SDK module to enable Maven publishing

apply(plugin = "maven-publish")

configure<PublishingExtension> {
    publications {
        create<MavenPublication>("release") {
            groupId = "com.yourcompany.optimizer"
            artifactId = project.name
            version = "1.0.0"
            
            afterEvaluate {
                from(components["release"])
            }
            
            pom {
                name.set("Optimizer SDK - ${project.name}")
                description.set("Android Performance Monitoring SDK - ${project.name} module")
                url.set("https://github.com/yourcompany/optimizer-sdk")
                
                licenses {
                    license {
                        name.set("MIT License")
                        url.set("https://opensource.org/licenses/MIT")
                    }
                }
                
                developers {
                    developer {
                        id.set("yourcompany")
                        name.set("Your Company")
                        email.set("dev@yourcompany.com")
                    }
                }
            }
        }
    }
}
