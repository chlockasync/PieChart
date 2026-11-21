plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.gms.google-services")
}

// One release version for Android, its launcher name, and the GitHub artifact.
val companionVersion = "0.2.012"
// GitHub Actions supplies a unique NZ build timestamp + workflow run number.
// Local development builds are clearly marked rather than impersonating a release.
val companionBuildStamp = providers.gradleProperty("piechartBuildStamp").orElse("LOCAL-UNSIGNED").get()

android {
    namespace = "nz.piechart.companion"
    compileSdk = 36

    defaultConfig {
        applicationId = "nz.piechart.companion"
        minSdk = 34
        targetSdk = 35
        versionCode = 212
        versionName = companionVersion
        manifestPlaceholders["companionAppLabel"] = "PieChart Companion v$companionVersion"
        resValue("string", "piechart_build_stamp", "\"$companionBuildStamp\"")
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        getByName("release") {
            isMinifyEnabled = false
            isDebuggable = false
        }
        getByName("debug") {
            isDebuggable = true
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures { buildConfig = false }
    packaging { resources { excludes += "/META-INF/{AL2.0,LGPL2.1}" } }
}

dependencies {
    implementation(platform("com.google.firebase:firebase-bom:35.2.0"))
    implementation("com.google.firebase:firebase-auth")
    implementation("com.google.firebase:firebase-firestore")
    implementation("androidx.core:core-ktx:1.16.0")
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.9.2")
    implementation("androidx.health.connect:connect-client:1.1.0")
    implementation("androidx.work:work-runtime-ktx:2.10.3")
    implementation("androidx.credentials:credentials:1.5.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.5.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.1.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.10.2")
    // Bundled Latin-script model: recognition runs offline and has no per-scan service fee.
    implementation("com.google.mlkit:text-recognition:16.0.1")
    val cameraXVersion = "1.5.3"
    implementation("androidx.camera:camera-core:$cameraXVersion")
    implementation("androidx.camera:camera-camera2:$cameraXVersion")
    implementation("androidx.camera:camera-lifecycle:$cameraXVersion")
    implementation("androidx.camera:camera-view:$cameraXVersion")
    // CameraX ProcessCameraProvider exposes Guava ListenableFuture; the full Android
    // Guava artifact also prevents an empty transitive placeholder from hiding it.
    implementation("com.google.guava:guava:33.4.8-android")
    testImplementation("junit:junit:4.13.2")
}
kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}
