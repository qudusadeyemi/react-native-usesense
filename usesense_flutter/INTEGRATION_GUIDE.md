# UseSense Flutter Integration Guide

This guide covers how the `usesense_flutter` plugin works end-to-end, from
SDK initialization through webhook verification on your backend. It is written
for Flutter developers integrating human presence verification (KYC/AML) into
a production application.

---

## Table of Contents

1. [How Verification Works](#1-how-verification-works)
2. [Sequence Diagram](#2-sequence-diagram)
3. [Why Three Independent Pillars?](#3-why-three-independent-pillars)
4. [Flutter-Specific Considerations](#4-flutter-specific-considerations)
5. [Webhook Setup](#5-webhook-setup)
6. [Going to Production Checklist](#6-going-to-production-checklist)

---

## 1. How Verification Works

A verification session proceeds through the following steps:

1. **Initialize the SDK.** Create a `UseSenseFlutter` instance and call
   `initialize()` with your API key. This loads native resources, contacts
   the UseSense API to validate your key, and prepares the camera pipeline.
   Initialization only needs to happen once per app lifecycle.

   ```dart
   final useSense = UseSenseFlutter();
   await useSense.initialize(
     const UseSenseConfig(apiKey: 'pk_live_your_key'),
   );
   ```

2. **Subscribe to event and cancellation streams (optional).** Before
   starting a session, attach listeners to `onEvent` and `onCancelled` so
   your UI can react to progress updates in real time.

   ```dart
   useSense.onEvent.listen((event) {
     debugPrint('${event.type.name}: ${event.data}');
   });
   useSense.onCancelled.listen((_) {
     debugPrint('User cancelled the session');
   });
   ```

3. **Start a verification session.** Call `startVerification()` with a
   `VerificationRequest`. The native SDK takes over the screen, presenting
   a camera UI that guides the user through a challenge (follow-dot,
   head-turn, or speak-phrase, lasting 5--15 seconds). The challenge type is
   selected by SenSei, the adaptive AI orchestration layer, based on risk
   signals.

   ```dart
   final result = await useSense.startVerification(
     const VerificationRequest(
       sessionType: SessionType.enrollment,
       externalUserId: 'user-123',
     ),
   );
   ```

   For authentication (re-verification against an existing identity):

   ```dart
   final result = await useSense.startVerification(
     const VerificationRequest(
       sessionType: SessionType.authentication,
       identityId: 'idn_def456',
     ),
   );
   ```

4. **SDK captures biometric data.** The native SDK records video frames,
   runs the liveness challenge, collects device integrity signals, and
   uploads everything to the UseSense API. Events stream back through
   `onEvent` during this process (`captureStarted`, `uploadProgress`,
   `completeStarted`, etc.).

5. **SDK returns a client-side result.** The `Future<UseSenseResult>`
   resolves with a `UseSenseResult` containing:

   | Field         | Type      | Description                              |
   |---------------|-----------|------------------------------------------|
   | `sessionId`   | `String`  | Unique session identifier (`ses_...`)    |
   | `sessionType` | `String?` | `enrollment` or `authentication`         |
   | `identityId`  | `String?` | Identity created or verified             |
   | `decision`    | `String`  | `APPROVE`, `REJECT`, or `MANUAL_REVIEW`  |
   | `timestamp`   | `String`  | ISO 8601 timestamp of the decision       |

   Convenience getters: `result.isApproved`, `result.isRejected`,
   `result.isPendingReview`.

   **Scores are NOT exposed in the client-side result.** Individual pillar
   scores (channel trust, liveness, match) and the fused
   `presenceConfidence` score are redacted from the SDK response for
   security. They are only delivered to your backend via the signed webhook.

6. **Update your UI based on the client-side result.** Show the user an
   appropriate message. This result is for UI feedback only.

   ```dart
   if (result.isApproved) {
     showSuccess('Verification complete');
   } else if (result.isPendingReview) {
     showInfo('Your submission is under review');
   } else {
     showError('Verification unsuccessful');
   }
   ```

7. **UseSense API delivers a signed webhook to your backend.** This is the
   definitive verdict. The webhook payload includes full scores, the
   decision, and an HMAC-SHA256 signature. Your backend verifies the
   signature and updates the user's status in your database.

8. **Your backend acts on the webhook.** Grant or deny access, flag for
   manual review, or trigger downstream workflows. All access-control
   decisions must be made server-side based on the webhook -- never based
   on the SDK result alone.

> **Critical rule:** The SDK result is for UI feedback only. NEVER use
> `UseSenseResult.decision` on the client to grant access, unlock features,
> or make authorization decisions. The definitive verdict comes exclusively
> through the HMAC-SHA256 signed webhook delivered to your backend.

Sessions expire after **15 minutes** if not completed.

---

## 2. Sequence Diagram

```
 Your Flutter App          usesense_flutter           UseSense API            Your Backend
       |                   (Dart -> Native)                |                       |
       |                        |                          |                       |
  [1]  |-- initialize() ------>|                          |                       |
       |                        |--- validate API key --->|                       |
       |                        |<-- OK ------------------|                       |
       |<-- Future<void> -------|                          |                       |
       |                        |                          |                       |
  [2]  |-- onEvent.listen() -->|                          |                       |
       |-- onCancelled.listen() |                          |                       |
       |                        |                          |                       |
  [3]  |-- startVerification()->|                          |                       |
       |                        |--- create session ------>|                       |
       |                        |<-- session_id -----------|                       |
       |                        |                          |                       |
  [4]  |   [Native camera UI presented over Flutter]       |                       |
       |                        |                          |                       |
       |<- onEvent(captureStarted)                         |                       |
       |                        |   [User completes challenge: 5-15s]              |
       |<- onEvent(uploadStarted)                          |                       |
       |                        |--- upload frames ------->|                       |
       |<- onEvent(uploadProgress)                         |                       |
       |                        |<-- upload OK ------------|                       |
       |<- onEvent(uploadCompleted)                        |                       |
       |                        |                          |                       |
  [5]  |<- onEvent(completeStarted)                        |                       |
       |                        |--- request verdict ----->|                       |
       |                        |<-- decision (redacted) --|                       |
       |<- onEvent(decisionReceived)                       |                       |
       |<-- UseSenseResult -----|                          |                       |
       |                        |                          |                       |
  [6]  |   [Show UI feedback]   |                          |                       |
       |                        |                          |                       |
  [7]  |                        |                          |-- webhook (signed) -->|
       |                        |                          |   POST /webhooks      |
       |                        |                          |   {decision, scores,  |
       |                        |                          |    HMAC-SHA256 sig}    |
       |                        |                          |                       |
  [8]  |                        |                          |<-- 200 OK ------------|
       |                        |                          |   [Backend updates    |
       |                        |                          |    user status in DB] |
       |                        |                          |                       |
```

Key points in this flow:

- The native camera UI is presented as an Activity (Android) or
  UIViewController (iOS) **on top of** the Flutter surface. Your Flutter
  widget tree remains intact underneath.
- Pigeon generates type-safe platform channel bindings. There is no
  string-based method channel matching -- all calls are statically typed in
  Dart, Kotlin, and Swift.
- The SDK result returned in step 5 has scores redacted. Full scoring data
  is only present in the webhook payload (step 7).

---

## 3. Why Three Independent Pillars?

UseSense evaluates every session across three independent pillars. Each
pillar produces its own score (0--100), and all three must pass for the
session to be approved. This is a **weakest-link** model: a perfect score
on two pillars cannot compensate for a failure on the third.

### DeepSense -- Channel and Device Integrity

**Score:** `channelTrustScore` (0--100)

Evaluates whether the session originates from a genuine, uncompromised
device and application. Detects emulators, rooted/jailbroken devices,
app tampering, hooking frameworks, replay attacks, and virtual cameras.

A fraudster who has a perfect face match and is physically present still
fails if they are running the app on an emulator or injecting a video
stream.

### LiveSense -- Proof of Life

**Score:** `livenessScore` (0--100)

Determines whether the person in front of the camera is physically present
and alive at the time of the session. Uses multimodal signals --
micro-expressions, texture analysis, depth estimation, and active
challenges (follow-dot, head-turn, speak-phrase) -- to detect printed
photos, screen replays, 3D masks, and deepfake injection.

A genuine device with a real identity document still fails if the face
presented is a photo printout or a deepfake video.

### MatchSense -- Face Matching and Deduplication

**Score:** `matchScore` (0--100)

For enrollment: checks whether this face already exists in your identity
pool (deduplication). A high `matchScore` during enrollment means a
duplicate was found, which triggers rejection.

For authentication: verifies that the live face matches the enrolled
identity. A low `matchScore` during authentication means the person does
not match, which triggers rejection.

A real person on a real device still fails if their face matches an
already-enrolled identity (enrollment) or does not match the claimed
identity (authentication).

### The Fused Score

**Score:** `presenceConfidence` (0--100)

SenSei, the adaptive AI orchestration layer, computes a fused
`presenceConfidence` score that synthesizes all three pillars along with
contextual risk signals. This is the single number that drives the
`decision` (APPROVE, REJECT, MANUAL_REVIEW).

### Why This Matters

A single-pillar system can be defeated by attacking the uncovered surface.
Three independent pillars ensure there is no single attack vector:

| Attack                        | Blocked by   |
|-------------------------------|--------------|
| Emulator / virtual camera     | DeepSense    |
| Rooted device / hooking       | DeepSense    |
| Printed photo / screen replay | LiveSense    |
| 3D mask / deepfake injection  | LiveSense    |
| Duplicate enrollment          | MatchSense   |
| Identity impersonation        | MatchSense   |

No pillar's score can mask a failure in another. This is by design.

---

## 4. Flutter-Specific Considerations

### 4.1 Navigation

When `startVerification()` is called, the native SDK presents a full-screen
camera UI as a native Activity (Android) or UIViewController (iOS) **over**
the Flutter surface. The Flutter widget tree is preserved underneath and is
not rebuilt or popped.

This works transparently with all Flutter navigation solutions:

- **Navigator 2.0 / GoRouter:** The route stack is untouched. When the
  native UI dismisses, the `Future` resolves and your current route
  receives the result.
- **auto_route:** Same behavior. The native screen does not participate in
  the Flutter route stack.
- **Navigator 1.0 (imperative):** Works identically.

You do not need to push a route before calling `startVerification()`. The
native UI is not a Flutter widget.

```dart
// GoRouter example -- call from any route
ElevatedButton(
  onPressed: () async {
    final result = await useSense.startVerification(
      const VerificationRequest(sessionType: SessionType.enrollment),
    );
    if (context.mounted) {
      context.go('/verification-result', extra: result);
    }
  },
  child: const Text('Verify Identity'),
)
```

### 4.2 State Management

The plugin is a plain Dart class with `Future`-based methods and `Stream`
properties. It integrates naturally with any state management approach.

#### Riverpod (recommended example)

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:usesense_flutter/usesense_flutter.dart';

// -- State --

enum VerificationStatus { idle, initializing, verifying, done, error }

class VerificationState {
  const VerificationState({
    this.status = VerificationStatus.idle,
    this.result,
    this.errorMessage,
    this.events = const [],
  });

  final VerificationStatus status;
  final UseSenseResult? result;
  final String? errorMessage;
  final List<UseSenseEvent> events;

  VerificationState copyWith({
    VerificationStatus? status,
    UseSenseResult? result,
    String? errorMessage,
    List<UseSenseEvent>? events,
  }) {
    return VerificationState(
      status: status ?? this.status,
      result: result ?? this.result,
      errorMessage: errorMessage,
      events: events ?? this.events,
    );
  }
}

// -- Notifier --

class UseSenseNotifier extends Notifier<VerificationState> {
  late final UseSenseFlutter _useSense;

  @override
  VerificationState build() {
    _useSense = UseSenseFlutter();

    _useSense.onEvent.listen((event) {
      state = state.copyWith(
        events: [...state.events, event],
      );
    });

    _useSense.onCancelled.listen((_) {
      state = state.copyWith(
        status: VerificationStatus.idle,
        errorMessage: 'Session cancelled by user',
      );
    });

    ref.onDispose(() => _useSense.dispose());

    return const VerificationState();
  }

  Future<void> initialize(String apiKey) async {
    state = state.copyWith(status: VerificationStatus.initializing);
    try {
      await _useSense.initialize(UseSenseConfig(apiKey: apiKey));
      state = state.copyWith(status: VerificationStatus.idle);
    } on UseSenseError catch (e) {
      state = state.copyWith(
        status: VerificationStatus.error,
        errorMessage: e.message,
      );
    }
  }

  Future<void> enroll({String? externalUserId}) async {
    state = state.copyWith(
      status: VerificationStatus.verifying,
      events: [],
      errorMessage: null,
    );
    try {
      final result = await _useSense.startVerification(
        VerificationRequest(
          sessionType: SessionType.enrollment,
          externalUserId: externalUserId,
        ),
      );
      state = state.copyWith(
        status: VerificationStatus.done,
        result: result,
      );
    } on UseSenseError catch (e) {
      state = state.copyWith(
        status: VerificationStatus.error,
        errorMessage: e.message,
      );
    }
  }

  Future<void> authenticate(String identityId) async {
    state = state.copyWith(
      status: VerificationStatus.verifying,
      events: [],
      errorMessage: null,
    );
    try {
      final result = await _useSense.startVerification(
        VerificationRequest(
          sessionType: SessionType.authentication,
          identityId: identityId,
        ),
      );
      state = state.copyWith(
        status: VerificationStatus.done,
        result: result,
      );
    } on UseSenseError catch (e) {
      state = state.copyWith(
        status: VerificationStatus.error,
        errorMessage: e.message,
      );
    }
  }
}

// -- Provider --

final useSenseProvider =
    NotifierProvider<UseSenseNotifier, VerificationState>(
  UseSenseNotifier.new,
);
```

Usage in a widget:

```dart
class VerifyButton extends ConsumerWidget {
  const VerifyButton({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = ref.watch(useSenseProvider).status;

    return ElevatedButton(
      onPressed: status == VerificationStatus.verifying
          ? null
          : () => ref.read(useSenseProvider.notifier).enroll(),
      child: status == VerificationStatus.verifying
          ? const CircularProgressIndicator()
          : const Text('Verify Identity'),
    );
  }
}
```

#### Bloc

```dart
// Events
sealed class VerificationEvent {}
class InitializeSdk extends VerificationEvent {
  InitializeSdk(this.apiKey);
  final String apiKey;
}
class StartEnrollment extends VerificationEvent {
  StartEnrollment({this.externalUserId});
  final String? externalUserId;
}

// Bloc
class VerificationBloc extends Bloc<VerificationEvent, VerificationState> {
  VerificationBloc() : super(const VerificationState()) {
    _useSense = UseSenseFlutter();
    on<InitializeSdk>(_onInitialize);
    on<StartEnrollment>(_onEnroll);
  }

  late final UseSenseFlutter _useSense;

  Future<void> _onInitialize(
    InitializeSdk event, Emitter<VerificationState> emit,
  ) async {
    emit(state.copyWith(status: VerificationStatus.initializing));
    try {
      await _useSense.initialize(UseSenseConfig(apiKey: event.apiKey));
      emit(state.copyWith(status: VerificationStatus.idle));
    } on UseSenseError catch (e) {
      emit(state.copyWith(
        status: VerificationStatus.error,
        errorMessage: e.message,
      ));
    }
  }

  Future<void> _onEnroll(
    StartEnrollment event, Emitter<VerificationState> emit,
  ) async {
    emit(state.copyWith(status: VerificationStatus.verifying));
    try {
      final result = await _useSense.startVerification(
        VerificationRequest(
          sessionType: SessionType.enrollment,
          externalUserId: event.externalUserId,
        ),
      );
      emit(state.copyWith(status: VerificationStatus.done, result: result));
    } on UseSenseError catch (e) {
      emit(state.copyWith(
        status: VerificationStatus.error,
        errorMessage: e.message,
      ));
    }
  }

  @override
  Future<void> close() {
    _useSense.dispose();
    return super.close();
  }
}
```

#### setState

See the [example app](example/lib/main.dart) for a complete `setState`
implementation.

### 4.3 Platform Lifecycle

#### iOS

When the native camera UI is presented, the Flutter engine remains active.
Your Dart isolate continues running. Timers, streams, and async operations
are not interrupted. When the native UI dismisses, the `Future` returned by
`startVerification()` resolves normally.

#### Android

Android's Activity lifecycle is more complex. When the native SDK launches
its Activity, the Flutter Activity moves to the background. In most cases
the Flutter Activity is paused but not destroyed. However, under memory
pressure the system may destroy it.

The native SDK handles this scenario internally -- it persists session state
and delivers the result when the Flutter Activity is recreated. The
`Future<UseSenseResult>` will still resolve correctly.

If you use the `onEvent` stream, be aware that some events may be missed if
the Flutter Activity is destroyed and recreated mid-session. The final
result is always delivered reliably.

### 4.4 Permissions

The native SDKs handle camera and microphone permission requests at runtime.
You do not need to request permissions yourself before calling
`startVerification()`.

The `onEvent` stream emits `permissionsRequested`, `permissionsGranted`, or
`permissionsDenied` events so your UI can react accordingly. If the user
denies a required permission, the session fails with a `UseSenseError`
(code `1002` for camera, `1003` for microphone).

If you want to pre-request permissions to improve UX (avoiding the
permission dialog during the verification flow), you can use the
`permission_handler` package:

```dart
import 'package:permission_handler/permission_handler.dart';

Future<bool> ensurePermissions() async {
  final camera = await Permission.camera.request();
  final microphone = await Permission.microphone.request();
  return camera.isGranted && microphone.isGranted;
}
```

This is optional. The native SDK will request permissions if they have not
been granted.

**Platform configuration required:**

- **iOS:** Add `NSCameraUsageDescription` and `NSMicrophoneUsageDescription`
  to your `Info.plist`.
- **Android:** Add `android.permission.CAMERA` and
  `android.permission.RECORD_AUDIO` to your `AndroidManifest.xml`. The
  native SDK handles runtime permission requests via the Activity.

### 4.5 Platform Channels (Pigeon)

The plugin uses [Pigeon](https://pub.dev/packages/pigeon) for platform
channel communication. Pigeon generates type-safe Dart, Kotlin, and Swift
code from a single schema definition
(`pigeons/usesense_api.dart`).

This means:

- **No string-based method matching.** Method names and argument types are
  checked at compile time on all three platforms. A typo in a method name
  or a mismatched argument type is a compile error, not a runtime crash.
- **Structured error types.** Errors cross the platform boundary as
  `PigeonUseSenseError` objects with typed fields (`code`, `message`,
  `isRetryable`), not opaque strings.
- **Bidirectional communication.** `UseSenseHostApi` (Dart to native) and
  `UseSenseFlutterApi` (native to Dart) are both type-safe. Events flow
  from native to Dart through `UseSenseFlutterApi.onEvent()`.

You do not interact with Pigeon directly. The public API
(`UseSenseFlutter`, `UseSenseConfig`, `UseSenseResult`, etc.) wraps the
generated Pigeon types.

---

## 5. Webhook Setup

The webhook is how your backend receives the definitive, signed verdict for
each verification session. The SDK result on the client is for UI feedback
only.

### 5.1 Configure Your Webhook Endpoint

1. Log in to the [UseSense Dashboard](https://dashboard.usesense.co).
2. Navigate to **Settings > Webhooks**.
3. Click **Add Endpoint**.
4. Enter your endpoint URL (e.g., `https://api.yourapp.com/webhooks/usesense`).
5. Select the events you want to receive. At minimum, enable
   `session.completed`.
6. Click **Create**. The dashboard will display your **Webhook Signing
   Secret** (`whsec_...`). Copy and store it securely in your backend
   environment variables. You will not be able to view it again.

### 5.2 Webhook Payload Structure

When a session completes, UseSense sends a `POST` request to your endpoint
with the following JSON body:

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
    "match_score": 8,
    "presence_confidence": 94,
    "session_type": "enrollment",
    "identity_id": "idn_def456",
    "reasons": [],
    "rule_triggered": null,
    "session_signature": "sig_..."
  }
}
```

| Field                        | Description                                        |
|------------------------------|----------------------------------------------------|
| `event`                      | Event type. `session.completed` for verdicts.      |
| `session_id`                 | Matches `UseSenseResult.sessionId` from the SDK.   |
| `organization_id`            | Your organization identifier.                      |
| `timestamp`                  | ISO 8601 timestamp.                                |
| `data.decision`              | `approved`, `rejected`, or `manual_review`.        |
| `data.channel_trust_score`   | DeepSense score (0--100).                          |
| `data.liveness_score`        | LiveSense score (0--100).                          |
| `data.match_score`           | MatchSense score (0--100).                         |
| `data.presence_confidence`   | Fused score (0--100).                              |
| `data.session_type`          | `enrollment` or `authentication`.                  |
| `data.identity_id`           | The identity created or verified.                  |
| `data.reasons`               | Array of reason codes if rejected.                 |
| `data.rule_triggered`        | Custom rule that triggered, if any.                |
| `data.session_signature`     | Session-level signature for additional validation. |

### 5.3 Verifying the Webhook Signature

Every webhook request includes an `X-UseSense-Signature` header containing
an HMAC-SHA256 signature computed over the raw request body using your
webhook signing secret. **Always verify this signature before processing
the payload.**

#### Node.js (Express)

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();

// IMPORTANT: Use raw body for signature verification.
app.post(
  '/webhooks/usesense',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const signature = req.headers['x-usesense-signature'];
    if (!signature) {
      return res.status(401).json({ error: 'Missing signature header' });
    }

    const webhookSecret = process.env.USESENSE_WEBHOOK_SECRET; // whsec_...
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(req.body) // req.body is a Buffer when using express.raw()
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const payload = JSON.parse(req.body.toString());

    // Process the verified webhook payload.
    const { session_id, data } = payload;
    console.log(`Session ${session_id}: ${data.decision}`);
    console.log(`Scores - channel: ${data.channel_trust_score}, ` +
      `liveness: ${data.liveness_score}, match: ${data.match_score}, ` +
      `confidence: ${data.presence_confidence}`);

    // TODO: Update user status in your database based on data.decision.

    res.status(200).json({ received: true });
  },
);

app.listen(3000);
```

#### Python (Flask)

```python
import hashlib
import hmac
import json
import os

from flask import Flask, request, jsonify, abort

app = Flask(__name__)

@app.route("/webhooks/usesense", methods=["POST"])
def usesense_webhook():
    signature = request.headers.get("X-UseSense-Signature")
    if not signature:
        abort(401, description="Missing signature header")

    webhook_secret = os.environ["USESENSE_WEBHOOK_SECRET"]  # whsec_...
    expected_signature = hmac.new(
        webhook_secret.encode("utf-8"),
        request.data,  # raw bytes
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(signature, expected_signature):
        abort(401, description="Invalid signature")

    payload = json.loads(request.data)

    # Process the verified webhook payload.
    session_id = payload["session_id"]
    data = payload["data"]
    print(f"Session {session_id}: {data['decision']}")
    print(
        f"Scores - channel: {data['channel_trust_score']}, "
        f"liveness: {data['liveness_score']}, match: {data['match_score']}, "
        f"confidence: {data['presence_confidence']}"
    )

    # TODO: Update user status in your database based on data["decision"].

    return jsonify(received=True), 200
```

#### Go (net/http)

```go
package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
)

func main() {
	http.HandleFunc("/webhooks/usesense", handleWebhook)
	log.Fatal(http.ListenAndServe(":3000", nil))
}

func handleWebhook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	signature := r.Header.Get("X-UseSense-Signature")
	if signature == "" {
		http.Error(w, "Missing signature header", http.StatusUnauthorized)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read body", http.StatusInternalServerError)
		return
	}
	defer r.Body.Close()

	webhookSecret := os.Getenv("USESENSE_WEBHOOK_SECRET") // whsec_...
	mac := hmac.New(sha256.New, []byte(webhookSecret))
	mac.Write(body)
	expectedSignature := hex.EncodeToString(mac.Sum(nil))

	if !hmac.Equal([]byte(signature), []byte(expectedSignature)) {
		http.Error(w, "Invalid signature", http.StatusUnauthorized)
		return
	}

	var payload struct {
		Event          string `json:"event"`
		SessionID      string `json:"session_id"`
		OrganizationID string `json:"organization_id"`
		Timestamp      string `json:"timestamp"`
		Data           struct {
			Decision          string   `json:"decision"`
			ChannelTrustScore int      `json:"channel_trust_score"`
			LivenessScore     int      `json:"liveness_score"`
			MatchScore        int      `json:"match_score"`
			PresenceConfidence int     `json:"presence_confidence"`
			SessionType       string   `json:"session_type"`
			IdentityID        string   `json:"identity_id"`
			Reasons           []string `json:"reasons"`
			RuleTriggered     *string  `json:"rule_triggered"`
			SessionSignature  string   `json:"session_signature"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &payload); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Process the verified webhook payload.
	fmt.Printf("Session %s: %s\n", payload.SessionID, payload.Data.Decision)
	fmt.Printf("Scores - channel: %d, liveness: %d, match: %d, confidence: %d\n",
		payload.Data.ChannelTrustScore,
		payload.Data.LivenessScore,
		payload.Data.MatchScore,
		payload.Data.PresenceConfidence,
	)

	// TODO: Update user status in your database based on payload.Data.Decision.

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]bool{"received": true})
}
```

### 5.4 Webhook Best Practices

- **Always verify the signature.** Never process an unverified payload.
- **Respond with 2xx quickly.** Do heavy processing asynchronously.
  UseSense will retry on non-2xx responses.
- **Handle idempotency.** Use `session_id` as an idempotency key. The same
  webhook may be delivered more than once.
- **Use HTTPS.** Your webhook endpoint must be reachable over HTTPS with a
  valid TLS certificate.
- **Store the signing secret securely.** Use environment variables or a
  secrets manager. Never commit it to source control.

---

## 6. Going to Production Checklist

Complete every item before submitting your app to the App Store or
Google Play.

- [ ] **1. Switch to production API key.** Replace your sandbox key
  (`sk_*` or `dk_*`) with a production key (`pk_*`). The SDK auto-detects
  the environment from the key prefix when using
  `UseSenseEnvironment.auto` (the default).

- [ ] **2. Secure your API key.** Do not hardcode the production API key in
  source code. Load it from a secure source at runtime (environment
  variable injected at build time, remote config, or a secure backend
  endpoint). Never commit API keys to version control.

- [ ] **3. Verify you have sufficient session credits.** Check your
  remaining session credits in the UseSense Dashboard under
  **Billing > Usage**. Production sessions consume credits. Set up billing
  alerts to avoid service interruptions.

- [ ] **4. Configure your production webhook endpoint.** Add your
  production webhook URL in the UseSense Dashboard. Ensure it is
  reachable over HTTPS with a valid TLS certificate. Test it with the
  dashboard's "Send Test Event" feature.

- [ ] **5. Implement webhook signature verification.** Your backend must
  verify the HMAC-SHA256 signature on every webhook request (see
  Section 5). Never process unverified payloads.

- [ ] **6. Test on physical devices.** Verification sessions require a
  real camera. Test on at least one physical iOS device and one physical
  Android device. Emulators and simulators will be flagged by DeepSense
  and sessions will fail.

- [ ] **7. Handle all three decisions.** Your app and backend must handle
  `APPROVE`, `REJECT`, and `MANUAL_REVIEW`. Do not ignore
  `MANUAL_REVIEW` -- provide appropriate UX (e.g., "Your submission is
  being reviewed") and have a backend process to resolve pending reviews.

- [ ] **8. Handle errors and retries.** The SDK throws `UseSenseError` with
  structured error codes. Handle at minimum: `networkError` (retryable),
  `sessionExpired` (start a new session), `cameraPermissionDenied` (guide
  user to settings), and `quotaExceeded` (alert your team). Check the
  `isRetryable` field before offering retry.

- [ ] **9. Set up monitoring and alerts.** Monitor your webhook endpoint
  for failures. Set up alerts for elevated rejection rates, webhook
  delivery failures, and quota depletion. Log `session_id` values on
  both client and backend for debugging.

- [ ] **10. Review App Store and Play Store submission requirements.**
  Both stores require disclosure of biometric data collection. Update
  your privacy policy to cover facial biometric data. For iOS, ensure
  your `Info.plist` camera and microphone usage descriptions are
  user-facing and accurately describe the purpose. For Android, if
  targeting API 31+, declare the `CAMERA` and `RECORD_AUDIO` permissions
  in your manifest with appropriate `usesPermissionFlags`.

---

## Remote Flows

For cases where the session is created server-side (e.g., for
compliance-driven flows where your backend controls when verification
happens), use the remote flow methods:

```dart
// Remote enrollment -- your backend creates the enrollment via the
// UseSense Server API and passes the ID to the client.
final result = await useSense.startRemoteEnrollment('ren_abc123');

// Remote verification -- same pattern.
final result = await useSense.startRemoteVerification('rse_def456');
```

These methods skip local session creation and join an existing server-side
session. The webhook flow is identical.

---

## Error Handling Reference

`UseSenseError` provides structured error information:

| Code   | Constant                  | Retryable | Description                     |
|--------|---------------------------|-----------|---------------------------------|
| `1001` | `cameraUnavailable`       | No        | Camera hardware not available   |
| `1002` | `cameraPermissionDenied`  | No        | User denied camera permission   |
| `1003` | `microphonePermissionDenied` | No     | User denied microphone permission |
| `2001` | `networkError`            | Yes       | Network communication error     |
| `2002` | `networkTimeout`          | Yes       | Request timed out               |
| `3001` | `sessionExpired`          | No        | Session exceeded 15-minute limit |
| `3002` | `uploadFailed`            | Yes       | Frame upload failed             |
| `4001` | `captureFailed`           | Yes       | Frame capture failed            |
| `4002` | `encodingFailed`          | No        | Frame encoding failed           |
| `5001` | `invalidConfig`           | No        | Invalid SDK configuration       |
| `6001` | `quotaExceeded`           | No        | Organization quota exceeded     |
| `7001` | `sdkNotInitialized`       | No        | `initialize()` not called       |
| `8001` | `sessionCancelled`        | No        | User cancelled the session      |

```dart
try {
  final result = await useSense.startVerification(request);
} on UseSenseError catch (e) {
  if (e.isRetryable) {
    // Offer retry to the user.
  } else if (e.code == UseSenseError.sessionExpired) {
    // Start a new session.
  } else if (e.code == UseSenseError.cameraPermissionDenied) {
    // Guide user to app settings.
  }
}
```

---

## Cleanup

Call `dispose()` when your verification screen is removed from the tree,
or when the plugin is no longer needed. This releases native resources and
closes the event streams.

```dart
@override
void dispose() {
  useSense.dispose();
  super.dispose();
}
```

Call `reset()` if you need to re-initialize the SDK with a different
configuration (e.g., switching API keys):

```dart
await useSense.reset();
await useSense.initialize(const UseSenseConfig(apiKey: 'new_key'));
```
