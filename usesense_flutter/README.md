# usesense_flutter

Flutter plugin for [UseSense](https://usesense.com) — human presence verification with three core pillars:

- **DeepSense**: Channel & device integrity (attestation, runtime integrity, capture pipeline analysis)
- **LiveSense**: Multimodal proof-of-life (facial dynamics, visual integrity, presentation attack detection, audio authenticity)
- **Dedupe**: Identity collision detection (1:N face search, 1:1 verification, cross-identity risk scoring)

This plugin is a thin platform channel layer wrapping the native [iOS SDK](https://github.com/qudusadeyemi/usesense-ios-sdk) and [Android SDK](https://github.com/qudusadeyemi/usesense-android-sdk). All verification logic runs on-device via the native SDKs.

## Platform Support

| Platform | Minimum Version |
|----------|----------------|
| Android  | API 26 (Android 8.0) |
| iOS      | 15.0 |

## Installation

Add `usesense_flutter` to your `pubspec.yaml`:

```yaml
dependencies:
  usesense_flutter: ^0.1.0
```

### Android Setup

The Android SDK is distributed via Maven. Add the UseSense Maven repository to your app's `android/build.gradle.kts`:

```kotlin
allprojects {
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://maven.usesense.com/releases") }
    }
}
```

Add the required permissions to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
```

### iOS Setup

The iOS SDK is distributed via CocoaPods. The plugin's podspec declares the dependency automatically. Ensure your `ios/Podfile` includes the UseSense pod source:

```ruby
source 'https://cdn.cocoapods.org/'
# If using a private spec repo:
# source 'https://github.com/usesense/podspecs.git'

platform :ios, '15.0'
```

Add camera and microphone usage descriptions to `ios/Runner/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>UseSense requires camera access for identity verification.</string>
<key>NSMicrophoneUsageDescription</key>
<string>UseSense may require microphone access for audio challenges.</string>
```

## Quick Start

```dart
import 'package:usesense_flutter/usesense_flutter.dart';

final useSense = UseSenseFlutter();

// 1. Initialize the SDK (once, typically at app startup)
await useSense.initialize(
  UseSenseConfig(apiKey: 'your_api_key'),
);

// 2. Listen for session events (optional)
useSense.onEvent.listen((event) {
  print('Event: ${event.type}');
});

// 3. Run an enrollment session
final result = await useSense.startVerification(
  VerificationRequest(sessionType: SessionType.enrollment),
);

print(result.decision);    // APPROVE, REJECT, or MANUAL_REVIEW
print(result.identityId);  // assigned identity ID
```

## API Reference

### UseSenseFlutter

The main plugin class.

| Method | Description |
|--------|-------------|
| `initialize(UseSenseConfig)` | Initialize the SDK. Call once before any other method. |
| `startVerification(VerificationRequest)` | Start an enrollment or authentication session. Presents full-screen camera UI. |
| `startRemoteEnrollment(String)` | Start a remote enrollment using a pre-created enrollment ID. |
| `startRemoteVerification(String)` | Start a remote verification using a pre-created session ID. |
| `isInitialized()` | Check if the SDK has been initialized. |
| `reset()` | Reset the SDK and release resources. |
| `onEvent` | Stream of `UseSenseEvent` during sessions. |
| `onCancelled` | Stream that emits when the user cancels. |
| `dispose()` | Release resources held by this instance. |

### UseSenseConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `apiKey` | `String` | *required* | Your UseSense API key. |
| `environment` | `UseSenseEnvironment` | `.auto` | Backend environment (sandbox, production, or auto-detect). |
| `baseUrl` | `String?` | `null` | Override the default backend URL. |
| `gatewayKey` | `String?` | `null` | Optional Supabase gateway key. |
| `branding` | `BrandingConfig?` | `null` | UI branding overrides. |
| `googleCloudProjectNumber` | `int?` | `null` | Google Cloud project number for Play Integrity (Android). |

### VerificationRequest

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `sessionType` | `SessionType` | *required* | `.enrollment` or `.authentication`. |
| `externalUserId` | `String?` | `null` | Your internal user ID. |
| `identityId` | `String?` | `null` | Required for authentication sessions. |
| `metadata` | `Map<String, String>?` | `null` | Arbitrary key-value metadata. |

### UseSenseResult

| Property | Type | Description |
|----------|------|-------------|
| `sessionId` | `String` | Unique session identifier. |
| `sessionType` | `String?` | `enrollment` or `authentication`. |
| `identityId` | `String?` | Assigned or verified identity ID. |
| `decision` | `String` | `APPROVE`, `REJECT`, or `MANUAL_REVIEW`. |
| `timestamp` | `String` | ISO 8601 timestamp. |
| `isApproved` | `bool` | Convenience getter. |
| `isRejected` | `bool` | Convenience getter. |
| `isPendingReview` | `bool` | Convenience getter. |

### UseSenseEvent

| Property | Type | Description |
|----------|------|-------------|
| `type` | `UseSenseEventType` | Event type (see below). |
| `timestamp` | `int` | Millisecond timestamp. |
| `data` | `Map<String, Object?>?` | Optional payload. |

### UseSenseEventType

`sessionCreated`, `permissionsRequested`, `permissionsGranted`, `permissionsDenied`, `captureStarted`, `frameCaptured`, `captureCompleted`, `audioRecordStarted`, `audioRecordCompleted`, `challengeStarted`, `challengeCompleted`, `uploadStarted`, `uploadProgress`, `uploadCompleted`, `completeStarted`, `decisionReceived`, `imageQualityCheck`, `error`

### UseSenseError

| Property | Type | Description |
|----------|------|-------------|
| `code` | `int` | Numeric error code. |
| `message` | `String` | Human-readable description. |
| `serverCode` | `String?` | Server-specific code. |
| `isRetryable` | `bool` | Whether the operation can be retried. |
| `details` | `Map<String, String>?` | Additional context. |

**Error codes:**

| Code | Constant | Retryable | Description |
|------|----------|-----------|-------------|
| 1001 | `cameraUnavailable` | No | Camera hardware unavailable. |
| 1002 | `cameraPermissionDenied` | No | Camera permission denied. |
| 1003 | `microphonePermissionDenied` | No | Microphone permission denied. |
| 2001 | `networkError` | Yes | Network communication error. |
| 2002 | `networkTimeout` | Yes | Network request timed out. |
| 3001 | `sessionExpired` | No | Session has expired. |
| 3002 | `uploadFailed` | Yes | Data upload failed. |
| 4001 | `captureFailed` | No | Frame capture failed. |
| 4002 | `encodingFailed` | No | Frame encoding failed. |
| 5001 | `invalidConfig` | No | Invalid SDK configuration. |
| 6001 | `quotaExceeded` | No | Organization quota exceeded. |
| 7001 | `sdkNotInitialized` | No | SDK not initialized. |
| 8001 | `sessionCancelled` | No | User cancelled session. |

## Code Generation (Pigeon)

The platform channel code is generated using [Pigeon](https://pub.dev/packages/pigeon). The generated files are checked in, but if you need to regenerate them after modifying the schema:

```bash
cd usesense_flutter
dart run pigeon --input pigeons/usesense_api.dart
```

This generates:
- `lib/src/generated/usesense_api.g.dart` (Dart)
- `android/src/main/kotlin/com/usesense/flutter/UseSenseApi.g.kt` (Kotlin)
- `ios/Classes/UseSenseApi.g.swift` (Swift)

## Troubleshooting

### `sdk_not_initialized` error

Ensure `initialize()` is called and awaited before calling `startVerification()`.

### Camera permission denied on Android

Add the `CAMERA` permission to your AndroidManifest.xml. On Android 13+, runtime permission is requested automatically by the native SDK.

### iOS build fails with "Module 'UseSenseSDK' not found"

Run `cd ios && pod install` in your app's directory. If the issue persists, verify the UseSense pod source is configured in your Podfile.

### Events not received

Subscribe to `onEvent` **before** calling `startVerification()`. The stream is broadcast — late subscribers miss earlier events.

### Session timeout

Sessions expire after 5–10 minutes. If you receive a `session_expired` error, start a new session.

## Example

See [example/lib/main.dart](example/lib/main.dart) for a complete working example.

## License

MIT License. See [LICENSE](LICENSE) for details.
