# UseSense React Native Integration Guide

## How Verification Works

1. Your app initializes the UseSense plugin with your API key
2. Call `UseSense.startSession()` when you need to verify a user
3. The plugin launches a native full-screen camera UI (iOS: UIViewController modal, Android: Activity)
4. The user completes a short challenge (5-15 seconds)
5. The native SDK captures frames, sensor data, and optional audio, uploads to UseSense servers
6. Server-side analysis runs three pillars (DeepSense, LiveSense, MatchSense) in parallel
7. The plugin receives a preliminary result — use for UI feedback
8. The definitive verdict arrives at YOUR BACKEND via HMAC-signed webhook
9. One credit consumed per completed session

### Sequence Diagram

```
┌──────────┐     ┌──────────────────────┐     ┌─────────────┐     ┌──────────────┐
│ Your RN  │     │ react-native-usesense│     │ UseSense API│     │ Your Backend │
│   App    │     │  (JS) -> (Native SDK)│     │             │     │              │
└────┬─────┘     └──────────┬───────────┘     └──────┬──────┘     └──────┬───────┘
     │ initialize()         │                        │                   │
     │─────────────────────>│                        │                   │
     │                      │── validate API key ───>│                   │
     │                      │<── OK ─────────────────│                   │
     │<── ready ────────────│                        │                   │
     │                      │                        │                   │
     │ startSession()       │                        │                   │
     │─────────────────────>│                        │                   │
     │                      │── POST /v1/sessions ──>│                   │
     │                      │<── challenge config ───│                   │
     │                      │                        │                   │
     │  [Native camera UI presented, user completes challenge]           │
     │  [Events stream: session_started, challenge_*, processing]        │
     │                      │                        │                   │
     │                      │── POST /signals ──────>│                   │
     │                      │── POST /complete ─────>│                   │
     │<── result (Promise)──│<── SDK result ─────────│                   │
     │                      │                        │── webhook ───────>│
     │                      │                        │                   │
```

## Why Three Independent Pillars?

Most providers return one composite score that hides individual failures. UseSense takes a different approach:

- **DeepSense**, **LiveSense**, and **MatchSense** each score independently (0-100)
- A critical failure in any pillar cannot be masked by strong scores in others
- Default logic: "weakest link" — any pillar failing causes a REJECT
- You get full transparency into exactly what passed and what failed

| Pillar | What It Detects | Score Field | Interpretation |
|--------|----------------|-------------|----------------|
| DeepSense | Emulators, root/jailbreak, hooking, replay attacks, capture tampering | `channelTrustScore` | Higher = more trusted device/channel |
| LiveSense | Deepfakes, printed photos, screen replays, masks, no-face, audio spoofing | `livenessScore` | Higher = more likely a live human |
| MatchSense | Duplicate faces across identities, identity theft, face quality issues | `matchSenseRiskScore` | Lower = lower risk of collision |

## React Native-Specific Considerations

### Navigation

The native camera UI is presented as a modal over your React Native app. Your navigation state is preserved. When the session completes, the modal dismisses and your component receives the result via the resolved promise.

```tsx
// Your navigation stack stays intact
function KYCScreen({ navigation }) {
  const handleVerify = async () => {
    // Camera modal appears on top of your app
    const result = await UseSense.startSession({ sessionType: 'enrollment' });
    // Modal dismissed — you're back in your RN app
    navigation.navigate('Result', { result });
  };
}
```

### Lifecycle

- On iOS, your React Native app remains in memory while the camera modal is presented
- On Android, the camera Activity is launched. Your Activity may be paused. If the system kills your process (low memory), the session is lost and a `session_cancelled` error is returned
- Use a try/catch around `startSession()` to handle all outcomes

```typescript
try {
  const result = await UseSense.startSession({ sessionType: 'enrollment' });
  // success
} catch (error) {
  if (error.code === 'session_cancelled') {
    // User or system cancelled — handle gracefully
  } else {
    // Real error — show message
  }
}
```

### Permissions

The native SDKs request camera permission at runtime when `startSession()` is called. If you want to pre-request (e.g., show a custom pre-permission screen), use React Native's `PermissionsAndroid` (Android) or request via the native iOS permission API before calling `startSession()`.

```typescript
import { Platform, PermissionsAndroid } from 'react-native';

async function requestCameraPermission() {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera Permission',
        message: 'We need camera access to verify your identity.',
        buttonPositive: 'Allow',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  // iOS: permission is requested by the native SDK automatically
  return true;
}
```

### Threading

The bridge handles threading automatically. `initialize()` and `startSession()` are async — always await them. Event callbacks fire on the JS thread.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Your React Native App                 │
│                                                         │
│  import { UseSense } from 'react-native-usesense';     │
│  UseSense.initialize(...)                                │
│  UseSense.startSession(...)                              │
└────────────────────────┬────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │   JS Bridge Layer    │
              │   (src/index.ts)     │
              └──────────┬──────────┘
                         │
         ┌───────────────┼───────────────┐
         │                               │
┌────────┴────────┐            ┌────────┴────────┐
│   iOS Native    │            │  Android Native  │
│   Module        │            │   Module         │
│ (UseSenseModule │            │ (UseSenseModule  │
│  .swift)        │            │  .kt)            │
└────────┬────────┘            └────────┬────────┘
         │                               │
┌────────┴────────┐            ┌────────┴────────┐
│  UseSense iOS   │            │ UseSense Android │
│  SDK (Swift)    │            │ SDK (Kotlin)     │
└────────┬────────┘            └────────┬────────┘
         │                               │
         └───────────────┬───────────────┘
                         │
              ┌──────────┴──────────┐
              │   UseSense Cloud    │
              │   (3-pillar engine) │
              └─────────────────────┘
```

## Webhook Setup

### Step 1: Configure the Webhook Endpoint

1. Go to [UseSense dashboard](https://watchtower.usesense.ai) > Settings > Webhooks
2. Add your endpoint URL (e.g., `https://api.yourapp.com/webhooks/usesense`)
3. Copy the signing secret

### Step 2: Implement Signature Verification

Every webhook includes two headers:
- `X-UseSense-Signature`: HMAC-SHA256 hex digest
- `X-UseSense-Timestamp`: Unix timestamp (for replay protection)

The signed payload is `{timestamp}.{body}`.

#### Node.js (Express)

```javascript
const crypto = require('crypto');

app.post('/webhooks/usesense', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-usesense-signature'];
  const timestamp = req.headers['x-usesense-timestamp'];

  // Reject stale webhooks (>5 minutes old)
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
    return res.status(401).send('Stale timestamp');
  }

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
    const { decision, identity_id, session_type } = event.data;

    switch (decision) {
      case 'approved':
        // Update user record, grant access
        break;
      case 'rejected':
        // Block action, notify user
        break;
      case 'manual_review':
        // Queue for human review
        break;
    }
  }

  res.status(200).send('OK');
});
```

#### Python (Flask)

```python
import hmac
import hashlib
import time

@app.route('/webhooks/usesense', methods=['POST'])
def usesense_webhook():
    signature = request.headers.get('X-UseSense-Signature')
    timestamp = request.headers.get('X-UseSense-Timestamp')

    # Reject stale webhooks (>5 minutes old)
    if abs(time.time() - float(timestamp)) > 300:
        return 'Stale timestamp', 401

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
        identity_id = event['data'].get('identity_id')
        # Process decision...

    return 'OK', 200
```

#### Go (net/http)

```go
func useSenseWebhook(w http.ResponseWriter, r *http.Request) {
    signature := r.Header.Get("X-UseSense-Signature")
    timestamp := r.Header.Get("X-UseSense-Timestamp")

    // Reject stale webhooks (>5 minutes old)
    ts, _ := strconv.ParseInt(timestamp, 10, 64)
    if abs(time.Now().Unix()-ts) > 300 {
        http.Error(w, "Stale timestamp", http.StatusUnauthorized)
        return
    }

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

    var event WebhookEvent
    json.Unmarshal(body, &event)

    if event.Event == "session.completed" {
        // Process event.Data.Decision
    }

    w.WriteHeader(http.StatusOK)
    w.Write([]byte("OK"))
}
```

### Step 3: Handle Webhook Events

| Event | Description |
|-------|-------------|
| `session.completed` | Verification finished — contains decision and all scores |
| `session.expired` | Session hit 15-minute expiry without completion |
| `billing.credits_low` | Credit balance below threshold — set up alerts |

### Step 4: Map SDK Result to Webhook

Your client receives the SDK result immediately for UI feedback. Your backend receives the webhook for the authoritative decision. Link them by `session_id`:

```
Client: result.sessionId === "ses_abc123" → show "Approved" screen
Server: webhook.session_id === "ses_abc123" → grant access in database
```

## Going to Production Checklist

- [ ] Switch `environment` to `'production'` in `UseSenseConfig`
- [ ] Use production API key (separate from sandbox)
- [ ] Purchase credits in [UseSense dashboard](https://watchtower.usesense.ai)
- [ ] Configure production webhook endpoint
- [ ] Implement webhook signature verification on your server
- [ ] Test full flow on physical devices (both iOS and Android)
- [ ] Ensure backend handles all three decision types (`APPROVE`, `REJECT`, `MANUAL_REVIEW`)
- [ ] Set up low-credit alerts (`billing.credits_low` webhook)
- [ ] iOS: Add required privacy declarations to `Info.plist`
  - `NSCameraUsageDescription` (required)
  - `NSMicrophoneUsageDescription` (if `enableAudio: true`)
  - `NSMotionUsageDescription` (optional, improves DeepSense)
- [ ] Android: Complete Play Store data safety form
  - Camera data: collected for identity verification
  - Face data: processed server-side, not stored on device
- [ ] Verify `minSdkVersion >= 24` on Android
- [ ] Verify iOS deployment target `>= 14.0`
- [ ] Test error handling for all common error codes
- [ ] Test on low-end devices to verify performance
- [ ] Remove any sandbox-specific logging before release
