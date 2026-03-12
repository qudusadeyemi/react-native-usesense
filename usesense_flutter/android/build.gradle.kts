plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
}

group = "com.usesense.flutter"
version = "0.1.0"

android {
    namespace = "com.usesense.flutter"
    compileSdk = 35

    defaultConfig {
        minSdk = 26
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }
}

dependencies {
    // UseSense Android SDK
    // Option 1: Published Maven artifact
    implementation("com.usesense:sdk:0.1.0")

    // Option 2: Local Maven repository (uncomment if using local build)
    // implementation("com.usesense:sdk:0.1.0-local")

    // Option 3: Source dependency (uncomment and adjust path)
    // implementation(project(":usesense-sdk"))

    // Flutter embedding (provided by the Flutter build system)
    compileOnly("io.flutter:flutter_embedding_debug:1.0.0-")
}
