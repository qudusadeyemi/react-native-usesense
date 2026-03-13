plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
}

group = "com.usesense.flutter"
version = "1.0.0"

android {
    namespace = "com.usesense.flutter"
    compileSdk = 35

    defaultConfig {
        minSdk = 24
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
    implementation("ai.usesense:sdk:1.0.0")

    // Flutter embedding (provided by the Flutter build system)
    compileOnly("io.flutter:flutter_embedding_debug:1.0.0-")
}
