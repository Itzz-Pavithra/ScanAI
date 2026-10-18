# ScanAI — Capacitor Android Readiness Guide

This guide documents the architecture, dependencies, security model, and build procedures for packaging **ScanAI** as an Android application using **Capacitor**.

---

## 1. Architecture & Security Model

ScanAI is designed as an API-driven, full-stack application relying on:
1. Server-side AI provider SDKs (Anthropic Claude, OpenAI, Google Gemini).
2. MongoDB Atlas session persistence and GridFS image storage.
3. Server-side Argon2id password hashing and secure HttpOnly cookies.

### Crucial Security Invariants
- **Zero Embedded Secrets:** Never bundle `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, or `MONGODB_URI` in the client APK/AAB package.
- **Secure Traffic Only:** Insecure cleartext HTTP (`android:usesCleartextTraffic="true"`) is strictly disabled in `capacitor.config.json` (`cleartext: false`).
- **WebView Cookies:** Capacitor's Android WebView supports `SameSite=Lax` and `HttpOnly` cookies when communicating with the production domain (`https://scanai.vercel.app`).
- **Camera Permissions:** Only standard camera access (`android.permission.CAMERA`) is requested for live visual scanning.

---

## 2. Prerequisites & Tooling

To compile the Android package, the following local toolchain is required:
- **Node.js** (v18+ or v20+)
- **Android Studio** (Hedgehog 2023.1+ or newer)
- **Android SDK Platform** (API Level 34 / Android 14)
- **Java Development Kit (JDK):** OpenJDK 17 or 21
- **Gradle:** 8.0+

---

## 3. Step-by-Step Android Project Initialization

When preparing the Android wrapper project:

### Step 1: Install Capacitor Core & Android CLI
```bash
npm install @capacitor/core
npm install -D @capacitor/cli @capacitor/android
```

### Step 2: Initialize Android Platform
```bash
npx cap add android
```
This generates the native `/android` directory containing Gradle build files and the Android Studio project.

### Step 3: Configure Android Permissions
Inspect `android/app/src/main/AndroidManifest.xml` and ensure only the camera permission is declared:
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <application
        android:allowBackup="false"
        android:icon="@mipmap/ic_launcher"
        android:label="ScanAI"
        android:theme="@style/AppTheme.NoActionBar">
        <!-- Main Activity -->
    </application>
</manifest>
```

### Step 4: Sync Web Assets
```bash
npm run build
npx cap sync android
```

---

## 4. Building the Android Package

### Open in Android Studio
```bash
npx cap open android
```

### Build Debug APK (Testing)
In Android Studio:
- Select **Build > Build Bundle(s) / APK(s) > Build APK(s)**
- Or run in terminal:
  ```bash
  cd android && ./gradlew assembleDebug
  ```
- Generated APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

### Build Release Android App Bundle (Google Play Store)
1. Select **Build > Generate Signed Bundle / APK...**
2. Choose **Android App Bundle (.aab)**.
3. Configure your production upload keystore (`scanai-release-key.jks`).
4. Generate release bundle for Play Store upload.

---

## 5. Verification Checklist

- [ ] Camera permissions requested only upon user tapping camera capture.
- [ ] Photo upload, preview, and compression work seamlessly in the Android WebView.
- [ ] Real-time SSE streaming responses render smoothly without thread starvation.
- [ ] Back button navigation works without abruptly exiting the application.
- [ ] No API keys or secrets are discoverable via APK decompilation (`jadx` / `apktool`).
