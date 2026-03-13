# usesense_flutter

Flutter plugin for [UseSense](https://usesense.ai) human presence verification. Wraps native iOS and Android SDKs via [Pigeon](https://pub.dev/packages/pigeon) type-safe platform channels.

UseSense verifies human presence through three pillars:

- **DeepSense** -- Device and channel integrity (attestation, runtime integrity, capture pipeline analysis)
- **LiveSense** -- Multimodal liveness detection (facial dynamics, visual integrity, presentation attack detection, audio authenticity)
- **MatchSense** -- Face matching and deduplication (1:N face search, 1:1 verification, cross-identity risk scoring)

**SenSei** is the adaptive AI orchestration layer that coordinates these pillars and returns a decision.

---

## Requirements

| Requirement | Minimum Version |
|-------------|----------------|
| Flutter | 3.16+ |
| Dart | 3.2+ |
| iOS | 16.0+ |
| Xcode | 15.0+ |
| Android | API 24 (Android 7.0) |
| Hardware | Front-facing camera |

---

## Installation

Add `usesense_flutter` to your `pubspec.yaml`:

```yaml
dependencies:
  usesense_flutter: ^1.0.0
```

Then run:

```bash
flutter pub get
```

### iOS Setup

The iOS SDK is distributed via CocoaPods. The plugin's podspec declares the dependency automatically. Ensure your `ios/Podfile` targets iOS 16.0+:

```ruby
source 'https://cdn.cocoapods.org/'

platform :ios, '16.0'
```

Add camera and microphone usage descriptions to `ios/Runner/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>UseSense requires camera access for identity verification.</string>
<key>NSMicrophoneUsageDescription</key>
<string>UseSense requires microphone access for audio-based liveness challenges.</string>
```

Then install pods:

```bash
cd ios && pod install
```

### Android Setup

Add the UseSense Maven repository to your app-level `android/build.gradle.kts`:

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

---

## Quick Start

```dart
import 'package:usesense_flutter/usesense_flutter.dart';

final useSense = UseSenseFlutter();

// 1. Initialize once at app startup
await useSense.initialize(
  UseSenseConfig(apiKey: 'pk_live_your_api_key'),
);

// 2. Subscribe to events before starting a session
useSense.onEvent.listen((event) {
  print('${event.type}: ${event.data}');
});

// 3. Run an enrollment session
try {
  final result = await useSense.startVerification(
    VerificationRequest(sessionType: SessionType.enrollment),
  );

  if (result.isApproved) {
    print('Verified. Identity: ${result.identityId}');
  }
} on UseSenseError catch (e) {
  print('Error ${e.code}: ${e.message}');
}

// 4. Clean up when done
useSense.dispose();
```

---

## Configuration Reference

Pass a `UseSenseConfig` to `initialize()`. Only `apiKey` is required; all other fields have sensible defaults.

```dart
await useSense.initialize(
  UseSenseConfig(
    apiKey: 'pk_live_your_api_key',
    environment: UseSenseEnvironment.production,
    branding: BrandingConfig(
      displayName: 'Acme Corp',
      logoUrl: 'https://acme.com/logo.png',
      primaryColor: '#4F46E5',
      buttonRadius: 8,
    ),
    googleCloudProjectNumber: 123456789, // Android Play Integrity
  ),
);
```

### UseSenseConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `apiKey` | `String` | **required** | Your UseSense API key. Production keys start with `pk_*`; sandbox keys start with `sk_*` or `dk_*`. |
| `environment` | `UseSenseEnvironment` | `.auto` | Backend environment. `.auto` detects from the key prefix. |
| `baseUrl` | `String?` | `null` | Override the default backend URL. Useful for on-premise deployments. |
| `gatewayKey` | `String?` | `null` | Optional gateway key. |
| `branding` | `BrandingConfig?` | `null` | UI customization for the verification screen. |
| `googleCloudProjectNumber` | `int?` | `null` | Google Cloud project number for Android Play Integrity attestation. |

### BrandingConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `displayName` | `String?` | `null` | Organization name shown in the verification UI. |
| `logoUrl` | `String?` | `null` | URL to your logo image. |
| `primaryColor` | `String?` | `null` | Hex color string, e.g. `"#4F46E5"`. |
| `redirectUrl` | `String?` | `null` | URL to redirect after verification. |
| `buttonRadius` | `int` | `12` | Corner radius for UI buttons. |
| `fontFamily` | `String?` | `null` | Custom font family name. |

### UseSenseEnvironment

| Value | Description |
|-------|-------------|
| `sandbox` | Sandbox environment for development and testing. |
| `production` | Production environment for live users. |
| `auto` | Auto-detect from API key prefix (`pk_*` = production, `sk_*`/`dk_*` = sandbox). |

---

## Session Types

UseSense supports two session types: **enrollment** (registering a new identity) and **authentication** (verifying a returning user).

### Enrollment

Creates a new identity. Use this the first time a user goes through verification.

```dart
final result = await useSense.startVerification(
  VerificationRequest(
    sessionType: SessionType.enrollment,
    externalUserId: 'user_12345',          // your internal user ID
    metadata: {'tier': 'premium'},          // optional metadata
  ),
);

// Store the identityId for future authentication sessions
final identityId = result.identityId;
```

### Authentication

Verifies a returning user against a previously enrolled identity. The `identityId` from the enrollment result is required.

```dart
final result = await useSense.startVerification(
  VerificationRequest(
    sessionType: SessionType.authentication,
    identityId: 'idt_abc123',  // from a prior enrollment result
  ),
);
```

### Remote Sessions

For server-initiated flows, use the remote methods with a pre-created session or enrollment ID from your backend:

```dart
// Remote enrollment
final result = await useSense.startRemoteEnrollment('enr_xyz789');

// Remote verification
final result = await useSense.startRemoteVerification('ses_abc456');
```

### VerificationRequest

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `sessionType` | `SessionType` | **required** | `.enrollment` or `.authentication`. |
| `externalUserId` | `String?` | `null` | Your internal user ID. Ties the session to a user in your system. |
| `identityId` | `String?` | `null` | **Required for authentication.** The identity ID returned from a prior enrollment. |
| `metadata` | `Map<String, String>?` | `null` | Arbitrary key-value pairs attached to the session. |

---

## Handling Results

`startVerification`, `startRemoteEnrollment`, and `startRemoteVerification` all return a `UseSenseResult`. The result contains a `decision` string and convenience getters.

> **IMPORTANT:** The SDK result is for **UI feedback only**. Scores are intentionally redacted from the client SDK for security. You must **never** use the SDK-side decision for access-control or trust decisions. The definitive verdict arrives at your backend via a signed webhook. See [Server-Side Webhook Verification](#server-side-webhook-verification).

### UseSenseResult

| Property | Type | Description |
|----------|------|-------------|
| `sessionId` | `String` | Unique session identifier. |
| `sessionType` | `String?` | `"enrollment"` or `"authentication"`. |
| `identityId` | `String?` | The identity ID (assigned on enrollment, verified on authentication). |
| `decision` | `String` | `"APPROVE"`, `"REJECT"`, or `"MANUAL_REVIEW"`. |
| `timestamp` | `String` | ISO 8601 timestamp of the decision. |
| `isApproved` | `bool` | `true` when `decision == "APPROVE"`. |
| `isRejected` | `bool` | `true` when `decision == "REJECT"`. |
| `isPendingReview` | `bool` | `true` when `decision == "MANUAL_REVIEW"`. |

### Decision Handling Example

```dart
final result = await useSense.startVerification(
  VerificationRequest(sessionType: SessionType.enrollment),
);

if (result.isApproved) {
  // Show success UI; wait for webhook confirmation on your backend
  // before granting access
  Navigator.of(context).pushReplacement(
    MaterialPageRoute(builder: (_) => VerificationPendingScreen(
      sessionId: result.sessionId,
    )),
  );
} else if (result.isRejected) {
  ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(content: Text('Verification unsuccessful. Please try again.')),
  );
} else if (result.isPendingReview) {
  Navigator.of(context).pushReplacement(
    MaterialPageRoute(builder: (_) => ManualReviewScreen(
      sessionId: result.sessionId,
    )),
  );
}
```

---

## Event Listening

The `onEvent` stream emits `UseSenseEvent` objects throughout a verification session. The `onCancelled` stream emits when the user dismisses the verification UI.

### Using StreamBuilder (Declarative)

```dart
StreamBuilder<UseSenseEvent>(
  stream: useSense.onEvent,
  builder: (context, snapshot) {
    if (!snapshot.hasData) return const SizedBox.shrink();
    final event = snapshot.data!;

    switch (event.type) {
      case UseSenseEventType.captureStarted:
        return const Text('Hold still...');
      case UseSenseEventType.uploadProgress:
        final progress = event.data?['progress'] as double? ?? 0;
        return LinearProgressIndicator(value: progress);
      case UseSenseEventType.decisionReceived:
        return const Text('Complete');
      default:
        return const SizedBox.shrink();
    }
  },
)
```

### Imperative Subscription

```dart
final subscription = useSense.onEvent.listen((event) {
  switch (event.type) {
    case UseSenseEventType.sessionCreated:
      log('Session created: ${event.data?['sessionId']}');
    case UseSenseEventType.challengeStarted:
      log('Challenge: ${event.data?['challengeType']}');
    case UseSenseEventType.uploadProgress:
      log('Upload: ${event.data?['progress']}');
    case UseSenseEventType.error:
      log('Error during session: ${event.data}');
    default:
      break;
  }
});

// Listen for user cancellation
final cancelSub = useSense.onCancelled.listen((_) {
  log('User cancelled verification');
});

// Clean up when done
subscription.cancel();
cancelSub.cancel();
```

### Event Types

| Event | Description | Data Fields |
|-------|-------------|-------------|
| `sessionCreated` | Session initialized on the server. | `sessionId` |
| `permissionsRequested` | Camera/microphone permissions requested. | |
| `permissionsGranted` | Permissions granted by user. | |
| `permissionsDenied` | Permissions denied by user. | |
| `captureStarted` | Camera capture has begun. | |
| `frameCaptured` | A video frame was captured. | |
| `captureCompleted` | Capture phase finished. | |
| `audioRecordStarted` | Audio recording began (speak_phrase challenge). | |
| `audioRecordCompleted` | Audio recording finished. | |
| `challengeStarted` | A liveness challenge started. | `challengeType` |
| `challengeCompleted` | A liveness challenge completed. | `challengeType` |
| `uploadStarted` | Data upload to server began. | |
| `uploadProgress` | Upload progress update. | `progress` (0.0-1.0) |
| `uploadCompleted` | Upload finished. | |
| `completeStarted` | Server-side analysis started. | |
| `decisionReceived` | Decision returned from server. | `decision` |
| `imageQualityCheck` | Image quality assessment result. | |
| `error` | An error occurred during the session. | `code`, `message` |

---

## Error Handling

All verification methods throw `UseSenseError` on failure. Wrap calls in a `try`/`on` block.

```dart
try {
  final result = await useSense.startVerification(
    VerificationRequest(sessionType: SessionType.enrollment),
  );
  // handle result
} on UseSenseError catch (e) {
  if (e.isRetryable) {
    // Network errors, upload failures -- safe to retry
    showRetryDialog(e.message);
  } else {
    switch (e.code) {
      case UseSenseError.cameraPermissionDenied:
        openAppSettings();
      case UseSenseError.sessionExpired:
        // Sessions expire after 15 minutes; start a new one
        showExpiredMessage();
      case UseSenseError.quotaExceeded:
        contactSupport();
      case UseSenseError.sdkNotInitialized:
        await useSense.initialize(config);
      case UseSenseError.sessionCancelled:
        // User dismissed the UI; no action needed
        break;
      default:
        showGenericError(e.message);
    }
  }
}
```

### Error Code Reference

| Code | Constant | Retryable | Description |
|------|----------|-----------|-------------|
| 1001 | `cameraUnavailable` | No | Camera hardware not available on this device. |
| 1002 | `cameraPermissionDenied` | No | User denied camera permission. |
| 1003 | `microphonePermissionDenied` | No | User denied microphone permission. |
| 2001 | `networkError` | Yes | Network communication failure. |
| 2002 | `networkTimeout` | Yes | Network request timed out. |
| 3001 | `sessionExpired` | No | Session expired (15-minute limit). Start a new session. |
| 3002 | `uploadFailed` | Yes | Data upload to server failed. |
| 4001 | `captureFailed` | No | Camera frame capture failed. |
| 4002 | `encodingFailed` | No | Frame encoding failed. |
| 5001 | `invalidConfig` | No | Invalid SDK configuration (e.g. missing or malformed API key). |
| 6001 | `quotaExceeded` | No | Organization verification quota exceeded. |
| 7001 | `sdkNotInitialized` | No | `initialize()` was not called before a verification method. |
| 8001 | `sessionCancelled` | No | User cancelled the verification session. |

### UseSenseError Properties

| Property | Type | Description |
|----------|------|-------------|
| `code` | `int` | Numeric error code from the table above. |
| `message` | `String` | Human-readable error description. |
| `serverCode` | `String?` | Server-specific error code, if available. |
| `isRetryable` | `bool` | Whether the operation can be retried. |
| `details` | `Map<String, String>?` | Additional context about the error. |

---

## Server-Side Webhook Verification

> **CRITICAL:** The SDK result returned to the client is for UI feedback only. Verification scores are intentionally excluded from the client response. **Never** grant or deny access based on the SDK-side `decision` alone. The authoritative verdict is delivered to your backend via an HMAC-SHA256 signed webhook.

### How It Works

1. The SDK returns a `UseSenseResult` to your Flutter app with a preliminary `decision`.
2. Your app shows appropriate UI feedback (success, rejection, or pending review).
3. UseSense sends a webhook `POST` request to your configured endpoint with the full session result, including scores and risk signals.
4. Your backend verifies the webhook signature and applies the final access-control decision.

### Webhook Payload Structure

```json
{
  "event": "session.completed",
  "session_id": "ses_abc123",
  "session_type": "enrollment",
  "identity_id": "idt_xyz789",
  "decision": "APPROVE",
  "timestamp": "2025-01-15T10:30:00Z",
  "scores": {
    "deep_sense": 0.95,
    "live_sense": 0.98,
    "match_sense": 0.92
  },
  "risk_signals": [],
  "metadata": {
    "tier": "premium"
  }
}
```

### Signature Verification

Every webhook includes an `X-UseSense-Signature` header containing an HMAC-SHA256 signature computed over the raw request body using your webhook secret.

#### Node.js

```javascript
const crypto = require('crypto');

function verifyWebhook(requestBody, signatureHeader, webhookSecret) {
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(requestBody, 'utf8')
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signatureHeader),
    Buffer.from(expected),
  );
}

// Express middleware
app.post('/webhooks/usesense', express.raw({ type: '*/*' }), (req, res) => {
  const signature = req.headers['x-usesense-signature'];
  if (!verifyWebhook(req.body, signature, process.env.USESENSE_WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  const payload = JSON.parse(req.body);
  const { session_id, decision } = payload;

  // Apply your access-control logic here
  if (decision === 'APPROVE') {
    // Grant access
  }

  res.status(200).send('OK');
});
```

#### Python

```python
import hmac
import hashlib

def verify_webhook(request_body: bytes, signature: str, webhook_secret: str) -> bool:
    expected = hmac.new(
        webhook_secret.encode('utf-8'),
        request_body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(signature, expected)

# Flask example
@app.route('/webhooks/usesense', methods=['POST'])
def handle_usesense_webhook():
    signature = request.headers.get('X-UseSense-Signature')
    if not verify_webhook(request.data, signature, os.environ['USESENSE_WEBHOOK_SECRET']):
        abort(401)

    payload = request.get_json()
    session_id = payload['session_id']
    decision = payload['decision']

    # Apply your access-control logic here
    if decision == 'APPROVE':
        # Grant access
        pass

    return 'OK', 200
```

#### Go

```go
package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"
	"os"
)

func verifyWebhook(body []byte, signature, secret string) bool {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(signature), []byte(expected))
}

func webhookHandler(w http.ResponseWriter, r *http.Request) {
	body, _ := io.ReadAll(r.Body)
	signature := r.Header.Get("X-UseSense-Signature")
	secret := os.Getenv("USESENSE_WEBHOOK_SECRET")

	if !verifyWebhook(body, signature, secret) {
		http.Error(w, "Invalid signature", http.StatusUnauthorized)
		return
	}

	// Parse body and apply access-control logic
	w.WriteHeader(http.StatusOK)
}
```

---

## Sandbox vs Production

| | Sandbox | Production |
|-|---------|------------|
| API key prefix | `sk_*` or `dk_*` | `pk_*` |
| Environment | `UseSenseEnvironment.sandbox` | `UseSenseEnvironment.production` |
| Real verification | No (simulated responses) | Yes |
| Billing | Not charged | Counted against quota |
| Use case | Development and testing | Live end users |

When `environment` is set to `.auto` (the default), the SDK detects sandbox vs. production from the API key prefix.

```dart
// Sandbox -- for development
await useSense.initialize(
  UseSenseConfig(apiKey: 'sk_test_your_sandbox_key'),
);

// Production -- for live users
await useSense.initialize(
  UseSenseConfig(apiKey: 'pk_live_your_production_key'),
);
```

---

## Troubleshooting

### `sdkNotInitialized` error (code 7001)

`initialize()` must be called and awaited before calling any verification method. Verify that initialization completed without error.

### Camera permission denied on Android

Ensure `<uses-permission android:name="android.permission.CAMERA" />` is present in your `AndroidManifest.xml`. On Android 6.0+, runtime permission is requested automatically by the native SDK.

### Camera permission denied on iOS

Add `NSCameraUsageDescription` to your `Info.plist` with a non-empty description string. If the user previously denied permission, direct them to the system Settings app.

### iOS build fails with "Module 'UseSenseSDK' not found"

Run `cd ios && pod install` in your Flutter project. If the issue persists, try `pod repo update` and then `pod install` again.

### Events not received

Subscribe to `onEvent` **before** calling `startVerification()`. The stream is a broadcast stream -- late subscribers will miss events emitted before subscription.

### Session expired (code 3001)

Sessions expire after 15 minutes. If you receive this error, start a new verification session. Do not attempt to resume an expired session.

### Upload failures (code 3002)

Upload failures are retryable. Check network connectivity and retry the verification. Poor network conditions or very large payloads can cause transient upload failures.

### Play Integrity errors on Android

If you are using Android Play Integrity for device attestation, ensure `googleCloudProjectNumber` is set correctly in `UseSenseConfig` and that the Play Integrity API is enabled in your Google Cloud Console.

---

## Pigeon Code Generation

Platform channel communication uses [Pigeon](https://pub.dev/packages/pigeon) for type-safe, compile-time-checked interfaces. Generated files are checked into source control. If you modify the Pigeon schema, regenerate with:

```bash
cd usesense_flutter
dart run pigeon --input pigeons/usesense_api.dart
```

This generates:

- `lib/src/generated/usesense_api.g.dart` (Dart)
- `android/src/main/kotlin/com/usesense/flutter/UseSenseApi.g.kt` (Kotlin)
- `ios/Classes/UseSenseApi.g.swift` (Swift)

Do not edit generated files manually.

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

## Support

- **Documentation:** [docs.usesense.ai](https://docs.usesense.ai)
- **Dashboard:** [app.usesense.ai](https://app.usesense.ai)
- **Email:** [support@usesense.ai](mailto:support@usesense.ai)
- **Repository:** [github.com/usesense/usesense-flutter](https://github.com/usesense/usesense-flutter)
