import com.android.build.gradle.internal.tasks.factory.dependsOn

buildscript {
    // Allow the consuming app to override versions via rootProject.ext
    extra.apply {
        set("safeExtGet", { prop: String, fallback: Any ->
            if (rootProject.extra.has(prop)) rootProject.extra.get(prop)!! else fallback
        })
    }
}

plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
}

val safeExtGet = extra["safeExtGet"] as (String, Any) -> Any

android {
    namespace = "com.usesense.reactnative"
    compileSdk = safeExtGet("compileSdkVersion", 35) as Int

    defaultConfig {
        minSdk = safeExtGet("minSdkVersion", 26) as Int
        targetSdk = safeExtGet("targetSdkVersion", 35) as Int
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    sourceSets {
        getByName("main") {
            java.srcDirs("src/main/java")
        }
    }
}

repositories {
    mavenCentral()
    mavenLocal()
    google()
    // UseSense Maven repository (when published)
    // maven { url = uri("https://maven.usesense.ai/releases") }
}

dependencies {
    //noinspection GradleDynamicVersion
    implementation("com.facebook.react:react-native:+")

    // UseSense Android SDK
    // Option 1: Published Maven artifact (production)
    implementation("com.usesense:sdk:0.1.0")

    // Option 2: Local Maven (~/.m2) — run `./gradlew :sdk:publishToMavenLocal`
    //           in the usesense-android-sdk repo, then the line above resolves locally.

    // Option 3: Source dependency — add this to your app's settings.gradle.kts:
    //   includeBuild("../usesense-android-sdk") {
    //       dependencySubstitution {
    //           substitute(module("com.usesense:sdk")).using(project(":sdk"))
    //       }
    //   }

    implementation("org.jetbrains.kotlin:kotlin-stdlib:${safeExtGet("kotlinVersion", "2.0.21")}")
}
