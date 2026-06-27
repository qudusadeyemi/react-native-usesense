# UseSense React Native

React Native plugin for human presence verification. Wraps the native
UseSense iOS and Android SDKs into a single cross-platform package.

UseSense verifies that a real human — not a bot, deepfake, or replay
attack — is behind the camera during identity verification sessions.
Three independent pillars run in parallel on every session:

- **DeepSense** (Channel & Device Integrity): platform attestation,
  runtime integrity, capture pipeline analysis.
- **LiveSense** (Multimodal Proof-of-Life): facial dynamics, visual
  integrity, presentation attack detection, audio deepfake detection.
- **MatchSense** (Identity Collision Detection): 1:N face search
  on enrollment, 1:1 face verification on authentication,
  cross-identity risk scoring.

A final `decision` (`APPROVE` / `REJECT` / `MANUAL_REVIEW`) is
returned to the React Native side. **The SDK result is intentionally
redacted — pillar scores, the session signature, and the full verdict
metadata are NOT exposed to the client.** Those fields are delivered
to your backend via an HMAC-SHA256 signed webhook. Never trust the
client-side decision for access-control decisions; it's for UI
feedback only.

## Requirements

- React Native **0.73+** (New Architecture supported; Old
  Architecture via interop layer)
- iOS **15.0+** (native SDK requires iOS 15)
- Android **API 28+** (Android 9.0; native SDK requires API 28)
- Xcode **15.0+**
- Node.js **18+**
- Device with front-facing camera (required on both platforms)

## Installation

```bash
npm install react-native-usesense
# or
yarn add react-native-usesense
```

### iOS setup

```bash
cd ios && pod install
```

The native UseSense iOS SDK is installed automatically as a CocoaPod
dependency from the public CocoaPods trunk (`UseSenseSDK`, pinned to
`~> 4.2`). Add required permissions to your `Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>UseSense needs camera access to verify your identity.</string>

<!-- Only if your verification flow includes audio challenges -->
<key>NSMicrophoneUsageDescription</key>
<string>UseSense needs microphone access for voice verification.</string>
```

### Android setup

The native UseSense Android SDK is pulled automatically from Maven
Central (`ai.usesense:sdk:4.2.1`). `mavenCentral()` is in every
Android project by default, so no custom repository declaration is
needed.

Add required permissions to your `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

Auto-linking handles registration; no additional Gradle configuration
needed.

### New Architecture

The plugin supports React Native's New Architecture (Turbo Modules)
out of the box. If your project has the New Architecture enabled, the
plugin uses the Turbo Module path automatically. For projects still on
the Old Architecture (Bridge), the plugin works unchanged.

## Quick start

```typescript
import { UseSense } from 'react-native-usesense';

// 1. Initialize once, e.g. in your app entry point or the screen
//    that renders verification.
await UseSense.initialize({
  apiKey: 'sk_sandbox_your_key_here',
  environment: 'sandbox', // or 'production' or 'auto'
});

// 2. (Optional) Subscribe to lifecycle events for a progress UI.
const sub = UseSense.addListener((event) => {
  console.log(event.type, event.data);
});

// 3. Run a verification session. Presents a full-screen native
//    camera activity.
try {
  const result = await UseSense.startVerification({
    sessionType: 'enrollment',
  });
  console.log('Decision:', result.decision); // 'APPROVE' | 'REJECT' | 'MANUAL_REVIEW'
  console.log('Session ID:', result.sessionId);
} catch (error) {
  console.error('Verification failed:', error.code, error.message);
} finally {
  sub.remove();
}

// 4. Your backend receives the full signed verdict via webhook.
//    That's where you read pillar scores and make access decisions.
```

## White-labeling (Appearance & Copy)

The verification flow UI is fully customizable through two optional inputs you pass
on a flow run: `appearance` (`FlowAppearance`) and `copy` (`FlowCopy`). Values are
merged **SDK-init > dashboard (org settings) > built-in default**. Every field is
optional; anything you omit keeps the UseSense default.

You can set this two ways: in code (below), or no-code via the dashboard's
**Flows → Appearance** tab (saved on your org, delivered to every SDK and the hosted
pages, no redeploy).

Customizable surfaces: colors (plus dark-mode overrides), typography, shape and
button style, logo, background, icons/illustrations, the loader, and every
subject-facing string plus privacy copy.

```typescript
import { UseSenseFlows, FlowAppearance, FlowCopy } from 'react-native-usesense';

const appearance: FlowAppearance = {
  colors: { primary: '#E4002B' },
  shape:  { buttonStyle: 'outline' },
};
const copy: FlowCopy = {
  result: { successTitle: "You're verified" },
};

await UseSenseFlows.runFlow({ flowRunId, sdkToken, appearance, copy });
```

Full reference: [`docs/WHITE_LABEL.md` in the web SDK](https://github.com/qudusadeyemi/usesense-web-sdk/blob/main/docs/WHITE_LABEL.md).

## Configuration

```typescript
interface UseSenseConfig {
  apiKey: string;
  environment?: 'sandbox' | 'production' | 'auto'; // default: 'auto'
  apiEndpoint?: string;       // default: https://api.usesense.ai/v1
  branding?: BrandingConfig;  // optional UI customization
}

interface BrandingConfig {
  logoUrl?: string;
  primaryColor?: string;     // hex, e.g. '#4F7CFF'
  buttonRadius?: number;     // in dp
  fontFamily?: string;
  displayName?: string;      // Android only
  redirectUrl?: string;      // Android only
}
```

`environment: 'auto'` (the default) detects the environment from the
API key prefix: `sk_sandbox_*` / `pk_sandbox_*` → sandbox,
`sk_prod_*` / `pk_prod_*` → production. Set it explicitly if you want
to override the auto-detection.

## Session types

### Enrollment

First-time face registration. The system captures the user's face,
runs a 1:N duplicate scan via MatchSense, and creates an identity
record if approved.

```typescript
const result = await UseSense.startVerification({
  sessionType: 'enrollment',
  externalUserId: 'user_12345', // your internal user ID
});

if (result.isApproved) {
  // Identity created. Store result.sessionId for reference; the
  // identity ID arrives on your backend via the webhook.
}
```

### Authentication

Returning user claims an existing identity. The system performs a
1:1 verification against the enrolled template, plus a 1:N
cross-identity scan to detect identity swaps. The `identityId` must
be an identity that was previously enrolled — your backend persisted
it when the enrollment webhook fired.

```typescript
const result = await UseSense.startVerification({
  sessionType: 'authentication',
  identityId: 'idn_abc123',
  externalUserId: 'user_12345',
});

if (result.isApproved) {
  // Identity verified. Proceed with login / transaction / action.
}
```

## Handling results

`UseSenseResult` is the **only** shape returned to JS. It contains
five fields and three convenience booleans:

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | `string` | Unique session identifier |
| `sessionType` | `string \| null` | `'enrollment'` or `'authentication'` |
| `identityId` | `string \| null` | Assigned identity ID (enrollment) or verified identity (authentication) |
| `decision` | `'APPROVE' \| 'REJECT' \| 'MANUAL_REVIEW'` | Final decision from the server |
| `timestamp` | `string` | ISO 8601 timestamp |
| `isApproved` | `boolean` | Convenience: `decision === 'APPROVE'` |
| `isRejected` | `boolean` | Convenience: `decision === 'REJECT'` |
| `isPendingReview` | `boolean` | Convenience: `decision === 'MANUAL_REVIEW'` |

**Pillar scores, the fused confidence value, the session signature,
and the full verdict metadata are intentionally NOT returned across
the bridge.** Consume them via the signed webhook delivered to your
backend. This design prevents client-side reverse-engineering of the
scoring logic and forces access-control decisions onto the backend
where they belong.

```tsx
import React from 'react';
import { View, Button } from 'react-native';
import { UseSense, UseSenseResult } from 'react-native-usesense';

function VerificationScreen({ navigation }) {
  const handleVerify = async () => {
    try {
      const result = await UseSense.startVerification({
        sessionType: 'enrollment',
      });

      if (result.isApproved) {
        navigation.navigate('Home');
      } else if (result.isRejected) {
        navigation.navigate('Retry', { sessionId: result.sessionId });
      } else if (result.isPendingReview) {
        navigation.navigate('PendingReview', { sessionId: result.sessionId });
      }
    } catch (error) {
      console.error('Session failed:', error.code);
    }
  };

  return (
    <View>
      <Button title="Verify Identity" onPress={handleVerify} />
    </View>
  );
}
```

## Events

Subscribe to real-time lifecycle events via `UseSense.addListener`.
Events flow from both iOS and Android in the same canonical
`UPPER_SNAKE_CASE` shape so you can key off `event.type` without any
platform branching.

```typescript
import { UseSense, UseSenseEvent } from 'react-native-usesense';

const subscription = UseSense.addListener((event: UseSenseEvent) => {
  switch (event.type) {
    case 'SESSION_CREATED':
      console.log('Session started:', event.data);
      break;
    case 'PERMISSIONS_REQUESTED':
    case 'PERMISSIONS_GRANTED':
    case 'PERMISSIONS_DENIED':
      console.log('Permissions:', event.type);
      break;
    case 'CAPTURE_STARTED':
    case 'FRAME_CAPTURED':
    case 'CAPTURE_COMPLETED':
      // Update your capture progress UI
      break;
    case 'CHALLENGE_STARTED':
    case 'CHALLENGE_COMPLETED':
      console.log('Challenge:', event.data);
      break;
    case 'UPLOAD_STARTED':
    case 'UPLOAD_PROGRESS':
    case 'UPLOAD_COMPLETED':
      // Show upload spinner
      break;
    case 'DECISION_RECEIVED':
      console.log('Verdict received from server');
      break;
    case 'ERROR':
      console.error('SDK error:', event.data);
      break;
  }
});

// Later, when the screen unmounts:
subscription.remove();
```

Full event list: `SESSION_CREATED`, `PERMISSIONS_REQUESTED`,
`PERMISSIONS_GRANTED`, `PERMISSIONS_DENIED`, `CAPTURE_STARTED`,
`FRAME_CAPTURED`, `CAPTURE_COMPLETED`, `AUDIO_RECORD_STARTED`,
`AUDIO_RECORD_COMPLETED`, `CHALLENGE_STARTED`, `CHALLENGE_COMPLETED`,
`UPLOAD_STARTED`, `UPLOAD_PROGRESS`, `UPLOAD_COMPLETED`,
`COMPLETE_STARTED`, `DECISION_RECEIVED`, `IMAGE_QUALITY_CHECK`,
`ERROR`.

## Error handling

`UseSense.startVerification` rejects with a `UseSenseError` on
failure. Codes are uppercase strings matching the native SDK's
canonical codes, plus a small set of bridge-specific codes
(`session_cancelled`, `sdk_not_initialized`, `no_view_controller`,
`invalid_config`).

```typescript
import { UseSense, UseSenseError } from 'react-native-usesense';

try {
  await UseSense.startVerification({ sessionType: 'enrollment' });
} catch (err) {
  const error = err as UseSenseError;
  switch (error.code) {
    case 'session_cancelled':
    case 'USER_CANCELLED':
      // User tapped cancel / backed out. Silent.
      break;
    case 'CAMERA_PERMISSION_DENIED':
      // Direct the user to app settings.
      break;
    case 'NETWORK_ERROR':
    case 'NETWORK_TIMEOUT':
      // Retry with exponential backoff.
      break;
    case 'SESSION_EXPIRED':
      // Start a fresh session.
      break;
    case 'QUOTA_EXCEEDED':
    case 'INSUFFICIENT_CREDITS':
      // Rate-limited or out of credits. Surface to the user.
      break;
    case 'INVALID_CONFIG':
    case 'sdk_not_initialized':
      // Check your API key and that initialize() ran successfully.
      break;
    default:
      // UNKNOWN_ERROR, SERVER_ERROR, SERVICE_UNAVAILABLE, etc.
  }
}
```

Full error code reference: see the [native iOS SDK's
`UseSenseErrorCode`](https://github.com/qudusadeyemi/usesense-ios-sdk/blob/main/Sources/UseSense/UseSenseError.swift)
and the [native Android SDK's
`UseSenseError`](https://github.com/qudusadeyemi/usesense-android-sdk/blob/main/sdk/src/main/java/com/usesense/sdk/UseSenseError.kt).

## Security model: always verify the webhook

**The most important section in this document.** Repeat after me:

1. **NEVER** trust the SDK result for access-control decisions. The
   SDK runs on the user's device and can be tampered with.
2. The definitive verdict arrives at your backend via an HMAC-SHA256
   signed webhook at the endpoint you configured in the Watchtower
   dashboard.
3. Always verify the webhook signature before acting on it. Reject
   any webhook whose signature doesn't match — an attacker with the
   endpoint URL but not the signing secret would otherwise be able
   to forge approved verdicts.
4. Use the webhook's pillar scores (`channelTrustScore`,
   `livenessScore`, `matchSenseRiskScore`, `presenceConfidence`) to
   make your actual access decision. The client-side `decision`
   field is a hint, not the source of truth.

See the native SDKs' READMEs for webhook verification examples in
Node.js, Python, and Go.

## Full API reference

### `UseSense.initialize(config: UseSenseConfig): Promise<void>`

Initializes the plugin. Must be called once before any other method.
Calling again with a different key or environment replaces the
previous configuration. Throws if `apiKey` is empty or the native
side fails to initialize.

### `UseSense.startVerification(request: VerificationRequest): Promise<UseSenseResult>`

Runs a verification session. Presents a full-screen native camera
activity. Resolves when the session completes or rejects on failure
(including user cancellation). The returned `UseSenseResult` is
always the redacted five-field shape.

### `UseSense.addListener(callback: (event) => void): UseSenseSubscription`

Subscribes to lifecycle events. Returns a handle with a `remove()`
method. Call `addListener` **before** `startVerification` so the
subscription captures the earliest events.

### `UseSense.reset(): Promise<void>`

Clears all event listeners and releases the native client. Call this
when you want to re-initialize with a different key, or during test
teardown. Not required during normal usage.

### `UseSense.isInitialized(): Promise<boolean>`

Returns whether the native plugin has an active SDK client. Use this
for feature-flagging UI that should only show when the SDK is ready.

## Example app

See [example/](./example) for a full-featured demo app. Paste your
sandbox or production API key into the UI at runtime (persisted
across launches via AsyncStorage) and run on a physical device. The
example shows the canonical integration pattern for `initialize`,
`startVerification`, event subscription, result display, and error
handling.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

Proprietary. See [LICENSE](LICENSE).

## Support

- Documentation: https://watchtower.usesense.ai/developer-docs
- Dashboard: https://watchtower.usesense.ai
- Email: support@usesense.ai
- Issues: https://github.com/qudusadeyemi/react-native-usesense/issues
