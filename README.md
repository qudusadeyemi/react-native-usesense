# react-native-usesense

React Native wrapper for the [UseSense iOS SDK](https://github.com/qudusadeyemi/usesense-ios-sdk) and [UseSense Android SDK](https://github.com/qudusadeyemi/usesense-android-sdk) — identity verification, liveness detection, and deduplication for mobile apps.

UseSense provides three core verification pillars:

- **DeepSense** — Channel & device integrity (attestation, runtime integrity, capture pipeline analysis)
- **LiveSense** — Multimodal proof-of-life (facial dynamics, visual integrity, presentation attack detection, audio authenticity)
- **Dedupe** — Identity collision detection (1:N face search, 1:1 verification, cross-identity risk scoring)

## Requirements

| Platform | Minimum Version |
| -------- | --------------- |
| iOS      | 15.0            |
| Android  | API 26 (8.0)    |
| React Native | 0.71+       |

## Installation

```bash
npm install react-native-usesense
# or
yarn add react-native-usesense
```

### iOS Setup

1. **Add the UseSense iOS SDK** to your project using one of:

   **Option A — Swift Package Manager (recommended):**
   In Xcode, go to File → Add Package Dependencies and add:
   ```
   https://github.com/qudusadeyemi/usesense-ios-sdk.git
   ```

   **Option B — Local pod (development):**
   Add to your app's `Podfile`:
   ```ruby
   pod 'UseSenseSDK', :path => '../path-to/usesense-ios-sdk'
   ```

2. **Install pods:**
   ```bash
   cd ios && pod install
   ```

3. **Camera & microphone permissions** — add to your `Info.plist`:
   ```xml
   <key>NSCameraUsageDescription</key>
   <string>Required for identity verification</string>
   <key>NSMicrophoneUsageDescription</key>
   <string>Required for voice-based liveness checks</string>
   ```

### Android Setup

1. **Add the UseSense Maven repository** (when published) to your app's `android/build.gradle`:
   ```groovy
   allprojects {
       repositories {
           // UseSense Maven repository
           maven { url 'https://maven.usesense.ai/releases' }
       }
   }
   ```

   For local development, publish the SDK to Maven Local:
   ```bash
   # In the usesense-android-sdk repo:
   ./gradlew :sdk:publishToMavenLocal
   ```

   Or use a source dependency in your app's `settings.gradle.kts`:
   ```kotlin
   includeBuild("../usesense-android-sdk") {
       dependencySubstitution {
           substitute(module("com.usesense:sdk")).using(project(":sdk"))
       }
   }
   ```

2. **Ensure `minSdkVersion`** is at least **26** in `android/build.gradle`.

3. **Rebuild:**
   ```bash
   npx react-native run-android
   ```

> React Native 0.60+ projects use **autolinking** — no manual package registration needed.

### New Architecture

This package supports React Native's New Architecture (TurboModules) out of the box. It also maintains backward compatibility with the Bridge architecture via an automatic fallback, so it works on all projects regardless of architecture setting.

## Usage

```typescript
import UseSense from 'react-native-usesense';

// 1. Initialize (once, e.g. on app startup)
UseSense.initialize({
  apiKey: 'your_api_key',
  environment: 'sandbox', // or 'production'
});

// 2. Subscribe to events (optional)
const unsubscribe = UseSense.onEvent((event) => {
  console.log(`[${event.type}]`, event.data);
});

// 3. Start verification
try {
  const result = await UseSense.startVerification({
    sessionType: 'enrollment',
    externalUserId: 'user_123',
    metadata: { source: 'onboarding' },
  });

  if (result.isApproved) {
    console.log('Verified!', result.sessionId);
  } else if (result.isPendingReview) {
    console.log('Under review');
  } else {
    console.log('Rejected');
  }
} catch (error) {
  if (error.code === 'CANCELLED') {
    console.log('User cancelled');
  } else {
    console.error('Verification failed:', error.message);
  }
} finally {
  unsubscribe();
}
```

### Authentication Sessions

```typescript
const result = await UseSense.startVerification({
  sessionType: 'authentication',
  identityId: 'identity_abc123', // required for authentication
  externalUserId: 'user_123',
});
```

### Branding

```typescript
UseSense.initialize({
  apiKey: 'your_api_key',
  branding: {
    primaryColor: '#4F46E5',
    buttonRadius: 12,
    logoUrl: 'https://example.com/logo.png',
    fontFamily: 'Inter',
  },
});
```

## API Reference

### `initialize(config)`

Initialize the SDK. Must be called once before `startVerification()`.

| Parameter                  | Type     | Required | Default          |
| -------------------------- | -------- | -------- | ---------------- |
| `apiKey`                   | string   | Yes      |                  |
| `environment`              | string   | No       | `'auto'`         |
| `baseUrl`                  | string   | No       | SDK default      |
| `gatewayKey`               | string   | No       |                  |
| `branding`                 | object   | No       |                  |
| `branding.primaryColor`    | string   | No       | `'#4F46E5'`      |
| `branding.buttonRadius`    | number   | No       | `12`             |
| `branding.logoUrl`         | string   | No       |                  |
| `branding.fontFamily`      | string   | No       |                  |
| `googleCloudProjectNumber` | number   | No       | SDK default      |

### `startVerification(request)` → `Promise<UseSenseResult>`

Launch the native verification flow. The SDK presents its own camera UI as a modal/activity. Returns a promise that resolves with the result or rejects on error/cancellation.

| Parameter        | Type     | Required | Notes                                |
| ---------------- | -------- | -------- | ------------------------------------ |
| `sessionType`    | string   | Yes      | `'enrollment'` or `'authentication'` |
| `externalUserId` | string   | No       |                                      |
| `identityId`     | string   | No       | Required for `'authentication'`      |
| `metadata`       | object   | No       | Arbitrary key-value pairs            |

#### `UseSenseResult`

| Field             | Type           | Description                        |
| ----------------- | -------------- | ---------------------------------- |
| `sessionId`       | string         | Unique session identifier          |
| `sessionType`     | string \| null | `'enrollment'` or `'authentication'` |
| `identityId`      | string \| null | Identity ID (for future auth)      |
| `decision`        | string         | `'APPROVE'`, `'REJECT'`, or `'MANUAL_REVIEW'` |
| `timestamp`       | string         | ISO 8601 timestamp                 |
| `isApproved`      | boolean        | Convenience: `decision === 'APPROVE'` |
| `isRejected`      | boolean        | Convenience: `decision === 'REJECT'`  |
| `isPendingReview` | boolean        | Convenience: `decision === 'MANUAL_REVIEW'` |

### `onEvent(callback)` → `() => void`

Subscribe to SDK lifecycle events. Returns an unsubscribe function.

| Event Type              | Description                           |
| ----------------------- | ------------------------------------- |
| `SESSION_CREATED`       | Session created on backend            |
| `PERMISSIONS_REQUESTED` | Camera/mic permissions requested      |
| `PERMISSIONS_GRANTED`   | Permissions granted                   |
| `PERMISSIONS_DENIED`    | Permissions denied by user            |
| `CAPTURE_STARTED`       | Frame capture began                   |
| `FRAME_CAPTURED`        | Individual frame captured             |
| `CAPTURE_COMPLETED`     | All frames captured                   |
| `AUDIO_RECORD_STARTED`  | Audio recording began                 |
| `AUDIO_RECORD_COMPLETED`| Audio recording completed             |
| `CHALLENGE_STARTED`     | Liveness challenge presented          |
| `CHALLENGE_COMPLETED`   | Liveness challenge completed          |
| `UPLOAD_STARTED`        | Data upload began                     |
| `UPLOAD_PROGRESS`       | Upload progress update                |
| `UPLOAD_COMPLETED`      | Upload completed                      |
| `COMPLETE_STARTED`      | Verdict request sent                  |
| `DECISION_RECEIVED`     | Final decision received               |
| `IMAGE_QUALITY_CHECK`   | Image quality assessment              |
| `ERROR`                 | Error occurred during the flow        |

### `isInitialized()` → `Promise<boolean>`

Check whether the SDK has been initialized.

### `reset()`

Reset the SDK state. Call when you want to reinitialize with a different config or when the user logs out.

### Error Handling

When `startVerification()` rejects, the error object contains:

| Field        | Type           | Description                          |
| ------------ | -------------- | ------------------------------------ |
| `code`       | number/string  | Error code (e.g. `'CANCELLED'`)      |
| `serverCode` | string \| null | Server-side error code               |
| `message`    | string         | Human-readable error message         |
| `isRetryable`| boolean        | Whether the operation can be retried |

Common error codes:
- `CANCELLED` — User dismissed the verification UI
- `NOT_INITIALIZED` — `initialize()` was not called
- `NO_ACTIVITY` / `NO_ROOT_VC` — No foreground activity/controller available
- `1001` — Camera unavailable
- `1002` — Camera permission denied
- `1003` — Microphone permission denied
- `2001` — Network error (retryable)
- `3001` — Session expired
- `5001` — Invalid configuration

## Platform Support

| Platform | Status |
| -------- | ------ |
| Android  | ✅     |
| iOS      | ✅     |

## Troubleshooting

### iOS: "No such module 'UseSenseSDK'"
Make sure the UseSense iOS SDK is added to your Xcode project via Swift Package Manager or as a local pod. Run `pod install` after making changes.

### Android: "Could not find com.usesense:sdk"
The SDK may not be published to Maven Central yet. Use `publishToMavenLocal` from the SDK repo, or use `includeBuild` in your `settings.gradle.kts` to reference it as a source dependency.

### "NativeModule not found"
- Ensure the package is properly linked (React Native 0.60+ does this automatically).
- For iOS, check that `pod install` completed successfully.
- For Android, clean and rebuild: `cd android && ./gradlew clean && cd .. && npx react-native run-android`.

### Android: Activity not found
The UseSense SDK requires a foreground Activity to present its camera UI. Make sure `startVerification()` is called while the app is in the foreground.

### Events not received
Make sure you call `onEvent()` *before* `startVerification()`. The subscription must be active when the flow starts.

## License

MIT
