pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    // Some Windows development environments inject mirror repositories from
    // ~/.gradle/init.gradle. Prefer this project's repositories without
    // failing configuration when such a global mirror is present.
    repositoriesMode.set(RepositoriesMode.PREFER_SETTINGS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "Shentuji"
include(":app")
