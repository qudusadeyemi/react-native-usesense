# UseSense — Product Specification

*A reverse-engineered product specification covering the full UseSense platform: mobile SDKs (iOS, Android, React Native, Flutter), Web SDK, hosted pages, and the Watchtower operator dashboard + backend. Written for product, QA, and engineering reference.*

**Format**: Capability → Sub-capability → Epic → User Story → Acceptance Criteria (AC) + Negative Acceptance Criteria (NAC).

**Conventions**:
- AC: behavior the system **must** demonstrate to be considered correct.
- NAC: behavior the system **must not** exhibit (failure modes that QA should explicitly attempt to provoke).
- User stories use the standard form: *As a `<role>`, I want `<goal>`, so that `<value>`.*
- Identifiers (e.g. `C3.E2.US1`) are stable QA references — do not renumber when adding items; append.

---

## Table of contents

- [Document purpose](#document-purpose)
- [Roles & personas](#roles--personas)
- [Capability map](#capability-map)
- [C1. SDK Integration & Initialization](#c1-sdk-integration--initialization)
- [C2. Enrollment Verification Sessions](#c2-enrollment-verification-sessions)
- [C3. Authentication Verification Sessions](#c3-authentication-verification-sessions)
- [C4. Server-Initiated Session Flows](#c4-server-initiated-session-flows)
- [C5. Capture & Challenge System](#c5-capture--challenge-system)
- [C6. DeepSense — Channel & Device Integrity](#c6-deepsense--channel--device-integrity)
- [C7. LiveSense — Multimodal Liveness](#c7-livesense--multimodal-liveness)
- [C8. MatchSense — Identity Collision Detection](#c8-matchsense--identity-collision-detection)
- [C9. SenSei — Orchestration & Adaptive Policy](#c9-sensei--orchestration--adaptive-policy)
- [C10. Result Delivery — Client + Webhook](#c10-result-delivery--client--webhook)
- [C11. Watchtower — Auth & Account Management](#c11-watchtower--auth--account-management)
- [C12. Sessions Explorer](#c12-sessions-explorer)
- [C13. Identities Management](#c13-identities-management)
- [C14. Cases — Manual Review Queue](#c14-cases--manual-review-queue)
- [C15. Rules Engine](#c15-rules-engine)
- [C16. Fraud Ring Detection](#c16-fraud-ring-detection)
- [C17. Blocklist Management](#c17-blocklist-management)
- [C18. Webhooks Configuration](#c18-webhooks-configuration)
- [C19. API Keys Management](#c19-api-keys-management)
- [C20. Analytics & Reporting](#c20-analytics--reporting)
- [C21. Billing & Credits](#c21-billing--credits)
- [C22. Team & RBAC](#c22-team--rbac)
- [C23. SSO & Slack Integration](#c23-sso--slack-integration)
- [C24. Audit Logs](#c24-audit-logs)
- [C25. Compliance & Privacy](#c25-compliance--privacy)
- [C26. Ask SenSei (AI Case Analysis)](#c26-ask-sensei-ai-case-analysis)
- [C27. Branding & Customization](#c27-branding--customization)
- [C28. Network Admin (UseSense-Internal)](#c28-network-admin-usesense-internal)
- [C29. Cross-Platform Consistency](#c29-cross-platform-consistency)
- [C30. Non-Functional Requirements](#c30-non-functional-requirements)
- [Appendix A: Canonical event vocabulary](#appendix-a-canonical-event-vocabulary)
- [Appendix B: Canonical error codes](#appendix-b-canonical-error-codes)
- [Appendix C: Webhook event vocabulary](#appendix-c-webhook-event-vocabulary)
- [Appendix D: QA test environment matrix](#appendix-d-qa-test-environment-matrix)

---

## Document purpose

This specification is the single source of product truth for:

1. **Product managers** — to reason about what the system promises and where the boundaries are.
2. **QA engineers** — to build comprehensive functional, regression, and adversarial test suites.
3. **Engineers** — to verify their implementation matches the contract.
4. **Solutions engineers and CSMs** — to give precise answers to customer questions.

Every capability, story, and AC below corresponds to behavior present in the codebase today. Items not yet implemented are explicitly tagged `[ROADMAP]`.

---

## Roles & personas

| Role | Description |
|---|---|
| **End User** | The person being verified. Interacts only with the SDK UI. |
| **Mobile/Web Developer** | Customer integrator. Embeds the SDK in their application. |
| **Backend Developer** | Customer integrator. Receives webhooks, manages API keys, calls the REST API. |
| **Fraud Analyst** | Customer operator. Triages cases in Watchtower. |
| **Risk Manager** | Customer operator. Configures rules, thresholds, blocklists. |
| **Compliance Officer** | Customer operator. Reviews audit logs, exports data, manages privacy requests. |
| **Org Owner / Admin** | Customer operator. Manages team, billing, settings, SSO. |
| **Developer (Watchtower role)** | Customer operator with API/webhook scope but no fraud-ops scope. |
| **Viewer** | Read-only Watchtower role. |
| **Network Admin** | UseSense-internal operator. Manages every customer organization. |
| **SenSei AI** | The AI/orchestration layer; appears as a "system actor" in some flows. |

---

## Capability map

| # | Capability | Owner surface |
|---|---|---|
| C1 | SDK Integration & Initialization | All SDKs |
| C2 | Enrollment Verification Sessions | All SDKs + backend |
| C3 | Authentication Verification Sessions | All SDKs + backend |
| C4 | Server-Initiated Session Flows | iOS, Flutter, backend |
| C5 | Capture & Challenge System | All SDKs |
| C6 | DeepSense — Device Integrity | SDKs (collection) + backend (scoring) |
| C7 | LiveSense — Liveness | SDKs (capture) + backend (scoring) |
| C8 | MatchSense — Identity Collision | Backend |
| C9 | SenSei — Orchestration & Policy | Backend |
| C10 | Result Delivery — Client + Webhook | SDKs + backend |
| C11 | Watchtower Auth & Account | Watchtower |
| C12 | Sessions Explorer | Watchtower |
| C13 | Identities Management | Watchtower |
| C14 | Cases — Manual Review | Watchtower |
| C15 | Rules Engine | Watchtower |
| C16 | Fraud Ring Detection | Watchtower |
| C17 | Blocklist Management | Watchtower |
| C18 | Webhooks Configuration | Watchtower |
| C19 | API Keys Management | Watchtower |
| C20 | Analytics & Reporting | Watchtower |
| C21 | Billing & Credits | Watchtower |
| C22 | Team & RBAC | Watchtower |
| C23 | SSO & Slack | Watchtower |
| C24 | Audit Logs | Watchtower |
| C25 | Compliance & Privacy | Watchtower |
| C26 | Ask SenSei | Watchtower |
| C27 | Branding & Customization | Watchtower → SDKs |
| C28 | Network Admin | Watchtower (internal) |
| C29 | Cross-Platform Consistency | All SDKs |
| C30 | Non-Functional Requirements | Whole platform |

---

## C1. SDK Integration & Initialization

### C1.SC1. SDK Installation

#### C1.SC1.E1. Multi-channel distribution
**User story** — As a Mobile Developer, I want to install the UseSense SDK from my platform's standard package manager, so that I do not need custom build tooling.

**AC**
- iOS SDK installs via CocoaPods (`pod 'UseSenseSDK', '~> 4.2'`) without manual XCFramework handling.
- iOS SDK installs via Swift Package Manager (Git URL, v4.2.0+).
- iOS SDK installs via manual XCFramework download.
- Android SDK installs from Maven Central with **no custom repository declaration** (`mavenCentral()` is sufficient).
- Android SDK is also resolvable via JitPack and GitHub Packages (the latter requires a PAT).
- React Native SDK installs from npm (`npm install react-native-usesense`).
- React Native SDK auto-links on iOS via CocoaPods and on Android via Gradle.
- Flutter SDK installs from pub.dev (`usesense_flutter: ^1.0.0`).
- Web SDK installs from npm (`@usesense/web-sdk`).

**NAC**
- The SDK MUST NOT require manual editing of native project files when auto-linking is supported.
- The SDK MUST NOT require Maven `jcenter()` (which is sunset).
- The SDK MUST NOT require GitHub authentication for the primary distribution channel on either platform.

#### C1.SC1.E2. Minimum platform versions
**User story** — As a Mobile Developer, I want clear minimum-version requirements, so that I know up front whether my app can integrate.

**AC**
- iOS SDK requires iOS **15.0+**, Xcode **15.0+**, Swift **5.9+**.
- Android SDK requires Android **API 28+** (Android 9.0), Kotlin **1.9+**.
- React Native SDK requires RN **0.73+**, Node **18+**.
- Flutter SDK requires Flutter **3.16+**, Dart **3.2+**, iOS **16+**, Android API **24+**.
- Web SDK requires Chrome 80+, Safari 14+, Firefox 75+, Edge 80+.
- Attempting to integrate on a lower version produces a clear build-time or runtime error naming the minimum.

**NAC**
- The SDK MUST NOT silently degrade on unsupported platforms.

### C1.SC2. Initialization Lifecycle

#### C1.SC2.E1. One-time initialize
**User story** — As a Mobile Developer, I want to initialize the SDK once with my API key, so that subsequent verification calls succeed.

**AC**
- `initialize(config)` accepts an `apiKey` (required) and returns a `Promise<void>` (or platform equivalent) that resolves when ready.
- After successful initialization, `isInitialized()` returns `true`.
- The SDK auto-detects environment from key prefix: `sk_sandbox_*` / `pk_sandbox_*` → sandbox; `sk_prod_*` / `pk_prod_*` → production.
- `environment: 'auto' | 'sandbox' | 'production'` in config overrides auto-detection.
- Optional `apiEndpoint` / `baseUrl` override the default `https://api.usesense.ai/v1` (for staging, on-prem, or testing).
- Calling `initialize` again with a different key replaces the previous configuration cleanly.

**NAC**
- `initialize` MUST reject (throw `INVALID_CONFIG` or platform equivalent) if `apiKey` is empty, null, or whitespace-only.
- The SDK MUST NOT proceed with `startVerification` if `initialize` has not completed successfully — it must reject with `sdk_not_initialized`.
- Two concurrent `initialize` calls MUST NOT corrupt state; the last one wins, the first resolves cleanly.
- A malformed `apiKey` (no recognized prefix) MUST NOT crash; it should either be accepted with `environment: 'production'` default behavior or rejected with `INVALID_CONFIG` per platform spec.

#### C1.SC2.E2. SDK reset / dispose
**User story** — As a Mobile Developer, I want to release SDK resources, so that I can re-initialize with a different key (e.g. user logout / multi-tenant app).

**AC**
- `reset()` (RN/iOS/Android) or `dispose()` (Flutter) clears all event listeners and releases the native client.
- After reset, `isInitialized()` returns `false`.
- After reset, calling `startVerification` rejects with `sdk_not_initialized` until `initialize` is called again.

**NAC**
- `reset` MUST NOT throw if called when the SDK is not initialized.
- `reset` MUST NOT leak event subscriptions, native callbacks, or background timers.

### C1.SC3. Permissions

#### C1.SC3.E1. Camera & microphone permissions
**User story** — As an End User, I want the SDK to request only the permissions necessary for the verification I'm doing, so that I'm not asked for capabilities the app doesn't need.

**AC**
- iOS: `NSCameraUsageDescription` is always required in `Info.plist`; missing → SDK fails fast with a clear error during build / first launch.
- iOS: `NSMicrophoneUsageDescription` is required only when `audioEnabled != .never`.
- iOS: `NSMotionUsageDescription` is optional; if present, motion data feeds DeepSense.
- Android: `CAMERA`, `INTERNET`, `ACCESS_NETWORK_STATE` are declared in the manifest.
- The SDK requests permissions at session start (not at `initialize`).
- The SDK emits `PERMISSIONS_REQUESTED` → `PERMISSIONS_GRANTED` or `PERMISSIONS_DENIED` events.

**NAC**
- The SDK MUST NOT request microphone permission when `audioEnabled = .never`.
- The SDK MUST NOT silently bypass missing camera permission — it MUST surface `CAMERA_PERMISSION_DENIED`.
- The SDK MUST NOT crash when permissions are denied; it MUST reject the verification cleanly.

---

## C2. Enrollment Verification Sessions

### C2.SC1. First-time face registration

#### C2.SC1.E1. Standard enrollment flow
**User story** — As an End User, I want to register my face for the first time, so that I can later use it to authenticate.

**AC**
- `startVerification({ sessionType: 'enrollment', externalUserId: '...' })` launches a full-screen native camera UI.
- The session creates a new identity record on the backend.
- A 1:N MatchSense scan runs against the org's existing identities to detect duplicates.
- The result includes a freshly assigned `identityId` when `decision === 'APPROVE'`.
- The result includes `sessionType: 'enrollment'`, a unique `sessionId`, and an ISO 8601 `timestamp`.
- The customer's backend receives a `session.completed` webhook and an `identity.created` webhook (when approved).

**NAC**
- An enrollment MUST NOT create an identity when `decision === 'REJECT'`.
- An enrollment MUST NOT create a new identity when MatchSense detects a high-confidence collision; it should produce `MANUAL_REVIEW` instead.
- The SDK MUST NOT expose pillar scores in the client-side result.

#### C2.SC1.E2. Optional metadata attachment
**User story** — As a Mobile Developer, I want to attach custom metadata to the session, so that my analysts can filter and rules can evaluate against it.

**AC**
- `metadata` accepts a map of `string | number | boolean` values.
- Metadata appears on the session detail in Watchtower.
- Metadata is available to the Rules Engine as evaluable conditions.
- Metadata appears in the webhook payload.

**NAC**
- Metadata MUST NOT accept nested objects, arrays, or non-primitive values without clear rejection.
- Metadata MUST NOT be exfiltrated outside the org's tenant.

### C2.SC2. Identity assignment

#### C2.SC2.E1. Identity ID delivery
**User story** — As a Backend Developer, I want to receive the assigned `identityId` reliably, so that I can persist it for future authentication.

**AC**
- `identityId` is present in the SDK result on `APPROVE`.
- `identityId` is present in the `identity.created` webhook payload.
- `identityId` is present in the session detail returned by `GET /sessions/:id`.

**NAC**
- The backend MUST NOT issue an `identityId` for a rejected session.
- The same successful enrollment MUST NOT produce two different identity IDs across the SDK result and the webhook (they MUST match).

---

## C3. Authentication Verification Sessions

### C3.SC1. 1:1 verification against an enrolled identity

#### C3.SC1.E1. Standard authentication flow
**User story** — As an End User, I want to verify I'm the same person who enrolled, so that I can access my account.

**AC**
- `startVerification({ sessionType: 'authentication', identityId: 'idn_...', externalUserId: '...' })` launches the camera UI.
- The session performs a 1:1 face match against the enrolled template referenced by `identityId`.
- The session also performs a 1:N cross-identity scan to detect identity swaps.
- On approve, the result echoes the `identityId` that was authenticated against.

**NAC**
- The SDK MUST NOT accept `sessionType: 'authentication'` without `identityId`; it MUST reject with `INVALID_REQUEST`.
- The backend MUST NOT silently approve a session whose 1:1 match score is below the org's threshold — it MUST reject or route to manual review.
- The backend MUST NOT approve when a 1:N scan finds the live face matches a *different* enrolled identity with high confidence.

#### C3.SC1.E2. Identity not found
**User story** — As a Backend Developer, I want a clear error when I pass an unknown `identityId`, so that I can debug bad input.

**AC**
- Passing an unknown `identityId` rejects with `IDENTITY_NOT_FOUND`.
- The error is returned promptly (before camera launch) when possible.

**NAC**
- The SDK MUST NOT capture biometric data before validating the identity exists, to avoid wasting the user's time.

### C3.SC2. Identity swap detection

#### C3.SC2.E1. Cross-identity collision on authentication
**User story** — As a Risk Manager, I want UseSense to detect when a returning user's face matches a *different* identity, so that I catch identity-takeover attempts.

**AC**
- 1:N scan runs in parallel with 1:1 verification.
- If the live face matches another identity in the org with confidence above threshold, MatchSense surfaces this as a collision risk.
- The webhook `matchsense_risk_score` reflects the elevated risk.
- A case may be auto-created in the review queue depending on rules.

**NAC**
- A self-match (face matches the claimed identity) MUST NOT be flagged as a collision.
- Low-confidence matches MUST NOT auto-reject; thresholds are operator-tunable.

---

## C4. Server-Initiated Session Flows

### C4.SC1. Token-based session creation

#### C4.SC1.E1. Server-init token flow
**User story** — As a Backend Developer, I want to pre-create a session server-side and pass a one-time token to the app, so that I can avoid putting API secrets in the client.

**AC**
- `POST /v1/sessions/create-token` accepts a `reference_image` and returns a `client_token` with a 10-minute TTL.
- The client_token is single-use.
- The mobile SDK exposes `createSessionWithToken(clientToken:, sessionType:)` (iOS).
- The token-issued session resolves with the same `UseSenseResult` shape as a client-initiated session.

**NAC**
- An expired token MUST reject with `TOKEN_EXPIRED`.
- A previously-used token MUST reject with `TOKEN_ALREADY_USED`.
- A token from a different org / environment MUST reject with `INVALID_TOKEN`.

### C4.SC2. Remote enrollment / verification (Flutter, iOS)

#### C4.SC2.E1. Pre-created remote enrollment
**User story** — As a Backend Developer, I want to pre-create an enrollment ID server-side and have the app launch it directly, so that I can support email/SMS-link onboarding flows.

**AC**
- Flutter: `startRemoteEnrollment(enrollmentId: String)` launches the UI with the pre-created enrollment.
- Flutter: `startRemoteVerification(sessionId: String)` launches a pre-created verification session.
- The session uses the same scoring path as a client-initiated session.

**NAC**
- An invalid `enrollmentId` MUST reject with a clear, identifiable error.

---

## C5. Capture & Challenge System

### C5.SC1. Video capture

#### C5.SC1.E1. Default capture parameters
**User story** — As an End User, I want the capture to feel quick and natural, so that I'm not stuck staring at the camera.

**AC**
- Default capture duration is **8000 ms** (server may override).
- Default target FPS is **3** (range: 2–5).
- Default max frames is **30**.
- Default max upload size is **10 MB**.
- The SDK emits `CAPTURE_STARTED`, then a `FRAME_CAPTURED` per frame, then `CAPTURE_COMPLETED`.
- Image quality is checked per frame; an `IMAGE_QUALITY_CHECK` event surfaces issues like `LOW_LIGHT` or `FACE_NOT_DETECTED`.

**NAC**
- The SDK MUST NOT exceed `maxFrames` or `maxUploadSizeMb`.
- A capture whose frames are all rejected for low quality MUST surface `LOW_LIGHT` or `FACE_NOT_DETECTED`, not silently submit.

### C5.SC2. Audio capture

#### C5.SC2.E1. Conditional audio enablement
**User story** — As an End User, I want my microphone activated only when needed, so that my privacy is respected.

**AC**
- `audioEnabled: .never` — microphone is never engaged.
- `audioEnabled: .always` — audio is captured every session.
- `audioEnabled: .riskBased` (default) — audio is captured only when the server's risk model demands it.
- When audio is captured, `AUDIO_RECORD_STARTED` and `AUDIO_RECORD_COMPLETED` events fire.

**NAC**
- The SDK MUST NOT request microphone permission under `.never`.
- The SDK MUST NOT silently record audio without firing the corresponding events.

### C5.SC3. Active challenges

#### C5.SC3.E1. Challenge types
**User story** — As an End User, I want clear instructions when I'm asked to perform an action, so that I succeed on the first try.

**AC**
- Supported challenges: **head turn**, **follow dot** (ocular), **speak phrase** (audio), **3-2-1 countdown** (transition).
- Each challenge fires `CHALLENGE_STARTED` (with type) and `CHALLENGE_COMPLETED`.
- The challenge UI provides on-screen guidance in the SDK's locale (where localized).

**NAC**
- A challenge MUST NOT proceed without first showing its instruction.
- A failed challenge MUST NOT silently approve the session.

### C5.SC4. Adaptive step-up

#### C5.SC4.E1. Risk-based escalation
**User story** — As a Risk Manager, I want challenges added only when risk is elevated, so that legitimate users have the smoothest possible experience.

**AC**
- `stepUpPolicy: .never` — never add challenges.
- `stepUpPolicy: .always` — always issue challenges.
- `stepUpPolicy: .riskBased` (default) — challenges added when DeepSense or LiveSense scores are borderline.
- Result includes `decision: 'STEP_UP_REQUIRED'` when more verification is needed (Web SDK, server-driven).

**NAC**
- A `.never` policy MUST NOT issue challenges even when risk is high — the session is approved or rejected on initial signals.
- An `.always` policy MUST NOT skip challenges even on apparently-trustworthy sessions.

---

## C6. DeepSense — Channel & Device Integrity

### C6.SC1. Platform attestation

#### C6.SC1.E1. iOS App Attest
**User story** — As a Risk Manager, I want cryptographic proof that the iOS app is running on a real Apple device, so that emulators and tampered binaries are caught.

**AC**
- App Attest assertion is generated and submitted with each session on iOS 15+.
- A failed attestation lowers `channel_trust_score`.
- A successful attestation contributes to a high `channel_trust_score`.

**NAC**
- A missing or invalid attestation MUST NOT silently approve.

#### C6.SC1.E2. Android Play Integrity
**User story** — As a Risk Manager, I want cryptographic proof that the Android app is running on a Play-certified device, so that rooted, modified, or emulated environments are flagged.

**AC**
- Play Integrity token is requested when `googleCloudProjectNumber` is configured.
- The token is included in the session signals payload.
- Failed verdicts lower `channel_trust_score`.

**NAC**
- A missing `googleCloudProjectNumber` MUST NOT crash; it MUST proceed with reduced confidence (logged server-side).

### C6.SC2. Runtime integrity

#### C6.SC2.E1. Jailbreak / root detection
**AC**
- iOS detects jailbreak via signature checks (Cydia, common paths, sandbox escape probes).
- Android detects root via su binary, RW system partition, common rooting frameworks.
- Detected → `channel_trust_score` lowered; rule may auto-reject.

**NAC**
- The SDK MUST NOT crash on jailbroken/rooted devices; it MUST report and proceed.

#### C6.SC2.E2. Emulator / debugger / hooking detection
**AC**
- Emulator detection on Android (build props, sensor presence, fingerprint).
- Debugger detection on both platforms.
- Frida / Substrate / hooking framework detection.
- Each detection contributes a signal to the server; combined into `channel_trust_score`.

**NAC**
- Detection MUST NOT block legitimate developer testing in sandbox mode (signals are reported, not blocking).

### C6.SC3. Capture pipeline integrity

#### C6.SC3.E1. Virtual camera detection
**User story** — As a Risk Manager, I want OBS / ManyCam / virtual-camera-driver injections caught, so that pre-recorded or synthesized video can't be passed off as live.

**AC**
- The capture pipeline reports the source of each frame.
- Virtual camera signatures lower `channel_trust_score` significantly.
- Frame coherence analysis cross-checks for injection patterns (frame-size consistency, JPEG encoding fingerprints).

**NAC**
- A real hardware front camera MUST NOT be misclassified as virtual.

#### C6.SC3.E2. Camera-permission-injection pattern
**AC**
- If frames are submitted without the camera permission having been granted in-session, this is flagged as injection.

**NAC**
- A user who genuinely had pre-granted permissions MUST NOT be flagged.

### C6.SC4. Web-specific integrity (DeepSense-Web)

#### C6.SC4.E1. Browser & automation detection
**AC**
- WebDriver / headless-browser detection.
- GPU renderer analysis (`swiftshader`, `llvmpipe`, offscreen renderers → VM/CI signal).
- Browser fingerprint (CPU cores, memory, screen properties).
- Event-loop lag and navigation timing as performance fingerprint.
- WebGL fingerprinting (minimal renderer hash).
- Media-device enumeration (camera/mic counts).

**NAC**
- A real user on Chrome with a hardware GPU MUST NOT be flagged as automation.

---

## C7. LiveSense — Multimodal Liveness

### C7.SC1. Visual liveness

#### C7.SC1.E1. Presentation attack detection
**AC**
- Detects printed photos, video replays, 3D masks, screen-displayed content.
- Screen-reflection analysis identifies replay-on-screen.
- Combined into `liveness_score` (0–100).

**NAC**
- A real face under bright office lighting MUST NOT be flagged as replay.
- A mask with lifelike features MUST NOT be approved (priority test for QA).

#### C7.SC1.E2. Deepfake detection
**AC**
- Generative-model artifact fingerprinting on the captured frames.
- High-confidence deepfake → low `liveness_score`.

**NAC**
- A real face on an old or low-quality camera MUST NOT be flagged as deepfake at high confidence.

#### C7.SC1.E3. Geometric liveness
**AC**
- 3D face-mesh temporal coherence check (server-side).
- Optional iOS-side MediaPipe pre-flight (gated by MediaPipeTasksVision dependency).
- FLAME 3D model fitting on `POST /ml/flame/fit`.
- Stereo 3D reconstruction on `POST /ml/stereo/reconstruct`.

**NAC**
- Geometric checks MUST NOT block sessions when MediaPipe is absent — they degrade gracefully.

### C7.SC2. Behavioral liveness

#### C7.SC2.E1. Eye gaze / blink / micro-expressions
**AC**
- Eye-gaze tracking validates "follow dot" challenge.
- Blink frequency analysis as a passive signal.
- Facial micro-expression presence contributes to liveness.

**NAC**
- A user who naturally blinks rarely MUST NOT be auto-rejected on blink frequency alone.

#### C7.SC2.E2. Head rotation analysis
**AC**
- Distinguishes natural human head rotation from mechanical/replay rotation.
- Used for "head turn" challenge.

**NAC**
- Slow or partial head turns MUST be tolerated within a configurable range.

### C7.SC3. Audio liveness

#### C7.SC3.E1. Voice deepfake detection
**AC**
- MFCC stability analysis.
- Voice-clone detection.
- Codec-artifact analysis.
- Lip-movement audio sync verification.

**NAC**
- Background noise alone MUST NOT auto-reject — the system distinguishes ambient noise from synthetic voice.

---

## C8. MatchSense — Identity Collision Detection

### C8.SC1. 1:N enrollment dedup

#### C8.SC1.E1. Org-scoped duplicate scan
**User story** — As a Risk Manager, I want every enrollment scanned against my org's existing identities, so that the same person cannot enroll twice under different names.

**AC**
- Every enrollment session triggers a 1:N scan via AWS Rekognition.
- Match candidates above threshold flag the session for `MANUAL_REVIEW` or `REJECT` per rules.
- `dedupe_risk_score` is included in the webhook (lower = better).

**NAC**
- The 1:N scan MUST NOT cross organization boundaries (org isolation is strict).
- Sandbox identities MUST NOT appear in production scans (and vice versa).

### C8.SC2. 1:1 authentication match

#### C8.SC2.E1. Match against enrolled template
**AC**
- Authentication runs a 1:1 match against the enrolled face template.
- `match_score` is included in the webhook (0–100, higher = better).

**NAC**
- A different person posing as the enrolled identity MUST NOT pass when match score is below threshold.

### C8.SC3. Metadata-based matching

#### C8.SC3.E1. Custom field correlation
**AC**
- Operator-defined metadata edge configs match identities by custom fields (email, phone, IP, device fingerprint, any field).
- Used as evidence in fraud-ring formation.

**NAC**
- Empty or null metadata MUST NOT produce false matches.

### C8.SC4. Risk modifiers

#### C8.SC4.E1. Template age, image quality, face angle, device velocity
**AC**
- Older templates carry slightly higher risk weight (re-enrollment may be suggested).
- Lower-quality images carry higher risk on match.
- Frontal vs. angled enrollment quality is scored.
- Device velocity / impossible travel detection raises `matchsense_risk_score`.

---

## C9. SenSei — Orchestration & Adaptive Policy

### C9.SC1. Pillar score fusion

#### C9.SC1.E1. Verdict computation
**User story** — As a Risk Manager, I want pillar scores combined into a single verdict per my rules, so that decisions are consistent.

**AC**
- The orchestration engine computes a fused verdict from `channel_trust_score`, `liveness_score`, `match_score`, `presence_confidence`, and applied rules.
- The verdict is one of `APPROVE | REJECT | MANUAL_REVIEW | STEP_UP_REQUIRED`.
- The rule that triggered a non-default decision is recorded in `rule_triggered`.

**NAC**
- The verdict MUST NOT be computable on the client.
- The verdict MUST NOT change between the webhook and the session detail API.

### C9.SC2. Adaptive escalation

#### C9.SC2.E1. Step-up decisioning
**AC**
- When fused confidence is borderline, SenSei issues a step-up directive to the SDK.
- Step-up may add a challenge or request additional capture.

### C9.SC3. AI orchestration features

#### C9.SC3.E1. Pattern detection
**AC**
- Behavioral pattern analysis across sessions.
- Session-pattern clustering (fraud-ring candidate generation).
- Metadata anomaly detection.
- Temporal anomaly detection (unusual times, rapid retries).
- Device pattern anomaly detection.

**NAC**
- Anomaly flags MUST NOT auto-reject without an explicit rule.

---

## C10. Result Delivery — Client + Webhook

### C10.SC1. Redacted client result

#### C10.SC1.E1. Five-field shape
**User story** — As a CISO, I want the client result to expose nothing fraud-relevant, so that a tampered binary can't influence access decisions.

**AC**
- The client receives exactly: `sessionId`, `sessionType`, `identityId`, `decision`, `timestamp` (plus convenience booleans `isApproved`, `isRejected`, `isPendingReview`).
- The five fields are present on every successful session result.

**NAC**
- The client result MUST NOT contain pillar scores, fused confidence, session signature, or verdict metadata.
- The client result MUST NOT contain the `reasons` array, `rule_triggered`, or any signal-level data.

### C10.SC2. Signed webhook delivery

#### C10.SC2.E1. HMAC-SHA256 signature
**User story** — As a Backend Developer, I want every webhook to be cryptographically signed, so that I can reject forged verdicts.

**AC**
- Every webhook carries an `X-UseSense-Signature` header (HMAC-SHA256 of timestamp + body).
- The signing secret is per-webhook and rotatable.
- The webhook payload includes `event`, `session_id`, `organization_id`, `timestamp`, `data` with `decision`, `channel_trust_score`, `liveness_score`, `matchsense_risk_score`, `presence_confidence`, `session_type`, `identity_id`, `reasons`, `rule_triggered`, `session_signature`.

**NAC**
- A webhook MUST NOT be sent without the signature header.
- A signed webhook MUST verify against the **current** secret AND against the **previous** secret for a configurable grace period during rotation.

#### C10.SC2.E2. Replay protection
**AC**
- `X-Session-Token`, `X-Nonce`, and `X-Idempotency-Key` headers are present.
- Customers can reject duplicate idempotency keys.
- Timestamps allow customers to reject webhooks older than their tolerance window.

**NAC**
- The same `X-Idempotency-Key` MUST NOT be reused for distinct events.

#### C10.SC2.E3. Delivery guarantees & retries
**AC**
- Failed webhook delivery is retried per backoff schedule.
- Each delivery attempt is logged in `webhook_deliveries` and visible in Watchtower.
- A test-delivery endpoint allows operators to verify integration without a real session.

**NAC**
- A delivered webhook MUST NOT be silently dropped without an entry in the delivery log.

---

## C11. Watchtower — Auth & Account Management

### C11.SC1. Sign-up & sign-in

#### C11.SC1.E1. Email/password sign-up
**AC**
- `POST /watchtower-api/auth/signup` creates a user; verification email sent.
- `/signup` UI handles validation and submission.
- After sign-up, `/onboarding` walks the user through org creation.
- `/verify-email` confirms the address.

**NAC**
- Duplicate email MUST NOT silently create a second account.
- Sign-up MUST NOT auto-verify email without the user clicking the link.

#### C11.SC1.E2. Login + MFA
**AC**
- Login is handled by Supabase Auth.
- MFA setup via `/mfa-setup` (TOTP or email).
- MFA verification at login via `/mfa-verification`.
- Login is logged via `POST /watchtower-api/auth/track-login`.

**NAC**
- A user with MFA enabled MUST NOT be logged in without MFA verification.

#### C11.SC1.E3. Password recovery
**AC**
- `/forgot-password` sends a recovery email.
- `/set-password` consumes the token and resets the password.
- `POST /auth/verify-recovery-token` validates the token before allowing reset.

**NAC**
- A used or expired recovery token MUST NOT allow password reset.

#### C11.SC1.E4. SSO callback
**AC**
- `/sso-callback` completes the SSO handshake and creates/links a user account.

### C11.SC2. Profile & sessions

#### C11.SC2.E1. Active session management
**AC**
- `/profile/sessions` lists active sessions with device, IP, last activity.
- `POST /profile/revoke-session` terminates a specific session.
- `POST /profile/cleanup-old-sessions` purges stale sessions.

**NAC**
- A revoked session MUST NOT continue to authorize requests.

#### C11.SC2.E2. Account deactivation & deletion
**AC**
- `POST /profile/deactivate` disables the account (recoverable).
- `POST /profile/delete` permanently deletes the account (irrecoverable).
- Deletion triggers compliance workflows (data export option, audit log entry).

**NAC**
- Deletion MUST NOT leave orphaned organization ownership; ownership transfer is required first.

### C11.SC3. Invitations

#### C11.SC3.E1. Invite team members
**AC**
- `POST /invitations/send` sends a token-based invitation email.
- Invitation links expire.
- `POST /invitations/accept` provisions the user into the org with the invited role.
- `/users/:id/resend-invite` re-sends.

**NAC**
- An accepted invitation MUST NOT be reusable.
- Expired invitation MUST reject acceptance with a clear error.

---

## C12. Sessions Explorer

### C12.SC1. Sessions list

#### C12.SC1.E1. Filter, paginate, search
**User story** — As a Fraud Analyst, I want to filter sessions by decision, time, device, and metadata, so that I can investigate patterns.

**AC**
- `/sessions` lists sessions with pagination.
- Filters: decision, date range, session type, identity, metadata fields, device fingerprint, risk band.
- `GET /sessions` REST API supports the same filters.

**NAC**
- Filters MUST NOT cross org boundaries.

### C12.SC2. Session detail

#### C12.SC2.E1. Full pillar breakdown
**AC**
- `/sessions/:sessionId` shows: decision, all pillar scores, decision_breakdown, device_fingerprint, policy applied, rule_triggered, captured signals manifest, web integrity (where applicable), audio metadata.
- Capture playback (frames, audio if captured).
- Linked identity and any linked cases / fraud rings.

**NAC**
- Session detail MUST NOT show data from other orgs.

#### C12.SC2.E2. Manual override
**AC**
- `POST /sessions/:id/override` lets an operator change a decision, with reason text.
- Override is recorded in audit log.

**NAC**
- A non-Admin/Owner role MUST NOT be able to override.

#### C12.SC2.E3. PDF report
**AC**
- `GET /sessions/:id/report` generates a PDF for compliance/legal use.

#### C12.SC2.E4. Retry
**AC**
- `POST /sessions/:id/retry` re-runs scoring on the captured signals (e.g. after a model upgrade).

---

## C13. Identities Management

### C13.SC1. Identity list & detail

#### C13.SC1.E1. Identity overview
**AC**
- `/identities` lists all enrolled identities for the org with status, created_at, metadata.
- `/identities/:identityId` shows enrollment session, all subsequent authentication sessions, match scores over time, linked cases / rings, current status.

#### C13.SC1.E2. Identity status management
**AC**
- Statuses include `active`, `hold`, `blocked`, `deleted` (soft-delete).
- `PUT /identities/:id` updates status and metadata.
- Status changes are audit-logged.

**NAC**
- A `blocked` identity MUST fail subsequent authentication attempts.
- Soft-deleted identities MUST NOT appear in 1:N scans for new sessions but MUST remain in the audit trail.

#### C13.SC1.E3. Server-side identity creation
**AC**
- `POST /identities` creates an identity from a server-supplied reference image.

---

## C14. Cases — Manual Review Queue

### C14.SC1. Case queue

#### C14.SC1.E1. Case list & assignment
**User story** — As a Fraud Analyst, I want to see all cases awaiting review, prioritized and assigned, so that I can clear the queue efficiently.

**AC**
- `/cases` lists cases with status, priority, assignment, linked session/identity/ring.
- Cases are auto-created when SenSei routes a session to manual review.
- Auto-assignment via configurable engine (round-robin, load-balanced).
- Priority levels: critical, high, medium, low.

**NAC**
- A case MUST NOT be assigned to a deactivated user.

#### C14.SC1.E2. Case detail and review actions
**AC**
- `/cases/:caseId/review` shows full case context: session, identity, signals, related cases.
- Notes can be added and edited.
- Custom action types (operator-defined reason codes) drive disposition.
- Status workflow: open → in-review → resolved → closed.

#### C14.SC1.E3. Bulk operations
**AC**
- `POST /cases/bulk` applies action to multiple cases.

**NAC**
- A bulk action MUST NOT silently skip cases the user lacks permission to act on — it MUST report counts.

### C14.SC2. Case routing settings

#### C14.SC2.E1. Routing configuration
**AC**
- `/cases/settings` configures auto-assignment, priority defaults, SLA thresholds.

---

## C15. Rules Engine

### C15.SC1. Rule authoring

#### C15.SC1.E1. Rule builder
**User story** — As a Risk Manager, I want to build custom rules from session metadata and pillar scores, so that I can encode my org's risk policy.

**AC**
- `/rules/create` provides a builder UI.
- Available fields exposed via `GET /rules/metadata-keys`.
- Conditions can reference: enrollment metadata, authentication metadata, session signals, previous session history, device fingerprint, geographic data, pillar scores.
- Actions: `APPROVE | REJECT | MANUAL_REVIEW | STEP_UP_REQUIRED`.
- Priority field controls evaluation order.

**NAC**
- A rule with circular logic (e.g. impossible conditions) MUST be rejected at save time.

#### C15.SC1.E2. Templates library
**AC**
- `/rules/templates` offers pre-built rules (high-risk geo, mismatched device, rapid retry, etc.).
- Templates can be customized before activation.

#### C15.SC1.E3. AI-suggested rules
**AC**
- SenSei can propose rules based on observed fraud patterns.
- Suggested rules are flagged `ai_generated: true` for transparency.

### C15.SC2. Rule simulation & impact analysis

#### C15.SC2.E1. Impact analysis
**AC**
- `/rules/impact-analysis` replays the rule against historical sessions.
- Shows how many decisions would change.

#### C15.SC2.E2. Simulate before activating
**AC**
- `POST /rules/simulate` tests a rule against sample data without affecting production.

**NAC**
- Simulation MUST NOT trigger real webhooks or update real session decisions.

### C15.SC3. Rule lifecycle

#### C15.SC3.E1. Activate / deactivate / delete
**AC**
- Rules have an `active` flag.
- `DELETE /rules/:id` removes the rule; archived for audit.
- Deactivation takes effect immediately on subsequent sessions.

---

## C16. Fraud Ring Detection

### C16.SC1. Ring formation

#### C16.SC1.E1. Automatic ring detection
**User story** — As a Fraud Analyst, I want UseSense to surface coordinated fraud rings automatically, so that I see the bigger picture beyond individual sessions.

**AC**
- Rings are formed by detecting connected identities via face / metadata / device / IP matches.
- Triggers: face_match clusters, metadata patterns, device patterns, IP patterns.
- Each ring has nodes (identities) and edges (typed connections with confidence + evidence session IDs).

**NAC**
- A coincidental single-attribute match (e.g. shared IP from a public Wi-Fi) MUST NOT auto-form a ring without additional evidence.

#### C16.SC1.E2. Metadata edge configs
**AC**
- Operators define `metadata_edge_configs` (field path, match type, confidence threshold, min identity count).
- Edge configs are evaluated to form `metadata_match` edges.

### C16.SC2. Ring management

#### C16.SC2.E1. Ring detail view
**AC**
- `/fraud-rings/:fraudRingId` shows: network graph, timeline, member nodes with risk scores and seed indicators, edges with type and confidence, activity log.
- Status workflow: active → investigating → resolved | archived.

#### C16.SC2.E2. Bulk actions on rings
**AC**
- Bulk-block all identities in a ring.
- Bulk-add to blocklist.
- Assign analyst.
- Resolve / re-investigate.

**NAC**
- A bulk-block MUST NOT block identities outside the ring.

---

## C17. Blocklist Management

### C17.SC1. Org blocklist

#### C17.SC1.E1. Entry types & expiry
**AC**
- Entry types: `face_id` (Rekognition template), `email`, `phone`, `external_user_id`, `device_fingerprint`.
- Entries can have optional expiry.
- Reason text is required.

**NAC**
- An expired entry MUST NOT block new sessions.
- A `face_id` entry MUST NOT match faces of unrelated people (false-positive risk owned by the matching threshold).

### C17.SC2. Global blocklist

#### C17.SC2.E1. Subscribe to global list
**AC**
- `/blocklist/subscription` enables/disables subscription.
- Subscribed orgs receive global blocklist entries.
- Global entries are managed separately (`/blocklist/global`).

**NAC**
- Subscribing MUST NOT expose this org's local entries to other subscribers without explicit opt-in for contribution.

---

## C18. Webhooks Configuration

### C18.SC1. Webhook CRUD

#### C18.SC1.E1. Create / list / update / delete
**AC**
- `POST /webhooks` creates a webhook with URL, event subscriptions, signing secret.
- `GET /webhooks/events` lists subscribable events (see Appendix C).
- `PUT /webhooks/:id` updates URL/events/secret.
- `DELETE /webhooks/:id` removes the webhook.

**NAC**
- A webhook URL MUST be HTTPS in production.

### C18.SC2. Test & monitor

#### C18.SC2.E1. Test delivery
**AC**
- `POST /webhooks/:id/test` sends a sample payload to verify the integration.

#### C18.SC2.E2. Delivery logs & stats
**AC**
- `GET /webhooks/:id/logs` shows per-attempt delivery records.
- `GET /webhooks/:id/stats` shows success/failure rates.

#### C18.SC2.E3. Secret rotation
**AC**
- `POST /webhooks/regenerate-secret` rotates the signing secret.
- Old secret remains valid for a configurable grace period.

---

## C19. API Keys Management

### C19.SC1. Key lifecycle

#### C19.SC1.E1. Generate, rotate, revoke, expire
**AC**
- `POST /api-keys` generates a new key (returned plaintext **once**).
- Keys store hashed; never recoverable.
- `POST /api-keys/:id/rotate` rotates atomically.
- `POST /api-keys/:id/revoke` invalidates immediately.
- `PUT /api-keys/:id` updates name/expiry.
- Optional expiry timestamp.
- Bulk revocation supported via `POST /api-keys/bulk-delete`.

**NAC**
- A key plaintext MUST NOT be retrievable after creation.
- A revoked or expired key MUST fail authentication immediately.

### C19.SC2. Key types

#### C19.SC2.E1. Public vs. secret keys
**AC**
- Prefixes: `pk_` (public, client-safe) and `sk_` (secret, backend-only).
- Sandbox vs. production indicated in prefix (`sk_sandbox_`, `pk_prod_`, etc.).
- Public keys cannot perform admin operations.

### C19.SC3. Usage tracking

#### C19.SC3.E1. Per-key usage stats
**AC**
- `GET /api-keys/:id/usage` shows last_used_at, request counts, error rates.

---

## C20. Analytics & Reporting

### C20.SC1. Out-of-box analytics

#### C20.SC1.E1. Dashboard KPIs
**AC**
- `/dashboard` shows approval/rejection/manual-review rates, average channel-trust/liveness/match scores, session volume trends, device/platform breakdown, geographic distribution.
- `GET /dashboard/stats` API returns same data.

### C20.SC2. Custom report builder

#### C20.SC2.E1. Build, save, share
**AC**
- `/analytics/report-builder` provides drag-and-drop metric selection, time-range filtering, segmentation.
- `POST /analytics/reports` saves a report.
- `POST /analytics/reports/:id/duplicate` clones.
- `/public/report/:reportId` provides a shareable read-only URL.

**NAC**
- A public report URL MUST NOT expose org-private metadata fields beyond what's in the saved report.

#### C20.SC2.E2. Custom queries
**AC**
- `POST /analytics/query` runs ad-hoc time-series queries.
- `GET /analytics/properties` lists queryable properties.

---

## C21. Billing & Credits

### C21.SC1. Credit balance & usage

#### C21.SC1.E1. View credits
**AC**
- `/billing` shows current balance, total purchased, total used, last updated.
- Sandbox and production are tracked separately; sandbox is unlimited and never billed.
- `GET /billing/credits` API returns the same.

**NAC**
- Sandbox usage MUST NOT decrement production credits.

### C21.SC2. Purchase

#### C21.SC2.E1. Pack purchase via Stripe
**AC**
- 9 packs available: 1K, 5K, 10K, 25K, 50K, 100K, 250K, 500K, 1M credits.
- Pricing: $0.10 per credit at 1K → $0.03 at 1M (volume discount up to 70%).
- `POST /billing/create-payment-intent` initiates a Stripe payment.
- `POST /billing/confirm-purchase` adds credits on success.
- `GET /billing/pricing` returns current pack pricing.

**NAC**
- A failed Stripe charge MUST NOT add credits.
- A duplicate confirm-purchase call MUST NOT double-credit (idempotent).

### C21.SC3. Auto-top-up

#### C21.SC3.E1. Configure auto-top-up
**AC**
- `PUT /billing/auto-topup` sets threshold + pack to purchase.
- `POST /billing/save-payment-method` saves a card for future charges.
- Auto-top-up triggers when balance drops below threshold.
- `billing.auto_topup.succeeded` and `billing.auto_topup.failed` webhooks fire.

**NAC**
- Auto-top-up MUST NOT trigger when disabled.
- A failed auto-top-up MUST NOT loop endlessly; it must back off and notify.

### C21.SC4. Invoices & alerts

#### C21.SC4.E1. Invoice download
**AC**
- `GET /billing/invoice/:invoiceId/download` returns a PDF.
- Invoices are listed in `/billing`.

#### C21.SC4.E2. Low-balance alerts
**AC**
- `billing.credits_low` webhook fires at configurable threshold.
- In-app payment-alert banner shown.
- `POST /billing/payment-alerts/dismiss` dismisses.

### C21.SC5. AI allowance

#### C21.SC5.E1. SenSei query quota
**AC**
- 1 AI query per 10 verification credits granted automatically.
- Tracked separately from verification credit balance.

---

## C22. Team & RBAC

### C22.SC1. Team management

#### C22.SC1.E1. List, invite, update, remove, suspend
**AC**
- `/users` lists team members.
- `POST /users/invite` invites.
- `PUT /users/:id` updates role.
- `DELETE /users/:id` removes.
- `POST /users/:id/suspend` suspends without deleting.

**NAC**
- The last Owner of an org MUST NOT be removable until ownership is transferred.

### C22.SC2. Roles

#### C22.SC2.E1. Default roles
**AC**
- Default roles: **Owner**, **Admin**, **Analyst**, **Developer**, **Viewer**.
- Owner: full access including billing & ownership transfer.
- Admin: manage users, settings, billing.
- Analyst: review cases, manage identities.
- Developer: API access, webhook management.
- Viewer: read-only.

#### C22.SC2.E2. Custom roles
**AC**
- `POST /roles` creates a custom role with specific permissions.
- `PUT /roles/:roleId` updates.
- `DELETE /roles/:roleId` deletes (only if no users assigned).

**NAC**
- A custom role MUST NOT grant permissions beyond what an Admin can grant.

---

## C23. SSO & Slack Integration

### C23.SC1. SSO

#### C23.SC1.E1. OAuth2 / OIDC SSO
**AC**
- SSO configured per org via `/settings`.
- OAuth2 / OIDC providers supported.
- SSO can be optional or enforced.
- `/sso-callback` completes the handshake.

**NAC**
- When SSO is enforced, password login MUST be disabled for non-Owner users.

### C23.SC2. Slack

#### C23.SC2.E1. Install & route notifications
**AC**
- `/settings/slack/oauth/start` initiates install.
- `POST /settings/slack/oauth/callback` completes install.
- Channel-routed notifications for high-risk sessions, case assignments, fraud-ring alerts.

**NAC**
- Slack notifications MUST NOT contain raw biometric data or PII beyond what was explicitly configured.

---

## C24. Audit Logs

### C24.SC1. Audit trail

#### C24.SC1.E1. Comprehensive logging
**AC**
- Every user action is logged: create, update, delete, override, login.
- Each entry includes: user, IP, user_agent, timestamp, resource type, resource id, success/failure, compliance category.
- Stored in monthly-partitioned tables for retention control.
- `GET /audit-logs` lists entries with filters.

**NAC**
- Audit log entries MUST NOT be editable or deletable through any user-facing API.

---

## C25. Compliance & Privacy

### C25.SC1. Data subject rights

#### C25.SC1.E1. GDPR / CCPA export
**AC**
- `POST /data/export` generates a downloadable archive of a subject's sessions, identities, cases.
- Export includes all data within the org for the specified subject.

#### C25.SC1.E2. Right to erasure
**AC**
- `POST /privacy-requests` creates a deletion request.
- Workflow: pending → reviewed → executed.
- `GET /privacy-requests/:id` shows status.
- Identities are soft-deleted; biometric templates are purged.

**NAC**
- A deletion MUST NOT remove audit log entries (those are retained for compliance).

### C25.SC2. Consent

#### C25.SC2.E1. Consent records
**AC**
- `POST /compliance/consent` records consent.
- `GET /compliance/consent` retrieves consent state.

### C25.SC3. Compliance reporting

#### C25.SC3.E1. Compliance summary
**AC**
- `GET /compliance/report` produces a summary of consent, retention, audit posture for regulator review.

### C25.SC4. Retention

#### C25.SC4.E1. Configurable retention
**AC**
- Per-org retention policies for sessions, audit logs, biometric templates.
- `POST /data/cleanup` triggers retention enforcement.

**NAC**
- Cleanup MUST NOT delete data within the configured retention window.

---

## C26. Ask SenSei (AI Case Analysis)

### C26.SC1. Natural-language case analysis

#### C26.SC1.E1. Conversational case interrogation
**User story** — As a Fraud Analyst, I want to ask natural-language questions about a case, so that I can triage faster.

**AC**
- `/ask-sensei` UI provides a chat interface.
- `POST /ask-sensei` accepts a query and returns AI-generated analysis.
- Conversation threads preserved per case (`sensei_threads`, `sensei_messages`).
- Token usage tracked.

**NAC**
- AI responses MUST NOT auto-execute actions (close case, override decision, etc.).
- Query MUST NOT exceed AI allowance quota.

### C26.SC2. Suggestion engine

#### C26.SC2.E1. Case-disposition suggestions
**AC**
- AI suggests case dispositions based on similar historical cases.
- Suggestions are advisory only.

#### C26.SC2.E2. Rule suggestions
**AC**
- AI suggests rules based on observed fraud patterns.
- Suggestions are flagged in `/rules` as `ai_generated`.

---

## C27. Branding & Customization

### C27.SC1. SDK UI branding

#### C27.SC1.E1. Branding fields applied to all SDKs
**AC**
- Configurable: `logoUrl`, `primaryColor` (hex), `buttonRadius`, `fontFamily`, `displayName` (Android), `redirectUrl` (Android).
- Branding configured per org in `/settings` and applied automatically to SDK sessions.
- Per-call branding override possible via SDK config.

**NAC**
- Branding MUST NOT override SDK accessibility minimums (text contrast, tap target sizes).

### C27.SC2. Capture & challenge customization

#### C27.SC2.E1. Operator-tunable capture
**AC**
- Operator can override default capture duration, FPS, max frames, max upload size at the org level.
- Step-up policy and audio mode configurable.

---

## C28. Network Admin (UseSense-Internal)

### C28.SC1. Multi-org operator console

#### C28.SC1.E1. Network dashboard
**AC**
- `/network/login` separate auth flow for UseSense ops staff.
- `/network` shows all customer organizations.
- `/network/organisations/:orgId` allows UseSense staff to inspect and adjust per-org config, billing, feature flags.

**NAC**
- Customer users MUST NOT have access to `/network/*` routes.
- Network admin actions MUST be logged to the customer org's audit log when they affect customer state.

### C28.SC2. Feature flags

#### C28.SC2.E1. Per-org feature toggling
**AC**
- `GET /dev/feature-flags` lists flags.
- `PUT /dev/feature-flags/:flagName` toggles per-org.

### C28.SC3. Sandbox seeding & ops tools

#### C28.SC3.E1. Seed / clear sandbox
**AC**
- `POST /seed-sandbox-data` populates a sandbox with deterministic test sessions, identities, cases.
- `POST /clear-sandbox-data` wipes sandbox.

**NAC**
- Seed/clear MUST NOT operate on production data under any circumstance.

---

## C29. Cross-Platform Consistency

### C29.SC1. Canonical API surface across SDKs

#### C29.SC1.E1. Same event names across all SDKs
**AC**
- Every SDK emits events using the canonical `UPPER_SNAKE_CASE` vocabulary (see Appendix A).
- A QA test that subscribes on iOS, Android, RN, Flutter, Web and runs the same session sees the same event sequence.

**NAC**
- Platform-specific event names (e.g. `sessionCreated` on iOS native) MUST NOT leak through to the canonical interface.

#### C29.SC1.E2. Same error codes across all SDKs
**AC**
- Error codes are the canonical `UPPER_SNAKE_CASE` set (see Appendix B).
- Bridge-specific codes (e.g. `session_cancelled`) are documented and consistent across RN/Flutter.

### C29.SC2. Same `UseSenseResult` shape

#### C29.SC2.E1. Five-field shape on every platform
**AC**
- Every SDK returns the same five fields plus convenience booleans.

**NAC**
- iOS/Android native MUST NOT expose pillar scores in the result object even though the native SDKs *could*.

---

## C30. Non-Functional Requirements

### C30.SC1. Performance

#### C30.SC1.E1. Session latency
**AC**
- Median session duration (tap → verdict): **6–12 seconds** on a recent mid-range device on 4G.
- Verdict computation server-side: < 2 seconds median after upload.

### C30.SC2. Reliability

#### C30.SC2.E1. SDK robustness
**AC**
- SDK survives backgrounding/foregrounding mid-session (with sensible behavior — usually reject and require restart).
- SDK survives network drop mid-upload (retries with backoff).

### C30.SC3. Security

#### C30.SC3.E1. Transport & at-rest encryption
**AC**
- All API traffic over TLS 1.3.
- Data at rest encrypted (AES-256 via Supabase).
- API keys hashed (never plaintext-stored).
- Webhook signing via HMAC-SHA256.

### C30.SC4. Privacy

#### C30.SC4.E1. Org isolation
**AC**
- No data crosses org boundaries except via explicit opt-in (global blocklist contribution).

### C30.SC5. Localization & accessibility

**[ROADMAP]** — formal localization and a11y audit in progress.

### C30.SC6. Observability

#### C30.SC6.E1. Health endpoint
**AC**
- `GET /health` returns service status.

---

## Appendix A: Canonical event vocabulary

`SESSION_CREATED`, `PERMISSIONS_REQUESTED`, `PERMISSIONS_GRANTED`, `PERMISSIONS_DENIED`, `CAPTURE_STARTED`, `FRAME_CAPTURED`, `CAPTURE_COMPLETED`, `AUDIO_RECORD_STARTED`, `AUDIO_RECORD_COMPLETED`, `CHALLENGE_STARTED`, `CHALLENGE_COMPLETED`, `UPLOAD_STARTED`, `UPLOAD_PROGRESS`, `UPLOAD_COMPLETED`, `COMPLETE_STARTED`, `DECISION_RECEIVED`, `IMAGE_QUALITY_CHECK`, `ERROR`, `UNKNOWN`.

---

## Appendix B: Canonical error codes

**Device / permission**: `CAMERA_UNAVAILABLE`, `CAMERA_PERMISSION_DENIED`, `MIC_PERMISSION_DENIED`
**Network**: `NETWORK_ERROR`, `NETWORK_TIMEOUT`
**Session**: `SESSION_EXPIRED`, `SESSION_NOT_FOUND`, `INVALID_TOKEN`, `TOKEN_EXPIRED`, `TOKEN_ALREADY_USED`
**Auth**: `UNAUTHORIZED`, `INVALID_CONFIG`, `INVALID_REQUEST`
**Identity**: `IDENTITY_NOT_FOUND`
**Resource**: `QUOTA_EXCEEDED`, `INSUFFICIENT_CREDITS`
**Capture**: `CAPTURE_FAILED`, `ENCODING_FAILED`, `UPLOAD_FAILED`, `FACE_NOT_DETECTED`, `LOW_LIGHT`, `TIMEOUT`
**Server**: `SERVER_ERROR`, `SERVICE_UNAVAILABLE`
**Bridge / SDK-internal**: `session_cancelled`, `sdk_not_initialized`, `no_view_controller`, `NONCE_MISMATCH`, `USER_CANCELLED`, `UNKNOWN_ERROR`

Android numeric codes: `1001` camera unavailable, `1002` camera permission, `1003` mic permission, `2001` network error, `2002` network timeout, etc.

---

## Appendix C: Webhook event vocabulary

| Event | When it fires |
|---|---|
| `session.completed` | Verification finished (any decision) |
| `identity.created` | Enrollment succeeded; identity record created |
| `identity.enrolled` | Identity confirmed (post-creation flow complete) |
| `fraud_ring.detected` | Coordinated fraud cluster identified |
| `case.created` | Manual review case generated |
| `billing.credits_low` | Balance approaching configured threshold |
| `billing.auto_topup.succeeded` | Auto-replenishment charged successfully |
| `billing.auto_topup.failed` | Auto-replenishment failed |

---

## Appendix D: QA test environment matrix

| Dimension | Values |
|---|---|
| **Platform** | iOS 15 / 16 / 17 / 18, Android 9 / 11 / 13 / 14, Chrome 80 / latest, Safari 14 / latest |
| **SDK** | iOS native, Android native, React Native (New + Old Arch), Flutter, Web |
| **Network** | Wi-Fi, 4G, 3G throttled, offline, mid-flight drop |
| **Device class** | Recent flagship, mid-range, low-end, tablet, jailbroken, rooted, emulator |
| **Capture conditions** | Bright light, low light, backlit, partially obscured, multiple faces |
| **Attack surface** | Printed photo, video replay (phone screen), 3D mask, generative deepfake video, voice clone, virtual camera (OBS / ManyCam), WebDriver / headless browser, identity-farm pattern (rapid sequential enrollments) |
| **Environment** | Sandbox, production |
| **Org config** | All rule templates active, no rules, custom rules, MFA enforced, SSO enforced, Slack enabled, auto-top-up enabled, auto-top-up disabled |
| **Locale** | en-US, en-GB, fr-FR, es-MX, pt-BR, ar (RTL), zh-CN, ja-JP — confirm capture flow language fallback |
| **Role** | Owner, Admin, Analyst, Developer, Viewer, custom role |

---

*Document owner: Product. Last updated: 2026-04-13. Built from a full audit of the workspace at `/Users/opeyemiadeyemi/work/usesense-workspace/`. Open issues / additions: file PRs against `docs/UseSense-Product-Specification.md`.*
