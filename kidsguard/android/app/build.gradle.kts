plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    // Push (FCM) — exige app/google-services.json. Comente esta linha para buildar sem push.
    // id("com.google.gms.google-services")
}

android {
    namespace = "com.kidsguard.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.kidsguard.app"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "0.1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    // OCR on-device (grátis, offline) para ler o chat do Roblox a partir do screenshot.
    implementation("com.google.mlkit:text-recognition:16.0.1")
    // Scanner de QR (pareamento) — CameraX + ML Kit barcode.
    implementation("com.google.mlkit:barcode-scanning:17.3.0")
    implementation("androidx.camera:camera-camera2:1.3.4")
    implementation("androidx.camera:camera-lifecycle:1.3.4")
    implementation("androidx.camera:camera-view:1.3.4")
    // Push (FCM) — comentado até configurar Firebase
    // implementation(platform("com.google.firebase:firebase-bom:33.1.2"))
    // implementation("com.google.firebase:firebase-messaging")
}
