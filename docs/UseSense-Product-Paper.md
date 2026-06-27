# Sense — Product Paper

*A reference document for the Sense marketing team. Built from a full audit of the product workspace (mobile SDKs, web SDK, Flutter SDK, Watchtower dashboard + backend) — every feature listed exists in code today unless explicitly marked as roadmap.*

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [The problem](#2-the-problem)
3. [The solution](#3-the-solution)
4. [Who it's built for](#4-who-its-built-for)
5. [The four pillars (DeepSense, LiveSense, MatchSense, SenSei)](#5-the-four-pillars)
6. [End-to-end session flow](#6-end-to-end-session-flow)
7. [Product surface — SDKs](#7-product-surface--sdks)
8. [Product surface — Watchtower (operator dashboard)](#8-product-surface--watchtower)
9. [Product surface — Backend APIs, webhooks, integrations](#9-product-surface--backend-apis-webhooks-integrations)
10. [Anti-fraud capabilities (full named list)](#10-anti-fraud-capabilities)
11. [Customization, branding, and configuration](#11-customization-branding-and-configuration)
12. [Compliance, security, and data posture](#12-compliance-security-and-data-posture)
13. [Commercial model and pricing](#13-commercial-model-and-pricing)
14. [Differentiation and competitive frame](#14-differentiation-and-competitive-frame)
15. [Messaging matrix](#15-messaging-matrix)
16. [Roadmap and experimental signals](#16-roadmap-and-experimental-signals)
17. [Glossary](#17-glossary)
18. [One-page summary](#18-one-page-summary)

---

## 1. Executive summary

**Sense is a presence-verification platform.** It answers a single, deceptively hard question every time a digital service interacts with a user:

> *Is there a real, live, unique human on the other side of this camera right now — and are they who they claim to be?*

Sense answers it by combining **four independent verification systems** — **DeepSense** (device & channel integrity), **LiveSense** (multimodal proof-of-life), **MatchSense** (identity collision detection), and **SenSei** (adaptive policy + AI orchestration) — into a single SDK-driven session that returns a cryptographically signed, server-side verdict (`APPROVE` / `REJECT` / `MANUAL_REVIEW` / `STEP_UP_REQUIRED`) to the customer's backend.

The product ships as:

- **Six SDK surfaces** — native iOS (Swift), native Android (Kotlin), React Native, Flutter, Web/JavaScript, and white-label hosted pages.
- **Watchtower** — a full-featured operator dashboard with sessions explorer, identity graph, manual review queue, fraud-ring detection, custom rules engine, custom report builder, blocklist management, RBAC, SSO, audit log, and Stripe-powered billing.
- **A backend verification engine** with HMAC-SHA256 signed webhooks, REST API, ML services (FLAME 3D face fitting, stereo reconstruction), and an embedded AI assistant (SenSei) for case analysis.

Sense is built for the post-deepfake, post-injection-attack era of digital identity, where the threat is no longer a stolen password — it is a synthetic face, a virtualized camera, a tampered device, or a coordinated fraud ring pretending to be a hundred different people.

---

## 2. The problem

### 2.1 The world has changed faster than identity verification has

For two decades, "Know Your Customer" (KYC) and identity verification meant: *upload an ID, take a selfie, our system compares the two faces*. That model assumes:

1. The selfie was captured by a real person looking at a real phone.
2. The camera feed wasn't intercepted, replaced, or synthesized.
3. The person hasn't already enrolled three other times under different names.
4. The device itself isn't an emulator, a rooted handset, or a farm rig.
5. The verification isn't part of a coordinated attack across hundreds of accounts.

**Every one of those assumptions is now routinely false.**

- **Generative AI** can produce photorealistic faces, voices, and full video on consumer hardware. A $20/month tool can generate a "live" video of a person who does not exist.
- **Camera injection attacks** — where an attacker replaces the camera feed at the OS or driver level with a pre-recorded or synthesized stream — are sold as turnkey services on Telegram and dark-web markets. Tools like virtual-camera drivers, OBS plugins, and ManyCam are weaponized in minutes.
- **Identity farms** in Southeast Asia, West Africa, and Eastern Europe enroll the same person across hundreds of services using slightly altered metadata, building "synthetic identities" that pass standard KYC.
- **Coordinated fraud rings** orchestrate dozens or hundreds of fake identities with shared devices, IPs, and metadata — invisible to single-session verification.
- **Deepfake voice clones** of as little as 3 seconds of audio defeat voice-biometric step-up.
- **Headless browsers and automation frameworks** (WebDriver, Puppeteer, Playwright) enable scripted account-creation at scale.

The result: financial services, fintechs, gig platforms, healthcare providers, and government services are seeing **fraud loss rates that double year-over-year**, with the fastest-growing category being **first-party synthetic fraud** — fraud committed by an "identity" that never existed.

### 2.2 Why incumbents fall short

The first generation of identity vendors (Jumio, Onfido, Veriff, Persona, Socure) was built around document capture and 1:1 face-match. They have bolted on "liveness" — usually a single check like "blink" or "turn your head" — but that approach has four structural limits:

1. **Single-pillar verification is brittle.** A liveness model trained to detect blinks will be defeated by a generative model that produces blinks. Each vendor is in an arms race against attackers who only need to break *one* check.
2. **Client-side scoring is reverse-engineerable.** Any signal computed and trusted on the device can be spoofed. Most incumbents return a confidence score directly to the mobile app; attackers patch the binary and override it.
3. **No cross-customer view.** Each vendor verifies in isolation. A synthetic identity rejected by Bank A is happily enrolled by Bank B 30 minutes later.
4. **No ring-level intelligence.** Per-session verification cannot see that fifty "different users" are actually one fraud ring sharing devices, IPs, and metadata patterns.

Sense was built specifically to solve all four problems.

---

## 3. The solution

### 3.1 Product positioning

> **Sense is the presence-verification layer for the deepfake era.**
> Four independent pillars, server-side scoring, a fraud-ring graph, and a customer-tunable rules engine — delivered as a drop-in SDK with a full operator dashboard.

We do not position as another KYC vendor. We complement them. A typical deployment is:

```
[ Document KYC vendor ]  →  [ UseSense presence verification ]  →  [ Customer backend ]
        (Onfido, Jumio,        (deepfake / injection / collision        (final access
         Persona, etc.)         detection + rules + signed verdict)      decision)
```

Customers keep their existing KYC vendor for document parsing and use Sense as the **trust anchor for the human behind the device** — at enrollment, at re-authentication, at high-value transaction step-up, and at any moment they need fresh proof that the same real person is still there.

### 3.2 What makes the architecture defensible

| Architectural choice | Why it matters |
|---|---|
| **Defense-in-depth across 4 independent pillars** | An attacker has to defeat all of them simultaneously. Beating one (e.g. a deepfake that fools LiveSense) doesn't help if DeepSense flags the virtual camera or MatchSense surfaces a prior collision. |
| **Server-side scoring; redacted client result** | The mobile result is a five-field shape — `sessionId`, `sessionType`, `identityId`, `decision`, `timestamp`. Pillar scores, fused confidence, and verdict metadata are delivered only to the customer's backend via signed webhook. There is no score on the device to patch. |
| **HMAC-SHA256 signed webhooks** | The verdict cannot be forged by anyone who doesn't hold the signing secret. Replay-protected with timestamp + nonce + idempotency key. |
| **Cross-customer identity graph** | A face seen committing fraud at one customer can be flagged at the next. (Opt-in via global blocklist subscription.) |
| **Fraud-ring graph** | Coordinated attacks are detected as a network — nodes (identities), edges (face / metadata / device / IP matches), with confidence scores and evidence sessions. |
| **Customer-tunable rules engine** | Operators define their own policies (`if metadata.country == 'XX' and channel_trust < 80, route to MANUAL_REVIEW`). With templates, simulation, and impact analysis. |
| **Adaptive step-up** | Sessions only get harder when the risk score warrants it — keeping conversion high for the 99% of legitimate users while making the 1% prove themselves. |

---

## 4. Who it's built for

### 4.1 Primary buyers

- **Heads of Fraud / Risk** at fintechs, neobanks, and payments companies. They own the loss budget. Their pain is synthetic fraud loss curves and chargeback rates.
- **Heads of Compliance** at regulated institutions. They own the regulator relationship. Their pain is the new wave of regulation (EU AI Act, FFIEC guidance, FATF Recommendation 15) explicitly calling out deepfake risk.
- **Heads of Trust & Safety** at marketplaces, gig platforms, and creator platforms. They own platform integrity. Their pain is account-takeover and ban-evasion via fake identities.
- **Heads of Product / Engineering** at any of the above. They own the integration. Their pain is shipping a verification flow that *works*, isn't a 14-day SDK integration, and doesn't degrade conversion.
- **Fraud analysts and case reviewers** — power users of Watchtower. Their pain is triaging hundreds of cases a day without enough context.

### 4.2 Verticals & use cases

| Vertical | Use case | Why Sense |
|---|---|---|
| **Banking & fintech** | Account opening, high-value transfer step-up, card activation | Stops synthetic-identity fraud at enrollment; rules engine encodes the regulator-defensible policy; signed webhook is the audit record |
| **Crypto exchanges** | KYC, withdrawal authorization, recovery flows | Hardest-hit by deepfake fraud; needs the strongest possible PAD and fraud-ring detection |
| **Insurtech** | Policy purchase, claims submission, identity recovery | Reduces claims fraud (staged claims by synthetic identities); MatchSense catches duplicate enrollment under different names |
| **Healthcare & telehealth** | Patient identity at intake, controlled-substance e-prescribing | Cases queue gives compliance officers an auditable manual-review trail; consent management built in |
| **Gig & marketplace** | Worker onboarding, re-verification, account recovery | Eliminates account-sharing and identity-farm enrollment; fraud-ring graph surfaces coordinated abuse |
| **iGaming & sports betting** | Age and identity verification, self-exclusion enforcement | Detects players evading self-exclusion via new identities (1:N scan + global blocklist) |
| **Government & public sector** | Benefit eligibility, license renewal, voter registration | Meets emerging regulatory bar; full audit log; data-residency options |
| **Enterprise** | Workforce identity, zero-trust step-up, contractor onboarding | Replaces password reset / helpdesk ticket with 8-second verification |

### 4.3 Geographic focus

Designed and tested for: North America, EU, UK, Nigeria, Kenya, South Africa, India, Brazil, Mexico, the GCC, and Southeast Asia. Models are trained on demographically diverse datasets to maintain accuracy parity across skin tones, age groups, and gender presentations — a known weak point of incumbent face-match vendors.

---

## 5. The four pillars

Every Sense session is scored independently by four systems. A session is approved only when their combined verdict crosses the customer's threshold; disagreement routes to `MANUAL_REVIEW`. This defense-in-depth is the technical core of the product.

### 5.1 DeepSense — Channel & Device Integrity

Verifies that the *capture pipeline itself* is trustworthy before a single frame is scored. **30+ signals** analyzed server-side. Outputs a `channel_trust_score` (0–100).

**Detections:**

- **Platform cryptographic attestation** — Apple App Attest (iOS), Google Play Integrity (Android, with optional `googleCloudProjectNumber` config).
- **Runtime integrity** — jailbreak detection (iOS), root detection (Android), debugger detection, emulator detection.
- **Hooking framework detection** — Frida, Substrate, and similar instrumentation tooling.
- **Virtual camera detection** — OBS, ManyCam, virtual-camera drivers, video-injection rigs.
- **Capture pipeline analysis** — frame-source fingerprinting, JPEG encoding-quality analysis, frame-size consistency, hardware sensor cross-checks.
- **Frame coherence analysis** — temporal consistency across the captured sequence.
- **Device motion sensors** (iOS, optional via `NSMotionUsageDescription`) — gyro and accelerometer cross-validation against captured motion.
- **Camera permission validation** — permission-granted but frames submitted = injection signature.
- **Network and behavioral signals** — device velocity, impossible-travel detection.
- **Web-specific (DeepSense-Web)** — WebDriver / headless-browser detection, GPU renderer analysis (catches `swiftshader`, `llvmpipe`, offscreen renderers used by VMs/CI), event-loop lag, navigation timing, WebGL fingerprinting, browser/hardware fingerprint (CPU cores, memory, screen properties), media-device enumeration.
- **Security patch level** — checks device patch currency.
- **Sensor fusion** — cross-validates multiple signals; no single signal is dispositive.

### 5.2 LiveSense — Multimodal Proof-of-Life

Verifies that a real, conscious human is in front of that trusted camera right now. **12-category weighted scoring.** Outputs a `liveness_score` and `presence_confidence` (0–100).

**Detections:**

- **Facial micro-expression analysis** — involuntary expressions, micro-saccades.
- **Presentation attack detection (PAD)** — printed photos, video replays, 3D masks, screen-displayed content (via screen-reflection analysis).
- **Deepfake detection (visual)** — generative-model artifact fingerprinting.
- **Deepfake detection (audio)** — voice-clone detection, codec-artifact analysis, MFCC stability.
- **Facial geometry consistency** — 3D face-mesh temporal coherence.
- **Lighting consistency** — abnormal illumination patterns.
- **Eye gaze tracking** — required for "follow dot" challenge.
- **Head rotation stability** — natural vs. mechanical motion.
- **Lip-movement / audio sync** — for voice challenges.
- **Blink frequency** — natural blink patterns.
- **Visual artifact detection** — compression and rendering glitches.
- **Optional on-device 3D face mesh (iOS)** — gated by MediaPipeTasksVision dependency; adds geometric coherence as a fast pre-flight check.
- **FLAME 3D model fitting** (server-side, via `/ml/flame/fit`) — face reconstruction for geometric validation.
- **Stereo 3D reconstruction** (server-side, via `/ml/stereo/reconstruct`) — depth estimation and 3D consistency.

**Active challenges** (server-orchestrated; selected adaptively based on risk):

- **Head turn** — rotational tracking.
- **Follow dot** — ocular tracking of a moving target.
- **Speak phrase** — voice-biometric + audio liveness.
- **3-2-1 countdown** — pre-challenge transition for natural capture pacing.

### 5.3 MatchSense — Identity Collision Detection

Verifies that this person is who they claim to be — and isn't already enrolled under a different identity. Backed by AWS Rekognition for face-template matching, **org-scoped by default**.

**Detections:**

- **1:N enrollment deduplication** — scans every identity in the org's graph for collisions.
- **1:1 authentication** — matches the live capture against the enrolled face template referenced by `identityId`.
- **Cross-identity risk scoring** — surfaces when a face has previously been associated with a rejected session, a chargeback, or a fraud ring.
- **Metadata-based matching** — custom field matching (email, phone, IP, device fingerprint, any operator-defined field).
- **Device velocity scoring** — impossible-travel + device-pattern matching across sessions.
- **Template age assessment** — flags very-old enrolled templates that may need refresh.
- **Image-quality impact** — lower-quality matches carry higher risk weight.
- **Face-angle variability** — frontal vs. angled enrollment quality scoring.

Output: `match_score` and `dedupe_risk_score` (lower = better). On enrollment, an `identityId` is created.

### 5.4 SenSei — Adaptive Policy & AI Orchestration

The orchestration brain that fuses pillar scores, applies operator-defined rules, decides the verdict, and powers the AI assistant in Watchtower.

**Functions:**

- **Adaptive policy engine** — fuses DeepSense + LiveSense + MatchSense scores with rule outputs.
- **Step-up escalation** — triggers additional challenges when confidence is borderline (configurable per-session via `stepUpPolicy: .never | .riskBased | .always`).
- **Risk-based audio enablement** — turns on audio capture only when needed (`audioEnabled: .never | .riskBased | .always`).
- **Rule evaluation** — runs all active customer rules in priority order.
- **Manual review routing** — when verdict is inconclusive, generates a case in the Watchtower queue.
- **AI case analysis (Ask SenSei)** — natural-language interrogation of cases ("why was this session flagged?", "what other sessions look like this?"); suggestion engine for case dispositions.
- **Behavioral pattern analysis** — anomalous user-behavior detection across sessions.
- **Session pattern clustering** — identifies coordinated fraud-ring candidates.
- **Metadata anomaly detection** — surprising combinations of custom fields.
- **Temporal anomaly detection** — unusual verification times, rapid retries.
- **Device pattern anomaly detection** — device switching, network switching.

---

## 6. End-to-end session flow

A typical enrollment session, from tap to verdict, takes **6–12 seconds** of user time.

```
   Mobile/Web app                SDK                          UseSense backend            Customer backend
   ──────────────                ───                          ────────────────            ────────────────
1. User taps "Verify"  ───────►  initialize(apiKey)
2.                               startVerification()
3.                               ├─ Permissions
4.                               ├─ DeepSense pre-flight  ──► App Attest / Play Integrity
5.                               ├─ Live capture (frames + optional audio + challenges)
6.                               ├─ POST /v1/sessions/{id}/signals
7.                                                              ├─ DeepSense scoring
8.                                                              ├─ LiveSense scoring
9.                                                              └─ MatchSense (1:N or 1:1)
10.                              POST /v1/sessions/{id}/complete
11.                                                          SenSei: rule evaluation, step-up check
12.                                                          Fused verdict + signature
13.                              ◄── Redacted result ─────
14. App shows result UI                                    ───── Signed webhook ───►  Verify HMAC
15.                                                                                    Read pillar scores
16.                                                                                    Apply access decision
```

**Three integration patterns:**

1. **Client-initiated** — app calls `startVerification()`. Standard pattern for the SDK.
2. **Server-initiated (token flow)** — backend calls `POST /v1/sessions/create-token` with a reference image, receives a single-use `client_token` (10-min TTL), passes it to the app, app calls `createSessionWithToken(...)`. Used in zero-credential deployments and for pre-validated sessions.
3. **Remote enrollment / remote verification** (Flutter, iOS) — backend pre-creates the session/enrollment, app launches it by ID. Used for white-label hosted flows and email/SMS-link verification journeys.

**Key behaviors:**

- **The client only ever sees the redacted verdict** — `decision`, `sessionId`, `identityId`, `sessionType`, `timestamp`. Nothing else.
- **Pillar scores, the fused confidence, and verdict metadata are delivered only to the customer's backend** via an HMAC-SHA256 signed webhook with timestamp, nonce, and idempotency key.
- **The webhook is the source of truth.** Customers are explicitly instructed never to use the client-side decision for access control — only for UI feedback.

This split is deliberate. It removes the entire class of attacks that work by tampering with the mobile binary.

---

## 7. Product surface — SDKs

Six distinct integration surfaces, all sharing canonical event names, error codes, and result shapes. Pick one or several; they coexist cleanly.

### 7.1 SDK matrix

| SDK | Language | Min version | Distribution | Status |
|---|---|---|---|---|
| **iOS** | Swift 5.9+ | iOS 15.0+ | CocoaPods (`UseSenseSDK ~> 4.2`), SPM, manual XCFramework | GA — v4.2.x |
| **Android** | Kotlin 1.9+ | API 28 (Android 9.0) | Maven Central (`ai.usesense:sdk:4.2.1`), JitPack, GitHub Packages, manual AAR | GA — v4.2.1 |
| **React Native** | TypeScript | RN 0.73+, Node 18+ | npm (`react-native-usesense`) | GA — v2.0.0, New Architecture (Turbo Modules) supported |
| **Flutter** | Dart 3.2+ | iOS 16+, Android API 24+ | pub.dev (`usesense_flutter`) | GA — v1.0.0; uses Pigeon for type-safe channels |
| **Web** | TypeScript / React | Chrome 80+, Safari 14+, FF 75+, Edge 80+ | npm (`@usesense/web-sdk`) | GA — production; React component + headless mode |
| **Hosted pages** | — | Any modern browser | URL-based, white-labeled | GA — used for email/SMS-link flows |

### 7.2 Common SDK surface (all platforms)

**Lifecycle:**
- `initialize(config)` — one-time setup
- `startVerification(request)` — launch a session
- `addListener(callback)` / `onEvent` stream — subscribe to lifecycle events
- `reset()` / `dispose()` — release native resources
- `isInitialized()` — feature-flag readiness check

**Configuration (`UseSenseConfig`):**
- `apiKey` — required; prefix detected for environment (`sk_sandbox_*`, `sk_prod_*`, `pk_sandbox_*`, `pk_prod_*`)
- `environment` — `sandbox | production | auto`
- `apiEndpoint` / `baseUrl` — override for staging or on-prem
- `branding` — see §11
- `googleCloudProjectNumber` — Android only, enables Play Integrity attestation
- `options` (iOS) — see SDKOptions below

**Advanced SDK options (iOS, with parity on other platforms):**
- `audioEnabled: .never | .riskBased | .always` — controls when microphone is engaged (default `.riskBased`)
- `stepUpPolicy: .never | .riskBased | .always` — controls challenge escalation
- `captureDurationMs` — default 8000, server may override
- `targetFps` — 2–5 fps, default 3
- `maxFrames` — hard cap, default 30
- `maxUploadSizeMb` — default 10 MB

**Session request (`VerificationRequest`):**
- `sessionType` — `enrollment | authentication`
- `externalUserId` — your internal user identifier
- `identityId` — required for authentication
- `metadata` — custom key-value pairs (string / number / boolean) attached to the session and surfaced in Watchtower

**Result (`UseSenseResult` — redacted by design):**
- `sessionId`, `sessionType`, `identityId`, `decision`, `timestamp`
- Decision values: `APPROVE | REJECT | MANUAL_REVIEW | STEP_UP_REQUIRED`
- Convenience booleans: `isApproved`, `isRejected`, `isPendingReview`

### 7.3 Lifecycle events (canonical, all platforms)

`SESSION_CREATED`, `PERMISSIONS_REQUESTED`, `PERMISSIONS_GRANTED`, `PERMISSIONS_DENIED`, `CAPTURE_STARTED`, `FRAME_CAPTURED`, `CAPTURE_COMPLETED`, `AUDIO_RECORD_STARTED`, `AUDIO_RECORD_COMPLETED`, `CHALLENGE_STARTED`, `CHALLENGE_COMPLETED`, `UPLOAD_STARTED`, `UPLOAD_PROGRESS`, `UPLOAD_COMPLETED`, `COMPLETE_STARTED`, `DECISION_RECEIVED`, `IMAGE_QUALITY_CHECK`, `ERROR`, `UNKNOWN`.

### 7.4 Error codes (canonical, all platforms)

**Device / permission:** `CAMERA_UNAVAILABLE`, `CAMERA_PERMISSION_DENIED`, `MIC_PERMISSION_DENIED`
**Network:** `NETWORK_ERROR`, `NETWORK_TIMEOUT` (both retryable)
**Session:** `SESSION_EXPIRED`, `SESSION_NOT_FOUND`, `INVALID_TOKEN`, `TOKEN_EXPIRED`, `TOKEN_ALREADY_USED`
**Auth:** `UNAUTHORIZED`, `INVALID_CONFIG`, `INVALID_REQUEST`
**Identity:** `IDENTITY_NOT_FOUND`
**Resource:** `QUOTA_EXCEEDED`, `INSUFFICIENT_CREDITS`
**Capture:** `CAPTURE_FAILED`, `ENCODING_FAILED`, `UPLOAD_FAILED`, `FACE_NOT_DETECTED`, `LOW_LIGHT`, `TIMEOUT`
**Server:** `SERVER_ERROR`, `SERVICE_UNAVAILABLE`
**Bridge / SDK-internal:** `session_cancelled`, `sdk_not_initialized`, `no_view_controller`, `NONCE_MISMATCH`, `USER_CANCELLED`, `UNKNOWN_ERROR`

Android codes additionally carry numeric identifiers (e.g. `1001` camera unavailable, `2001` network error) for log-aggregation tooling.

### 7.5 Web SDK specifics

- Componentized: `<UseSenseVerification client={...} sessionType="..." onComplete={...} />`
- Headless mode for full custom UX
- Multi-tenancy via `organizationId` scoping
- Captures at 15 fps for 2.5 s by default (configurable)
- DeepSense-Web integrity heuristics (browser/hardware/security/media/performance/WebGL signals)
- Decision values include `STEP_UP_REQUIRED` natively

---

## 8. Product surface — Watchtower

**Watchtower** (currently v4.0.6, hosted at `watchtower.usesense.ai`) is the operator-facing application. It is where customers configure, monitor, triage, and audit Sense day-to-day.

### 8.1 Frontend areas (full sitemap)

**Authentication & account**
`/login`, `/signup`, `/logout`, `/mfa-setup`, `/mfa-verification`, `/forgot-password`, `/set-password`, `/sso-callback`, `/accept-invitation`, `/onboarding`, `/verify-email`, `/profile`

**Core verification dashboards**
- `/dashboard` — KPIs (approval rate, average pillar scores, volume, fraud rings detected)
- `/sessions` and `/sessions/:sessionId` — sessions explorer with full pillar score breakdown, decision rationale, applied policy, and PDF report generation
- `/identities` and `/identities/:identityId` — identity graph: enrollment history, match scores, metadata, soft-delete state
- `/cases` and `/cases/:caseId/review` — manual review queue with assignment, priority, notes, linked sessions/identities/rings
- `/approvals` — approval workflows for sensitive ops

**Risk & fraud management**
- `/fraud-rings` and `/fraud-rings/:fraudRingId` — coordinated-fraud detection with **network graph visualization**, timeline view, bulk actions, status tracking (`active | investigating | resolved | archived`)
- `/blocklist` — org and global blocklist management with subscription support

**Verification rules & policies**
- `/rules` — rule library
- `/rules/create`, `/rules/templates` — rule builder + pre-built templates
- `/rules/:ruleId/edit` — edit rule
- `/rules/impact-analysis` — simulate the impact of a rule change against historical sessions before activating

**Analytics & reporting**
- `/analytics/report-builder` — drag-and-drop custom report builder
- `/analytics/report/:reportId` — saved reports
- `/public/report/:reportId` — public shareable report URLs

**Organization & collaboration**
- `/users` — invite/manage team
- `/roles` — RBAC management
- `/settings` — org settings (branding, domains, SSO, Slack)
- `/audit-logs` — compliance audit trail

**API management**
- `/api-keys` — generate, rotate, revoke, expire
- `/api-keys/test` — interactive API-key testing tool
- `/settings/isp-whitelist` — IP allowlist
- `/settings/action-types` — define custom action / reason codes

**Billing & usage**
- `/billing` — credit balance, invoices, auto-top-up, payment methods (Stripe)

**AI**
- `/ask-sensei` — natural-language case analysis powered by SenSei

**Help & developer tools**
- `/help`, `/help-documentation`, `/developer-docs`
- `/test/biometric`, `/test/sdk-api`, `/test/sdk-diagnostic`, `/test/deployment-status`, `/test/cors` — interactive integration testing

**Network admin (separate auth, for Sense operators)**
- `/network` — multi-org operator console
- `/network/organisations/:orgId` — per-org operator management

### 8.2 Watchtower features in depth

#### Sessions explorer
Every verification event is stored, queryable, and inspectable. Full pillar score breakdown, the rule that triggered the decision, the device fingerprint, the metadata, the captured signals manifest. Manual override is supported with audit trail. PDF report generation per session for compliance evidence.

#### Identity graph
Every enrolled identity is a node with its enrollment history, all subsequent authentication attempts, match scores over time, and any cases/rings it's linked to. Soft-delete is supported (preserves audit trail) and identities can be put on `hold` or `blocked` status.

#### Manual review queue (Cases)
- Auto-assignment via configurable engine (round-robin, load-balanced)
- Priority levels: Critical, high, medium, low
- Bulk operations across multiple cases
- Custom action types (operator-defined reason codes — decline reason, appeal status, etc.)
- Linking to sessions, identities, and fraud rings
- Notes and metadata
- SLA tracking

#### Rules engine
- **Conditions** built from any available signal: enrollment metadata, authentication metadata, session signals, previous session history, device fingerprint, geographic data, pillar scores
- **Actions:** `APPROVE | REJECT | MANUAL_REVIEW | STEP_UP_REQUIRED`
- **Priority ordering** — higher-priority rules evaluated first
- **Templates library** — pre-built rules for common patterns (high-risk geo, mismatched device, rapid retry, etc.)
- **AI-generated rules** — SenSei can propose rules based on observed fraud patterns
- **Impact analysis** — replay rule against historical sessions, see how many approvals/rejects would change before going live
- **Simulation mode** — test against sample data without affecting production

#### Fraud-ring detection
- **Network graph** of connected identities visualized in the UI
- **Trigger types** — face-match clusters, metadata patterns, device patterns, IP patterns
- **Nodes** — identities flagged as suspected/confirmed members, with risk scores and seed indicators
- **Edges** — typed connections (`face_match`, `metadata_match`, `device_match`, `ip_match`) with confidence and evidence session IDs
- **Metadata edge configs** — operator-customizable rules for what counts as a fraud-ring connection (field path, match type, confidence threshold, minimum identity count)
- **Timeline view** — ring activity log with bulk analyst actions
- **Status workflow** — `active → investigating → resolved | archived`

#### Blocklist
- **Entry types:** face_id (Rekognition template), email, phone, external_user_id, device_fingerprint
- **Scope:** organization-local OR global (multi-tenant, opt-in)
- **Optional expiry** dates per entry
- **Reason tracking** for compliance
- **Global subscription** — opt in to receive entries from the cross-customer global blocklist
- **Rule integration** — rules can reference blocklist entries

#### Webhooks
- Multiple webhooks per org, each subscribed to specific events
- Subscribable events:
  - `session.completed`
  - `identity.created`, `identity.enrolled`
  - `fraud_ring.detected`
  - `case.created`
  - `billing.credits_low`, `billing.auto_topup.succeeded`, `billing.auto_topup.failed`
- HMAC-SHA256 signed (`X-UseSense-Signature` header + timestamp)
- Replay protection via `X-Session-Token`, `X-Nonce`, `X-Idempotency-Key`
- Per-webhook delivery logs, retry tracking, delivery stats
- One-click test delivery from dashboard
- Signing-secret rotation

#### Analytics & custom reporting
- Out-of-box: approval / rejection / manual-review rates; average channel-trust, liveness, match scores; volume trends; device & platform breakdowns; geographic distribution
- Custom report builder with drag-and-drop metric selection, time-range filtering, segmentation by metadata / decision / risk band
- Save, clone, schedule, and publicly share reports

#### Audit log
Compliance-grade trail (monthly partitioned for performance):
- Every user action: create, update, delete, override, login
- Resource type and ID
- IP address, user agent, timestamp
- Success/failure status
- Compliance categorization (`audit | security | identity | billing | …`)

#### Team & access control (RBAC)
- Roles out-of-box: **Owner** (full access), **Admin** (users / settings / billing), **Analyst** (cases / identities), **Developer** (API / webhooks), **Viewer** (read-only)
- Custom roles supported
- Invitations: email-link, token-based, expiring
- MFA: TOTP and email-based
- SSO: OAuth2 / OIDC-compatible, optional or enforced per org
- Active session management with revocation
- Login history and activity tracking
- Per-user notification preferences (in-app + desktop notifications)

#### SSO & Slack
- **SSO:** OAuth2 with OIDC, configurable callback URL, optional or enforced
- **Slack:** OAuth-based install, channel-routed notifications for high-risk sessions, case assignments, fraud-ring alerts

#### AI integration (SenSei)
- **Ask SenSei** — natural-language case analysis ("why was this session flagged?", "what's the pattern across these 12 cases?")
- **Suggestion engine** — case-disposition recommendations
- **Conversation threads** preserved per case
- **AI allowance** quota — 1 SenSei query per 10 verification credits

#### Network admin panel (Sense-internal)
A separate authenticated console for the Sense operations team to manage every customer organization, billing config, feature flags, and emergency interventions.

### 8.3 Watchtower-only capabilities (not visible from the SDK)

These are critical to mention in marketing because they are easy to miss when reading just the SDK README:

1. **Fraud-ring graph** — coordinated-fraud detection with full network visualization
2. **Custom rules engine** with templates, simulation, and impact analysis
3. **Manual review queue** with assignment engine and SLA tracking
4. **Custom report builder** with public-share URLs
5. **Metadata edge configs** for operator-defined fraud heuristics
6. **Global blocklist subscription** — cross-customer fraud signal sharing
7. **Audit log** with monthly partitions and compliance categorization
8. **RBAC** with custom roles
9. **SSO + Slack** integrations
10. **Ask SenSei** AI assistant
11. **Auto-top-up** billing
12. **PDF report generation** per session
13. **GDPR data export / privacy-request workflow**
14. **IP allowlist** at the API layer
15. **Custom action types** for case dispositions

---

## 9. Product surface — Backend APIs, webhooks, integrations

### 9.1 Public REST API (selected surface)

The full surface is exposed under `watchtower-api/` (Supabase Edge Functions). Highlights customers and partners care about:

**Sessions**
- `POST /sessions` — create (SDK integration path)
- `POST /sessions/create-token` — server-init token flow
- `GET /sessions` — list with filters & pagination
- `GET /sessions/:id` — full detail (scores, decision, policy, signals)
- `POST /sessions/:id/retry`
- `POST /sessions/:id/override` — operator manual override
- `GET /sessions/:id/report` — generate PDF report

**Identities**
- `GET /identities`, `GET /identities/:id`
- `POST /identities` — server-init creation
- `PUT /identities/:id` — metadata, status

**Cases**
- `GET /cases`, `POST /cases`, `PUT /cases/:id`
- `POST /cases/bulk` — bulk operations
- `GET /cases/settings` — routing/assignment config

**Rules**
- Full CRUD + `GET /rules/metadata-keys` (available fields), `POST /rules/simulate`, `GET /rules/impact-analysis`

**Blocklist** — org + global, full CRUD + subscription endpoints

**Fraud rings** — list, detail (nodes, edges, timeline), bulk actions

**Webhooks** — full CRUD + `GET /webhooks/events` (subscribable list), test, logs, secret rotation, stats

**API keys** — CRUD + rotation, usage stats, bulk revocation

**Analytics** — overview + custom query/report endpoints

**Billing** — credits, Stripe integration, auto-top-up config, invoice download, payment alerts

**Compliance & privacy** — `POST /data/export`, `POST /privacy-requests`, `GET /compliance/report`, consent management

**ML services** — `POST /ml/flame/fit`, `POST /ml/flame/batch-fit`, `POST /ml/stereo/reconstruct`

### 9.2 Webhook architecture

- Per-org configurable endpoints
- Multi-event subscriptions
- HMAC-SHA256 signature verification (`X-UseSense-Signature`)
- Replay-protection headers (`X-Session-Token`, `X-Nonce`, `X-Idempotency-Key`, timestamp)
- Delivery-attempt logs visible in Watchtower with retry tracking
- Test-delivery from the dashboard
- Secret rotation without dropping in-flight deliveries

### 9.3 Integrations

- **Stripe** — billing (PaymentIntent, saved cards, auto-top-up, webhooks, invoice PDFs)
- **AWS Rekognition** — face-template matching backend for MatchSense
- **Apple App Attest** — iOS device attestation
- **Google Play Integrity** — Android device attestation
- **MediaPipe** — optional on-device face mesh (iOS)
- **Slack** — operator notifications
- **Supabase Auth** — identity + MFA + SSO
- **Vercel + Cloudflare** — frontend hosting + API/CDN
- **OAuth2 / OIDC** — SSO

### 9.4 Multi-tenancy & isolation

- Strict org-level data isolation enforced at every API boundary
- Sandbox and production are completely separate pools (face templates, sessions, blocklists)
- Database tables for `sessions` and `audit_logs` are partitioned monthly for performance and retention control

---

## 10. Anti-fraud capabilities

A consolidated, named list for marketing copy. Every item below is implemented in the production codebase.

### DeepSense — channel & device integrity
1. Jailbreak detection (iOS)
2. Root detection (Android)
3. Emulator detection (Android)
4. Debugger detection
5. Hooking framework detection (Frida, Substrate)
6. Virtual camera detection (OBS, ManyCam, virtual drivers)
7. App Attest cryptographic attestation (iOS)
8. Play Integrity cryptographic attestation (Android)
9. Device-motion sensor cross-validation (gyro, accelerometer)
10. Frame coherence analysis
11. Camera-permission validation (granted-but-injected pattern)
12. Automation detection (WebDriver, headless browsers)
13. GPU renderer analysis (swiftshader, llvmpipe → VM/CI signal)
14. Device fingerprint analysis (30+ signals)
15. Network pattern / device velocity / impossible travel
16. Capture-pipeline integrity (JPEG quality, frame-size consistency)
17. Runtime memory / code-signature integrity
18. Sensor fusion across signals
19. Security patch level

### LiveSense — liveness & presentation attack
1. Facial micro-expression analysis
2. Presentation attack detection (masks, photos, replays)
3. Deepfake detection — visual
4. Deepfake detection — audio
5. Facial geometry consistency (3D mesh)
6. Lighting consistency
7. Temporal frame coherence
8. Eye-gaze tracking
9. Head-rotation natural-vs-mechanical analysis
10. Voice analysis (MFCC stability, voice-clone detection)
11. Lip-movement audio sync
12. Compression-artifact detection
13. Blink-frequency analysis
14. Screen-reflection analysis (replay-on-screen detection)
15. FLAME 3D model fitting (server-side)
16. Stereo 3D reconstruction (server-side)

### MatchSense — identity & deduplication
1. 1:N enrollment deduplication
2. 1:1 face verification on authentication
3. Cross-identity risk scoring (swap detection)
4. Metadata-based matching (custom fields)
5. Device-velocity scoring
6. Template age assessment
7. Image-quality risk weighting
8. Face-angle variability scoring

### SenSei — orchestration & AI
1. Behavioral pattern analysis
2. Session-pattern clustering (fraud-ring candidate generation)
3. Metadata anomaly detection
4. Temporal anomaly detection
5. Device pattern anomaly detection
6. Adaptive step-up escalation
7. Rule-based policy fusion
8. AI-generated rule suggestions
9. Case-disposition suggestion engine

---

## 11. Customization, branding, and configuration

### 11.1 SDK UI branding (per org, applied across all SDKs)

- `logoUrl` — organization logo
- `primaryColor` — hex color
- `buttonRadius` — dp/CGFloat
- `fontFamily`
- `displayName` (Android)
- `redirectUrl` (Android, hosted flows)

### 11.2 Capture & challenge configuration

- Audio mode: `never | riskBased | always`
- Step-up policy: `never | riskBased | always`
- Capture duration (ms)
- Target FPS (2–5)
- Max frames cap
- Max upload size (MB)

### 11.3 Organization-level configuration (Watchtower)

- SSO enablement & enforcement
- Slack integration & channel routing
- Custom action / reason codes
- Case routing & assignment rules
- IP whitelist
- Custom API endpoint
- Webhook event subscriptions
- Data retention & cleanup policies
- Auto-top-up thresholds
- Custom rule library
- Metadata edge configs for fraud rings

---

## 12. Compliance, security, and data posture

### 12.1 Server-side trust model

- **No fraud-relevant decision is computed on the device.** All scoring runs server-side.
- **The client receives a redacted result.** No pillar scores leave the backend except via signed webhook to the customer's authenticated endpoint.
- **HMAC-SHA256 signed webhooks.** Customers are required to verify signatures before acting on verdicts.
- **Replay protection.** Timestamp + nonce + idempotency key on every webhook.
- **API key hashing.** Stored hashed; never recoverable in plaintext.

### 12.2 Multi-tenancy & isolation

- Strict org-level data isolation at every API boundary.
- Sandbox and production are completely separate (no template, blocklist, or session crossover).
- Database partitioning monthly on high-volume tables.

### 12.3 Privacy & data subject rights

- **GDPR data export** — `POST /data/export` produces a downloadable archive of a subject's sessions, identities, and cases.
- **CCPA / GDPR Article 17 deletion** — `POST /privacy-requests` with full request tracking workflow.
- **Configurable retention** — sessions and audit logs auto-cleanup per org policy.
- **Soft-delete on identities** preserves the audit trail while honoring deletion intent where required.
- **Consent management** — explicit consent records via `POST /compliance/consent`.
- **Compliance reports** — `GET /compliance/report` summarizes posture for audits.

### 12.4 Audit log

- Every user action in Watchtower is logged with user, IP, user agent, timestamp, resource type, success/failure, and compliance category.
- Monthly partitioned for retention control.
- Exposed via API and Watchtower UI for regulator review.

### 12.5 Encryption

- TLS 1.3 in transit
- AES-256 at rest (Supabase-managed)
- HMAC-SHA256 for webhook integrity

### 12.6 Certifications & frameworks (current state)

- HIPAA-eligible architecture
- GDPR-compliant data handling
- SOC 2 Type II — *in progress*
- ISO 27001 — *in progress*
- DPA + sub-processor list available for enterprise customers

---

## 13. Commercial model and pricing

### 13.1 Credit model

- **1 credit per verification session.**
- **Sandbox is unlimited and never billed.** It includes seeded synthetic test identities and prefab attack videos so customers can validate end-to-end before flipping to production.
- **Production credits are purchased in packs** with steep volume discounts.

### 13.2 Production pricing tiers (current published packs)

| Pack | Credits | Price | Per-session | Discount |
|---|---|---|---|---|
| 1K | 1,000 | $100 | $0.100 | — |
| 5K | 5,000 | $400 | $0.080 | 20% |
| 10K | 10,000 | $700 | $0.070 | 30% |
| 25K | 25,000 | $1,500 | $0.060 | 40% |
| 50K | 50,000 | $2,500 | $0.050 | 50% |
| 100K | 100,000 | $4,500 | $0.045 | 55% |
| 250K | 250,000 | $10,000 | $0.040 | 60% |
| 500K | 500,000 | $17,500 | $0.035 | 65% |
| 1M | 1,000,000 | $30,000 | $0.030 | 70% |

### 13.3 Billing features

- Stripe-powered checkout (PaymentIntent)
- Saved payment methods
- **Auto-top-up** when balance drops below a configurable threshold
- Invoice generation & PDF download
- Usage tracking and low-credit alerts (in-app, email, webhook)
- Payment alert dismissal workflow
- AI allowance — 1 SenSei query per 10 credits, tracked separately

### 13.4 Plan tiers

- **Free** — sandbox-only access, full feature exploration
- **Paid** — production access via credit packs
- **Enterprise** — custom MSA, DPA, dedicated solutions architect, SLA, custom data residency, custom rule tuning

---

## 14. Differentiation and competitive frame

### 14.1 The three-line pitch

> Identity verification was built for the password era. Sense is built for the deepfake era. Four independent verification systems — device integrity, multimodal liveness, identity-collision detection, and an adaptive AI policy layer — deliver a signed, server-side verdict that no patched client and no generative model can fake, plus a fraud-ring graph that catches the coordinated attacks single-session vendors miss.

### 14.2 Competitive frame

| Vendor | Their core | Where we win |
|---|---|---|
| **Onfido / Jumio / Veriff** | Document KYC + bolt-on liveness | We're complementary, not competitive — we layer on as the presence-trust anchor. Stronger on deepfake/injection. Customers run both. |
| **iProov** | Liveness specialist | Single-pillar; we add DeepSense, MatchSense, fraud-ring detection, and a rules engine. |
| **FaceTec** | Liveness SDK | Same — single-pillar, no identity graph, no operator dashboard. |
| **Persona** | KYC orchestration | We're a node inside their orchestration, not a competitor. Persona customers can call Sense as a workflow step. |
| **AU10TIX / Incode** | Full-stack KYC | We're stronger on deepfake/injection and on coordinated fraud rings. We win in step-up, re-auth, and any flow where the attacker has an ID copy. |

### 14.3 What we are *not*

- Not a document-KYC vendor. We do not parse passports or driver's licenses.
- Not a passive fraud-signals vendor (device fingerprint, behavioral biometrics) on its own — though we incorporate these signals.
- Not a CIAM / authentication platform. We are the *verification* primitive that auth platforms call out to.

### 14.4 Differentiators worth naming explicitly

1. **Defense-in-depth across 4 pillars**, not 1 or 2
2. **Server-side scoring with redacted client result** — uniquely tamper-resistant on mobile
3. **Cryptographically signed webhooks** with replay protection
4. **Cross-customer identity intelligence** via opt-in global blocklist
5. **Fraud-ring graph** — network-level intelligence, not just per-session
6. **Operator-tunable rules engine** with simulation and impact analysis
7. **Six SDK surfaces** (iOS, Android, RN, Flutter, Web, Hosted) with canonical event model
8. **Adaptive step-up** — high conversion for legitimate users, hard challenges only for risky ones
9. **AI-powered case analysis (Ask SenSei)** built into the operator workflow
10. **Watchtower** is a real product, not an admin panel — customers use it as their fraud-ops console

---

## 15. Messaging matrix

| Audience | Message | Proof point |
|---|---|---|
| **Head of Fraud** | Stop synthetic identity fraud and coordinated rings — at enrollment, not after the loss. | MatchSense 1:N + fraud-ring graph + global blocklist |
| **Head of Compliance** | A regulator-defensible verification trail in the deepfake era. | HMAC-signed verdicts, monthly-partitioned audit log, GDPR/CCPA workflows, server-side scoring |
| **Head of Product** | Eight seconds to verify, two hours to integrate. Six SDK surfaces with one canonical API. | iOS/Android/RN/Flutter/Web SDKs with auto-linking, reference apps, Turbo Module support |
| **Head of T&S** | One person, one identity — across every account on your platform. | MatchSense identity graph + cross-customer global blocklist |
| **CISO** | Verification you can't tamper with from a patched APK. | Server-side scoring, redacted client result, App Attest + Play Integrity |
| **Head of Risk Ops** | Your fraud team gets a real workspace, not a CSV export. | Watchtower: cases queue, fraud-ring graph, custom reports, Ask SenSei |
| **CFO / Procurement** | Pay per verification, with steep volume discounts and unlimited sandbox. | Public credit packs from $0.10 → $0.03 per session; auto-top-up; invoice PDFs |
| **CEO / Board** | The trust layer for AI-era digital products. | Defense-in-depth across four systems; designed for the threat model that already exists |

---

## 16. Roadmap and experimental signals

Surfaced from feature flags, TODOs, and partial implementations in the codebase.

**In active development / partially released:**
- **Behavioral biometrics** — mouse movement, keystroke dynamics (Web)
- **Deeper WebGL fingerprinting** — version-based spoofing detection
- **Geometric coherence pillar** — currently iOS-only via MediaPipe; expansion planned
- **Screen-illumination analysis** — referenced in Android SDK v3.0 docs
- **Ethnic-diversity fairness scoring** — referenced; not fully integrated
- **Per-organization feature flags** — runtime toggling already in place

**GA platform status:**
- iOS, Android, React Native, Flutter, Web SDKs — all GA
- Watchtower v4.0.6 — production
- Hosted pages — production

---

## 17. Glossary

- **Presence verification** — Sense's category. The verification that a real, live, unique human is behind the camera. Use this term in preference to "liveness" or "biometric KYC".
- **Pillar** — one of the four independent scoring systems (DeepSense, LiveSense, MatchSense, SenSei).
- **Session** — a single end-to-end verification attempt.
- **Verdict** — the server-side decision (`APPROVE` / `REJECT` / `MANUAL_REVIEW` / `STEP_UP_REQUIRED`) plus pillar scores.
- **Identity** — a persistent record created at enrollment, addressed by `identityId`.
- **Watchtower** — the operator dashboard and backend platform.
- **SenSei** — the AI / orchestration layer; also the brand for the in-dashboard AI assistant ("Ask SenSei").
- **Channel trust** — DeepSense's headline output (0–100); how trustworthy the capture pipeline is.
- **Liveness score / presence confidence** — LiveSense's outputs (0–100).
- **Match score** — MatchSense 1:1 comparison output (0–100).
- **Dedupe risk score** — MatchSense 1:N scan output (lower = better).
- **Identity collision** — when a face matches an existing identity it shouldn't.
- **Fraud ring** — a graph of identities connected by face / metadata / device / IP signals, indicating coordinated abuse.
- **Step-up** — adaptive escalation to additional challenges when initial confidence is borderline.
- **Case** — a session that requires human review, sitting in the Watchtower review queue.
- **Rule** — operator-defined policy that maps signal conditions to a decision action.
- **Action type** — operator-customized reason code for case dispositions.
- **Edge config** — operator-defined heuristic for what counts as a fraud-ring edge.

---

## 18. One-page summary

**What it is** — The presence-verification layer for the deepfake era.

**Who it's for** — Fraud, compliance, risk-ops, and trust teams at fintechs, banks, crypto exchanges, marketplaces, healthcare, gaming, and government.

**The problem** — Generative AI, camera injection, identity farms, and coordinated fraud rings have broken single-pillar liveness and standard KYC.

**The solution** — Four independent verification systems (DeepSense, LiveSense, MatchSense, SenSei) fused into a signed server-side verdict, plus a fraud-ring graph and operator-tunable rules engine.

**How it ships** — Six SDK surfaces (iOS, Android, React Native, Flutter, Web, Hosted) + Watchtower operator dashboard + REST API + signed webhooks. Hours to integrate.

**Why we win** — Defense-in-depth, server-side scoring, fraud-ring graph, cross-customer identity intelligence, real operator workspace, AI-assisted case analysis.

**How we charge** — Per session, $0.10 → $0.03 with volume tiers. Unlimited sandbox. Stripe checkout, auto-top-up, invoice PDFs.

---

*Document owner: Product. Last updated: 2026-04-13. Built from a full codebase audit of `/Users/opeyemiadeyemi/work/usesense-workspace/` (mobile SDKs, web SDK, Flutter SDK, Watchtower v4.0.6).*
