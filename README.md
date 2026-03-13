# UseSense React Native

React Native plugin for human presence verification. Wraps the native UseSense iOS and Android SDKs into a single cross-platform package.

UseSense verifies that a real human — not a bot, deepfake, or replay attack — is behind the camera during identity verification sessions. Three independent pillars run in parallel on every session:

- **DeepSense** (Channel & Device Integrity): Platform attestation, runtime integrity, capture pipeline analysis. Produces a `channelTrustScore` (0-100).
- **LiveSense** (Multimodal Proof-of-Life): Facial dynamics, visual integrity, presentation attack detection, audio deepfake detection. Produces a `livenessScore` (0-100).
- **MatchSense** (Identity Collision Detection): 1:N face search (enrollment), 1:1 face verification (authentication), cross-identity risk scoring. Produces a `matchSenseRiskScore` (0-100).

A fused `presenceConfidence` score and a final `decision` (`approved` / `rejected` / `manual_review`) are returned. The definitive verdict is delivered via HMAC-SHA256 signed webhook to your backend. **The SDK result is for UI feedback only and must never be trusted for access-control decisions.**

## Requirements

- React Native 0.73+ (New Architecture supported; Old Architecture via interop layer)
- iOS 14.0+
- Android API 24+ (Android 7.0)
- Xcode 15.0+
- Node.js 18+
- Device with front-facing camera (required on both platforms)

## Installation

```bash
npm install react-native-usesense
# or
yarn add react-native-usesense
```

### iOS Setup

```bash
cd ios && pod install
```

The native UseSense iOS SDK is installed automatically as a CocoaPod dependency.

Add required permissions to your `Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>UseSense needs camera access to verify your identity.</string>

<!-- Only if enableAudio is true -->
<key>NSMicrophoneUsageDescription</key>
<string>UseSense needs microphone access for voice verification.</string>

<!-- Optional, improves DeepSense accuracy -->
<key>NSMotionUsageDescription</key>
<string>UseSense uses motion data to improve verification accuracy.</string>
```

### Android Setup

The native UseSense Android SDK is pulled automatically via Maven Central.

Add required permissions to your `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.INTERNET" />
<!-- Only if enableAudio is true -->
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

No additional Gradle configuration needed. Auto-linking handles registration.

### New Architecture

The plugin supports React Native's New Architecture (Turbo Modules) out of the box. If your project has the New Architecture enabled, the plugin uses the Turbo Module path automatically. No configuration needed.

For projects still on the Old Architecture (Bridge), the plugin includes an interop layer and works without changes.

## Quick Start

```typescript
import { UseSense } from 'react-native-usesense';

// 1. Initialize (once, e.g. in App.tsx or app entry)
await UseSense.initialize({
  apiKey: 'your_sandbox_api_key',
  environment: 'sandbox',
});

// 2. Run a verification session
try {
  const result = await UseSense.startSession({
    sessionType: 'enrollment',
  });
  console.log('Decision:', result.decision);
  console.log('Liveness:', result.livenessScore);
  console.log('Channel Trust:', result.channelTrustScore);
  console.log('MatchSense Risk:', result.matchSenseRiskScore);
} catch (error) {
  console.error('Verification failed:', error.code, error.message);
}

// The definitive verdict arrives at your backend via webhook.
// The SDK result is for UI feedback only.
```

## Configuration

Full reference for `UseSenseConfig`:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `apiKey` | `string` | Yes | — | Your API key from the [UseSense dashboard](https://app.usesense.ai) |
| `environment` | `'production' \| 'sandbox'` | No | `'sandbox'` | Target environment |
| `organizationId` | `string` | No | — | Organization ID (inferred from API key) |
| `sessionType` | `'enrollment' \| 'authentication'` | No | `'enrollment'` | Default session type |
| `identityId` | `string` | No | — | Identity ID for authentication sessions |
| `challengePolicy` | `'standard' \| 'enhanced' \| 'adaptive'` | No | `'standard'` | Challenge difficulty policy |
| `enableAudio` | `boolean` | No | `false` | Enable audio capture for voice deepfake detection |
| `timeout` | `number` | No | `60000` | Maximum session duration in milliseconds |
| `metadata` | `Record<string, string>` | No | — | Custom key-value pairs attached to session |

## Session Types

### Enrollment

First-time face registration. The system indexes the user's face, performs a 1:N duplicate scan via MatchSense, and creates an identity record if approved.

```typescript
const result = await UseSense.startSession({
  sessionType: 'enrollment',
});

if (result.decision === 'approved') {
  // Identity created. Store result.sessionId for reference.
  console.log('Enrollment approved. Presence confidence:', result.presenceConfidence);
}
```

### Authentication

Returning user claims an existing identity. The system performs 1:1 verification against the enrolled template, plus a 1:N cross-identity scan.

```typescript
const result = await UseSense.startSession({
  sessionType: 'authentication',
  identityId: 'idn_abc123', // required for authentication
});

if (result.decision === 'approved') {
  console.log('Identity verified');
}
```

## Handling Results

`UseSenseResult` contains the full verification breakdown:

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | `string` | Unique session identifier |
| `decision` | `'approved' \| 'rejected' \| 'manual_review'` | Verification decision |
| `channelTrustScore` | `number` | DeepSense channel integrity score (0-100). Higher is more trusted. |
| `livenessScore` | `number` | LiveSense liveness score (0-100). Higher means more likely live. |
| `matchSenseRiskScore` | `number` | MatchSense risk score (0-100). Lower is better. |
| `presenceConfidence` | `number` | Fused presence confidence (0-100). Higher is more confident. |
| `reasons` | `string[]` | Reasons contributing to the decision |
| `ruleTriggered` | `string?` | Rule that triggered the decision, if any |
| `recommendedAction` | `string?` | Recommended action for the integrator |
| `sessionSignature` | `string` | Cryptographic signature for result verification |

Handle each decision type in your component:

```tsx
import React from 'react';
import { View, Text, Button } from 'react-native';
import { UseSense, UseSenseResult } from 'react-native-usesense';

function VerificationScreen({ navigation }) {
  const handleVerify = async () => {
    try {
      const result: UseSenseResult = await UseSense.startSession({
        sessionType: 'enrollment',
      });

      switch (result.decision) {
        case 'approved':
          navigation.navigate('Home');
          break;
        case 'rejected':
          navigation.navigate('Retry', { reasons: result.reasons });
          break;
        case 'manual_review':
          navigation.navigate('PendingReview', { sessionId: result.sessionId });
          break;
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

## Event Listening

Subscribe to real-time events during the verification lifecycle. Call `addListener()` before `startSession()` to receive all events.

```tsx
import { UseSense, UseSenseEvent } from 'react-native-usesense';
import { useEffect, useState } from 'react';

function VerificationScreen() {
  const [events, setEvents] = useState<UseSenseEvent[]>([]);

  useEffect(() => {
    const listener = UseSense.addListener((event) => {
      setEvents(prev => [...prev, event]);

      switch (event.type) {
        case 'session_started':
          console.log('Session:', event.sessionId);
          break;
        case 'challenge_presented':
          console.log('Challenge:', event.challengeType);
          break;
        case 'challenge_completed':
          console.log('Challenge completed:', event.challengeType);
          break;
        case 'processing':
          console.log('Stage:', event.stage); // 'deepsense' | 'livesense' | 'matchsense' | 'fusion'
          break;
        case 'session_completed':
          console.log('Result:', event.result.decision);
          break;
        case 'session_error':
          console.error('Error:', event.error.code);
          break;
      }
    });

    return () => listener.remove();
  }, []);

  // render events...
}
```

## Error Handling

All errors include a machine-readable `code` and a human-readable `message`.

| Code | Description | Recovery |
|------|-------------|----------|
| `camera_permission_denied` | Camera access not granted | Prompt user; link to device Settings via `Linking.openSettings()` |
| `microphone_permission_denied` | Microphone not granted (audio enabled) | Prompt or disable audio |
| `session_timeout` | Exceeded configured timeout | Retry with new session |
| `session_expired` | 15-minute server-side expiry | Start new session |
| `network_error` | API unreachable | Check connectivity, retry |
| `sdk_not_initialized` | `startSession()` before `initialize()` | Call `initialize()` at app startup |
| `invalid_config` | Missing or invalid config | Check `apiKey` and required fields |
| `invalid_api_key` | Key rejected by server | Verify in dashboard; check environment |
| `insufficient_credits` | Zero credit balance | Purchase credits in dashboard |
| `identity_not_found` | `identityId` doesn't exist | Verify identity was enrolled |
| `camera_unavailable` | No front camera found | Inform user |
| `device_not_supported` | Fails hardware requirements | Inform user |
| `session_cancelled` | Cancelled by user or programmatically | Handle gracefully |
| `play_integrity_unavailable` | (Android) Play Integrity API unavailable | DeepSense uses fallback signals |
| `server_error` | 5xx from UseSense API | Retry; contact support if persistent |

```typescript
import { UseSense, UseSenseError } from 'react-native-usesense';
import { Alert, Linking } from 'react-native';

async function verify() {
  try {
    const result = await UseSense.startSession({ sessionType: 'enrollment' });
    // handle result
  } catch (error) {
    const err = error as UseSenseError;

    switch (err.code) {
      case 'camera_permission_denied':
        Alert.alert(
          'Camera Required',
          'UseSense needs camera access to verify your identity.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
        break;

      case 'session_timeout':
      case 'session_expired':
      case 'network_error':
        Alert.alert('Try Again', 'The session could not be completed. Please try again.');
        break;

      case 'insufficient_credits':
        console.error('UseSense credit balance is zero');
        Alert.alert('Service Unavailable', 'Verification is temporarily unavailable.');
        break;

      case 'session_cancelled':
        // User cancelled -- no action needed
        break;

      default:
        Alert.alert('Error', err.message);
        break;
    }
  }
}
```

## Server-Side Webhook Verification

**Never trust the SDK result for access-control decisions.** The SDK response is for UI feedback only — showing the user a success or failure screen. The definitive verdict arrives at your backend via an HMAC-SHA256 signed webhook.

### Webhook Payload

```json
{
  "event": "session.completed",
  "session_id": "ses_abc123",
  "organization_id": "org_xyz",
  "timestamp": "2026-03-12T10:30:00Z",
  "data": {
    "decision": "approved",
    "channel_trust_score": 95,
    "liveness_score": 92,
    "matchsense_risk_score": 8,
    "presence_confidence": 94,
    "session_type": "enrollment",
    "identity_id": "idn_def456",
    "reasons": [],
    "rule_triggered": null,
    "session_signature": "sig_..."
  }
}
```

### Signature Verification — Node.js (Express)

```javascript
const crypto = require('crypto');

app.post('/webhooks/usesense', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-usesense-signature'];
  const timestamp = req.headers['x-usesense-timestamp'];

  const payload = `${timestamp}.${req.body}`;
  const expected = crypto
    .createHmac('sha256', process.env.USESENSE_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(req.body);

  if (event.event === 'session.completed') {
    const { decision, session_id } = event.data;
    // Update your database based on the definitive decision
  }

  res.status(200).send('OK');
});
```

### Signature Verification — Python (Flask)

```python
import hmac
import hashlib

@app.route('/webhooks/usesense', methods=['POST'])
def usesense_webhook():
    signature = request.headers.get('X-UseSense-Signature')
    timestamp = request.headers.get('X-UseSense-Timestamp')

    payload = f"{timestamp}.{request.data.decode()}"
    expected = hmac.new(
        USESENSE_WEBHOOK_SECRET.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(signature, expected):
        return 'Invalid signature', 401

    event = request.get_json()

    if event['event'] == 'session.completed':
        decision = event['data']['decision']
        session_id = event['session_id']
        # Update your database based on the definitive decision

    return 'OK', 200
```

### Signature Verification — Go (net/http)

```go
func useSenseWebhook(w http.ResponseWriter, r *http.Request) {
    signature := r.Header.Get("X-UseSense-Signature")
    timestamp := r.Header.Get("X-UseSense-Timestamp")

    body, err := io.ReadAll(r.Body)
    if err != nil {
        http.Error(w, "Bad request", http.StatusBadRequest)
        return
    }

    payload := fmt.Sprintf("%s.%s", timestamp, string(body))
    mac := hmac.New(sha256.New, []byte(os.Getenv("USESENSE_WEBHOOK_SECRET")))
    mac.Write([]byte(payload))
    expected := hex.EncodeToString(mac.Sum(nil))

    if !hmac.Equal([]byte(signature), []byte(expected)) {
        http.Error(w, "Invalid signature", http.StatusUnauthorized)
        return
    }

    var event map[string]interface{}
    json.Unmarshal(body, &event)

    // Process the event
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("OK"))
}
```

## Sandbox vs Production

| | Sandbox | Production |
|---|---------|-----------|
| Cost | Free, unlimited | Credit-based |
| API keys | Separate | Separate |
| Features | All features identical | All features identical |
| Deduplication | Elevated risk scores (shared face collection) | Isolated per organization |

Switch by changing `environment` in config:

```typescript
await UseSense.initialize({
  apiKey: process.env.USESENSE_API_KEY,
  environment: __DEV__ ? 'sandbox' : 'production',
});
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Module 'react-native-usesense' not found` | Run `pod install` for iOS; rebuild for Android; verify auto-linking |
| `Camera permission denied on iOS` | Add `NSCameraUsageDescription` to `Info.plist` |
| `Build fails on iOS with 'pod not found'` | Run `pod repo update` then `pod install` |
| `Build fails on Android with dependency resolution error` | Ensure `mavenCentral()` is in your project-level `repositories` |
| `Session always times out` | Check network connectivity; increase `timeout` in config |
| `Deduplication always returns high risk on sandbox` | Expected — sandbox uses a shared face collection |
| `Events not firing` | Ensure `addListener()` is called before `startSession()` |
| `New Architecture errors` | Ensure codegen ran: `cd android && ./gradlew generateCodegenArtifactsFromSchema` |
| `App crashes on Android with TransactionTooLargeException` | Update to latest plugin version |

## TypeScript Support

The plugin ships with full TypeScript declarations. All types are exported from the main entry point:

```typescript
import {
  UseSense,
  UseSenseConfig,
  UseSenseResult,
  UseSenseError,
  UseSenseEvent,
  UseSenseDecision,
  UseSenseEnvironment,
  SessionType,
  ChallengePolicy,
  ProcessingStage,
  StartSessionOptions,
  SessionStatus,
  UseSenseSubscription,
} from 'react-native-usesense';
```

## API Reference

### `UseSense.initialize(config: UseSenseConfig): Promise<void>`

Initialize the plugin. Must be called once before any other method.

### `UseSense.startSession(options?: StartSessionOptions): Promise<UseSenseResult>`

Start a verification session. Presents a full-screen native camera UI.

### `UseSense.cancelSession(): Promise<void>`

Cancel an in-progress verification session.

### `UseSense.getSessionStatus(sessionId: string): Promise<SessionStatus>`

Get the status of a verification session by ID.

### `UseSense.addListener(callback: (event: UseSenseEvent) => void): UseSenseSubscription`

Subscribe to real-time events during the verification lifecycle.

### `UseSense.getSdkVersion(): string`

Get the native SDK version string.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## License

Proprietary. See [LICENSE](./LICENSE) file.

## Support

- Documentation: [https://docs.usesense.ai](https://docs.usesense.ai)
- Dashboard: [https://app.usesense.ai](https://app.usesense.ai)
- Email: [support@usesense.ai](mailto:support@usesense.ai)
