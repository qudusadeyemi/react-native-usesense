# Sense React Native

React Native plugin for human presence verification. Wraps the native
Sense iOS and Android SDKs into a single cross-platform package.

Sense verifies that a real human — not a bot, deepfake, or replay
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

The native Sense iOS SDK is installed automatically as a CocoaPod
dependency from the public CocoaPods trunk (`UseSenseSDK`, pinned to
`~> 4.14.0`). Add required permissions to your `Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Sense needs camera access to verify your identity.</string>

<!-- Only if your verification flow includes audio challenges -->
<key>NSMicrophoneUsageDescription</key>
<string>Sense needs microphone access for voice verification.</string>
```

### Android setup

The native Sense Android SDK is pulled automatically from Maven
Central (`ai.usesense:sdk`). `mavenCentral()` is in every Android
project by default, so no custom repository declaration is needed.

Add required permissions to your `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

**One Gradle setting is required** (auto-linking handles module
registration). The native SDK requires Android API 28 — set it in your
app's `android/build.gradle`:

```groovy
ext {
    minSdkVersion = 28
}
```

Without it, a release build fails at manifest merge
(`minSdkVersion … cannot be smaller than 28`).

### New Architecture

The plugin works on **both** the New Architecture and the Old (Bridge)
Architecture, with no configuration difference. It's a native bridge
module, and RN's built-in legacy interop layer (on by default since RN
0.74) runs it transparently under the New Architecture — you don't need
to enable or change anything.

CI verifies both paths on every change: one job builds a release APK on
the Old Architecture, another builds a fresh RN app with the New
Architecture enabled. (It is not a native TurboModule — that migration
isn't required for New-Arch support and isn't currently planned.)

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

The capture screens and the Flow runner are customizable through two optional
inputs: `appearance` (`FlowAppearance`) and `copy` (`FlowCopy`). Pass them on
`branding` at `initialize` for sessions (from 2.7.0), or on a flow run. Values are
merged per field: **code > dashboard (Flow, then org) > built-in default**. Every
field is optional; anything you omit keeps the dashboard value, then the Sense default.

You can set this two ways: in code (below), or no-code in the dashboard's
**Brand** page (delivered to every SDK and the hosted pages, no redeploy).

Customizable surfaces: colors (plus dark-mode overrides) and `mode`, typography,
shape and button style, logo, background, icons/illustrations, the loader, camera
accents (`appearance.capture`: scan ring, extra-check ring, warning), every
capture-screen string (`copy.capture`), and the Flow runner's strings plus
privacy copy. The camera screens stay dark; brand colours appear there as accents.

Sessions:

```typescript
import { UseSense } from 'react-native-usesense';

await UseSense.initialize({
  apiKey: 'sk_sandbox_...',
  branding: {
    appearance: {
      mode: 'light',
      colors: { primary: '#E4002B' },
      capture: { ring: '#FF5A6E' },
    },
    copy: {
      capture: {
        primer: { selfieTitle: 'Take a quick selfie' },
        extraCheck: { headTurnNext: 'Now to the {side}' },
      },
    },
  },
});
```

Flows:

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

## Silent device check (Your KYC)

Keep your own KYC provider's SDK and run `deviceCheck()` next to it. No UI, no camera and
no permission prompt: Sense scores the device and links the result to your provider's
result when it reaches your Your KYC connection.

1. **Your server** creates a check with your API key (never ship the key in the app):

   ```bash
   curl -X POST https://api.usesense.ai/v1/device-checks \
     -H "x-api-key: sk_your_key" -H "content-type: application/json" \
     -d '{ "user_ref": "cust_88211", "platform": "android" }'   # or "ios"
   # 201 { "deviceCheckId": "dc_...", "token": "dct_...", "nonce": "dn_...", "expiresAt": "..." }
   ```

2. **The app** runs the check around your provider, passing `deviceCheckId` into the
   provider's metadata (map it to **Device check id** on the connection), or use the same
   `user_ref` for both:

   ```ts
   import { deviceCheck } from 'react-native-usesense';

   const check = deviceCheck({ deviceCheckId, token, nonce });

   const started = await check.start(); // before your provider's SDK opens
   if (!started.ok) console.warn('device check:', started.error.code);

   await provider.start({ metadata: { device_check_id: deviceCheckId } });

   await check.finish(); // after it closes
   check.dispose();
   ```

`start()` and `finish()` never reject. They resolve to `{ ok: true, phase }` or
`{ ok: false, phase, error: { code, message, retryable } }`. The codes are the same on iOS
and Android (and match the web SDK): `invalid_token` and `token_expired` (create a new
check; a token lasts 15 minutes), `nonce_mismatch`, `invalid_input`, `out_of_order` (start
once, then finish once), `not_found`, `unavailable`, `network_error`, `timeout` (retried
once by the SDK already), `invalid_config`, `cancelled`. The app is never told the score;
read it on your server with `GET /v1/device-checks/:id`. Needs native SDKs iOS 4.13.1 and
Android 4.15.0 or later (this package pins newer ones).

## Configuration

```typescript
interface UseSenseConfig {
  apiKey?: string;            // leave out when you only use client tokens
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
  appearance?: FlowAppearance; // every capture screen; beats the fields above
  copy?: FlowCopy;             // capture strings under copy.capture
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

### Liveness only

Checks that a real person is in front of the camera, and nothing
else. No identity is created, no face is enrolled and no 1:N
duplicate search runs. A liveness session costs 1 credit. Do not
pass an `identityId`: `startVerification` rejects with
`INVALID_CONFIG` (the server rejects it with a 400).

```typescript
const result = await UseSense.startVerification({
  sessionType: 'liveness',
  externalUserId: 'user_12345', // optional, for your own records
});

if (result.isApproved) {
  // A live person completed the check.
}
```

## Keep the API key off the device (client token)

Ship no API key in the app. Your server creates the session and hands
the app a single-use client token; the SDK exchanges it and runs the
same capture, screens, branding and result as `startVerification`.

1. Your server calls `POST /v1/sessions/create-token` with its secret
   key, the `session_type` and anything else the session needs
   (`identity_id`, a reference image, metadata). It gets back a
   `client_token` (single-use, short-lived).
2. It sends the `client_token` to the app.
3. The app starts the capture from it:

```typescript
// Optional: environment, endpoint, branding and capture options. No key.
await UseSense.initialize({ environment: 'sandbox' });

const result = await UseSense.startVerificationWithToken({
  clientToken, // from your server
  sessionType: 'enrollment', // the type your server passed to create-token
});
```

- `initialize` is optional for token starts. When you call it, pass the
  `environment` the token was created in (the token is looked up in
  that environment; with no key there is no key prefix to detect it
  from, so it defaults to production).
- The token is single-use. After a rejection or an error, get a new
  token from your server; the result screen offers no "Try again".
- Exchange failures reject like any session error; Android also sets
  `serverCode` to `token_not_found`, `token_expired` or
  `token_already_used`.
- With no API key, `startVerification` and `<UseSenseView request />`
  reject with `INVALID_CONFIG`.

## Embed the capture in your own screen

`<UseSenseView />` draws the capture inside your layout instead of a
full-screen native screen: the same session, screens, branding (your
code wins over the dashboard), copy and result. It hosts the native
Android `UseSenseFragment` and the iOS `UseSenseViewController`.

```tsx
import { UseSenseView } from 'react-native-usesense';

function VerifyScreen({ navigation, clientToken }) {
  return (
    <UseSenseView
      style={{ flex: 1 }}
      clientToken={clientToken}      // or: request={{ sessionType: 'enrollment' }}
      sessionType="enrollment"
      onComplete={(result) => navigation.replace('Done', { result })}
      onError={(error) => navigation.replace('Failed', { error })}
      onCancel={() => navigation.goBack()}
    />
  );
}
```

- Pass **either** `request` (a session on the API key from `initialize`,
  same fields as `startVerification`) **or** `clientToken` +
  `sessionType`. Invalid props (both, neither, a blank token, liveness
  with an `identityId`) call `onError` with `INVALID_CONFIG` and render
  nothing.
- The session starts when the view mounts and runs once. Later prop
  changes are ignored; remount (for example with a new `key`) to start
  another.
- Exactly one of `onComplete`, `onError`, `onCancel` fires; leave the
  screen or unmount the view in it. `onComplete` fires when the person
  leaves the result screen. `onError` gets the same `{ code, message,
  isRetryable }` the promise methods reject with.
- Unmounting mid-capture (leaving the screen) ends the capture with no
  callback.
- A client token is single-use. When the session ends, move on with
  `replace` (or reset the stack) rather than pushing the next screen over
  the capture, so Back cannot return to it. A view mounted again with a
  token whose session already ended reports `onError` with
  `TOKEN_ALREADY_USED` at once and starts nothing.
- The SDK asks for camera and microphone permission itself.
- Give the view the space the camera should fill; full screen works
  best. Lifecycle events still arrive through `UseSense.addListener`.
- Android: render it in the Activity's own window. Inside a React
  Native `<Modal>` (a separate dialog window) it reports `onError` with
  `unsupported_container`. Keep the React Native template's
  `android:configChanges` on `MainActivity`, so a rotation or theme
  change does not recreate the Activity under the capture.
- Works on the Old and the New Architecture (a legacy view manager,
  run by React Native's interop layer).

## Remote enrollment and verification

Run a hosted remote enrollment or remote verification by its ID (from a
link your server or the dashboard created). The native SDK loads it,
runs the capture and its result screen, full screen. Needs `initialize`.

```typescript
const { decision } = await UseSense.startRemoteEnrollment('enr_abc123');
// 'APPROVE' | 'REJECT' | 'MANUAL_REVIEW'

const { decision: outcome } = await UseSense.startRemoteVerification('rsess_abc123');
// also 'DISPUTED' when the person disputes the action instead of verifying it
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

`startVerification`, `startVerificationWithToken`, the remote flows and
`<UseSenseView onError>` all report a `UseSenseError`:

```typescript
interface UseSenseError {
  code: string;         // a named code from the table below, the same on iOS and Android
  message: string;      // human-readable
  isRetryable?: boolean;
  serverCode?: string;  // the server's own code when it sent one, e.g. 'token_expired'
  nativeCode?: string;  // the platform's raw code, e.g. '410' on Android, 'TOKEN_EXPIRED' on iOS
}
```

The iOS SDK reports named codes; the Android SDK reports numbers (an HTTP
status, or a client code such as `1002`). The plugin maps Android's
numbers to the iOS names, so you switch on one set of codes. The raw
value stays in `nativeCode` for logs and support.

```typescript
import { UseSense, UseSenseError } from 'react-native-usesense';

try {
  await UseSense.startVerification({ sessionType: 'enrollment' });
} catch (err) {
  const error = err as UseSenseError;
  switch (error.code) {
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
    case 'TOKEN_EXPIRED':
    case 'TOKEN_ALREADY_USED':
      // Client token: ask your server for a new one.
      break;
    case 'QUOTA_EXCEEDED':
    case 'INSUFFICIENT_CREDITS':
      // Rate-limited or out of credits. Surface to the user.
      break;
    case 'INVALID_CONFIG':
    case 'SDK_NOT_INITIALIZED':
      // Check your API key / client token and that initialize() ran.
      break;
    default:
      // SERVER_ERROR, SERVICE_UNAVAILABLE, UNKNOWN_ERROR, etc.
  }
}
```

| `code` | Meaning | Android `nativeCode` |
|---|---|---|
| `USER_CANCELLED` | The person backed out | `CANCELLED` (iOS: `session_cancelled`) |
| `CAMERA_UNAVAILABLE` | No usable front camera | `1001` |
| `CAMERA_PERMISSION_DENIED` | Camera permission refused | `1002` |
| `MIC_PERMISSION_DENIED` | Microphone permission refused | `1003` |
| `NETWORK_ERROR` | No connection or the request failed | `2001` |
| `NETWORK_TIMEOUT` | A request timed out | `2002` |
| `SESSION_EXPIRED` | The session expired | `3001`, `401` + `session_expired`, `410` |
| `UPLOAD_FAILED` | The capture upload failed after retries | `3002` |
| `CAPTURE_FAILED` | Frame capture failed | `4001` |
| `NO_FRAMES_CAPTURED` | The camera returned no images | `4001` + `NO_FRAMES_CAPTURED` |
| `ENCODING_FAILED` | Frame encoding failed | `4002` |
| `INVALID_CONFIG` | Bad configuration or arguments (also raised in JS before the bridge) | `5001` |
| `QUOTA_EXCEEDED` | Rate limited | `6001`, `429` |
| `TIMEOUT` | Finishing the verification took too long | `7001` |
| `CAPTURE_TIMEOUT` | The camera stopped responding | `7002` |
| `UPLOAD_TIMEOUT` | Sending the capture took too long | `7003` |
| `INVALID_REQUEST` | The server rejected the request | `400` |
| `UNAUTHORIZED` | Bad or missing API key | `401`, `403` |
| `INVALID_TOKEN` | Session token invalid | `401` + `invalid_token` |
| `NONCE_MISMATCH` | Session check failed | `401` + `nonce_mismatch` |
| `INSUFFICIENT_CREDITS` | Out of credits | `402` |
| `SESSION_NOT_FOUND` | Session, or client token, not found | `404` (`serverCode` `token_not_found` for a token) |
| `IDENTITY_NOT_FOUND` | The `identityId` does not exist | `404` + `identity_not_found` |
| `TOKEN_ALREADY_USED` | The client token was already exchanged | `409` |
| `TOKEN_EXPIRED` | The client token expired | `410` + `token_expired` |
| `SERVER_ERROR` | Server error | `500`, other `5xx` |
| `SERVICE_UNAVAILABLE` | Service unavailable | `503` |
| `SDK_NOT_INITIALIZED` | `initialize()` was not called | `sdk_not_initialized` |
| `NO_HOST_SCREEN` | No Activity / view controller to show the capture | `NO_ACTIVITY`, `no_activity` (iOS: `no_view_controller`) |
| `UNSUPPORTED_CONTAINER` | `<UseSenseView>` inside a React Native `<Modal>` (Android) | `unsupported_container` |
| `UNKNOWN_ERROR` | Anything else | other numbers |

iOS can also report `FACE_NOT_DETECTED`, `LOW_LIGHT` and `RESPONSE_INVALID`
(the result could not be read). The type `UseSenseErrorCode` lists every
code, and `normaliseError(raw)` is exported if you call the native module
yourself.

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

Initializes the plugin. Must be called once before any other method
(client-token starts excepted). Calling again with a different key or
environment replaces the previous configuration. `apiKey` may be left
out when the app only starts from client tokens. Throws if the native
side fails to initialize.

### `UseSense.startVerification(request: VerificationRequest): Promise<UseSenseResult>`

Runs a verification session. Presents a full-screen native camera
activity. Resolves when the session completes or rejects on failure
(including user cancellation). The returned `UseSenseResult` is
always the redacted five-field shape.

### `UseSense.startVerificationWithToken(request: TokenVerificationRequest): Promise<UseSenseResult>`

Runs a verification from a single-use `clientToken` (with its
`sessionType`), so no API key is on the device. Same capture, result
and errors as `startVerification`. See
[Keep the API key off the device](#keep-the-api-key-off-the-device-client-token).

### `UseSense.startRemoteEnrollment(remoteEnrollmentId: string): Promise<RemoteFlowResult>`

### `UseSense.startRemoteVerification(remoteSessionId: string): Promise<RemoteFlowResult>`

Run a hosted remote enrollment or verification by ID and resolve with
`{ decision }` (`DISPUTED` possible for verification). Reject on
failure or cancellation.

### `<UseSenseView />`

The embedded capture. Props: `request` **or** `clientToken` +
`sessionType`; `onComplete(result)`, `onError(error)`, `onCancel()`;
any `View` props (`style`, `testID`). See
[Embed the capture in your own screen](#embed-the-capture-in-your-own-screen).

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
handling, plus a client-token start (paste a token from your server,
or mint a demo one with the key), the embedded `<UseSenseView />`
(full screen or embedded, API key or token) and remote enrollment /
verification by ID.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

Proprietary. See [LICENSE](LICENSE).

## Support

- Documentation: https://watchtower.usesense.ai/developer-docs
- Dashboard: https://watchtower.usesense.ai
- Email: support@usesense.ai
- Issues: https://github.com/qudusadeyemi/react-native-usesense/issues
