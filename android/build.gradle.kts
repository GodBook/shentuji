plugins {
    id("com.android.application") version "8.10.1" apply false
    id("org.jetbrains.kotlin.android") version "2.1.21" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.1.21" apply false
}

// Gradle worker argument files on Windows can corrupt non-ASCII classpath entries.
// Keep sources in the Chinese project folder while placing disposable build output on an ASCII path.
layout.buildDirectory.set(file("C:/tmp/shentuji-android-build/root"))
subprojects {
    layout.buildDirectory.set(file("C:/tmp/shentuji-android-build/${project.name}"))
}
