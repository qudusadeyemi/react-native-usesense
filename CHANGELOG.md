# Changelog

All notable changes to react-native-usesense will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/).

## [2.3.4] - 2026-07-09

### Changed
- Bumped the native SDK pin to `ai.usesense:sdk:4.6.4`, which drops an unused `viewBinding` that had forced `kotlin-stdlib` to 2.2.10 onto consumers. **The `kotlin-stdlib` `resolutionStrategy` force from 2.3.3 is no longer needed** — remove it. The only remaining Android requirement is `minSdkVersion 28`.

## [2.3.3] - 2026-07-09

### Fixed
- **Android was unbuildable for React Native consumers.** The native `ai.usesense:sdk` was compiled with Kotlin 2.2.10 (metadata + stdlib 2.2.0), which no current RN toolchain (RN 0.76 ships Kotlin 1.9) can read — every RN Android build failed with `Class … was compiled with an incompatible version of Kotlin`. Bumped the pin to `ai.usesense:sdk:4.6.3`, which emits Kotlin 2.0-readable metadata **and** pins its own kotlin-stdlib to 2.0.21, so RN's Kotlin 1.9 toolchain can compile against it with no consumer-side workaround.

### Changed — action required
Two settings are required in your app's `android/build.gradle` (RN 0.76+):
- **`ext { minSdkVersion = 28 }`** — the native SDK requires API 28; a lower value fails the release manifest merge.
- **Force `kotlin-stdlib` to `2.0.21`** — the SDK is built with Kotlin 2.2, and something in RN's Gradle graph resolves the stdlib up to 2.2.10, which RN's Kotlin 1.9 compiler can't read. Add:
  ```groovy
  allprojects { configurations.all { resolutionStrategy.eachDependency {
    if (requested.group == 'org.jetbrains.kotlin' && requested.name.startsWith('kotlin-stdlib')) { useVersion '2.0.21' }
  } } }
  ```

### CI
- Re-enabled the Android build job (disabled since the RN 0.73 / Kotlin incompatibility). It scaffolds a fresh RN 0.76 app, installs this plugin, and builds a **release** APK against the published SDK — the guard that would have caught the above. New Architecture is disabled in the guard (this module is old-arch).

## [2.3.2] - 2026-07-09

### Fixed
- **Android release builds failing at manifest merge on AGP 8.x** (`Namespace 'org.tensorflow.lite' is used in multiple modules and/or libraries`). Bumped the native SDK pin `ai.usesense:sdk` `4.6.0` → `4.6.1`, which upgrades TensorFlow Lite to 2.16.1 (fixing the duplicate-namespace collision between `tensorflow-lite` and its transitive `tensorflow-lite-api`) and drops the unused `tensorflow-lite-support`. Integrators no longer need a `resolutionStrategy`/`exclude` workaround. No API or runtime change.

### Changed — action required
- **Minimum Android SDK is now 28** (was declared 24). The native `ai.usesense:sdk` has required `minSdk 28` since v4.1; declaring 24 here failed a consuming app's release manifest merge against the SDK's own minSdk. **Consuming apps must set `minSdkVersion 28`.**

## [2.3.1] - 2026-06-28

### Changed

- **Pinned native SDK to 4.6.0** (iOS `~> 4.6`, Android `ai.usesense:sdk:4.6.0`).
  The Android dependency was hard-pinned to the old `4.5.0`; this bumps it to
  4.6.0 to match the iOS pod and ships the Sense rebrand footers.

## [2.2.0] - 2026-06-27

### Added

- **White-label appearance + copy.** `UseSenseFlows.runFlow` accepts optional
  `appearance` (FlowAppearance) and `copy` (FlowCopy) overrides, forwarded through
  the iOS and Android bridges to the native `UseSenseFlows.run` so the verification
  flow's look and subject-facing copy can be customised from the SDK or the dashboard.

### Changed

- **Pinned UseSenseSDK to 4.5.0** (iOS `~> 4.5`, Android `ai.usesense:sdk:4.5.0`),
  which ships the appearance/copy API the bridge calls. Earlier 4.4.x releases
  predate it.

## [2.1.1] - 2026-06-23

### Fixed

- **Android build failure.** The Android bridge (`UseSenseModule.kt`) passed
  `antispoofOnDeviceEnabled` + `liveSenseV4Enabled` to `UseSenseConfig`, but
  those params shipped only on the iOS SDK — the pinned Android SDK
  (`ai.usesense:sdk:4.3.0`) lacked them, so Android consumers failed to compile.
  Bumped the Android SDK pin to `4.4.0`, which adds both params (and on-device
  antispoof + LiveSense v4) at iOS parity, and the iOS pod pin to `~> 4.4`.

## [2.1.0] - 2026-06-16

Tracks the native SDK 4.3.0 release. Additive and backward-compatible —
existing integrations are unaffected; both new flags default to `false`.

### Added

- **`UseSenseConfig.liveSenseV4Enabled`** — opt the session into the
  LiveSense v4 capture flow (constitutive zoom-motion phase + per-frame
  capture-phase tagging + `x-usesense-sdk-version: v4` header). The org
  must also have `livesense_v4_enabled` in its server-side features map.
- **`UseSenseConfig.antispoofOnDeviceEnabled`** — opt in to the on-device
  CelebA-Spoof classifier (native loads the bundled model and attaches
  per-frame spoof probabilities to the upload). Defaults off, in which
  case the watchtower backend runs the classifier server-side.

### Changed

- Native SDK dependency bumped to `4.3.0` (iOS `UseSenseSDK ~> 4.3` via
  CocoaPods; Android `ai.usesense:sdk:4.3.0` via Maven Central). The
  example app's temporary git-branch override for the iOS SDK is removed.

## [2.0.0] - 2026-04-11

**Breaking release.** The plugin's entire JavaScript API has been
rewritten against the native SDKs' v4.x API surface, and the result
shape has been reduced to the native SDKs' redacted five-field
shape. This is a security-motivated change — see the migration
section below.

### The TL;DR

- `react-native-usesense@1.0.0` was written against the v1.x native
  SDKs and exposed `channelTrustScore`, `livenessScore`,
  `matchSenseRiskScore`, `presenceConfidence`, `reasons`,
  `ruleTriggered`, `recommendedAction`, and `sessionSignature`
  directly in the `UseSenseResult` JS object.
- The native iOS and Android SDKs were rewritten in v4.0 to
  explicitly **strip** all of those fields before returning the
  decision to the host app. The goal was to prevent reverse-
  engineering of the server-side scoring logic and to force
  access-control decisions onto the backend where they belong.
- The React Native plugin was never updated to match. `1.0.0` has
  been leaking the internal server verdict to JS the whole time —
  not because the authors wanted to, but because the plugin stayed
  pinned to `UseSenseSDK ~> 1.0` and compiled against the old
  unredacted result type.
- Bumping the iOS native dep to `~> 4.2` broke compilation because
  those pillar-score accessors no longer exist on
  `RedactedDecisionObject`. The fix required a full rewrite of the
  iOS bridge, the TypeScript types, and the example app.

### Breaking changes

#### Result shape reduced to five fields + three booleans

`UseSenseResult` is now:

```ts
interface UseSenseResult {
  sessionId: string;
  sessionType: string | null;
  identityId: string | null;
  decision: 'APPROVE' | 'REJECT' | 'MANUAL_REVIEW';
  timestamp: string;
  isApproved: boolean;
  isRejected: boolean;
  isPendingReview: boolean;
}
```

The following fields are **removed** from the JS surface and can
only be consumed via the HMAC-signed webhook delivered to your
backend:

- `channelTrustScore`
- `livenessScore`
- `matchSenseRiskScore`
- `presenceConfidence`
- `reasons`
- `ruleTriggered`
- `recommendedAction`
- `sessionSignature`

#### Decision values are now uppercase

`'approved'` → `'APPROVE'`, `'rejected'` → `'REJECT'`,
`'manual_review'` → `'MANUAL_REVIEW'`. Matches the native SDKs
exactly — previously the plugin was lowercasing them, which was
extra friction for anyone debugging across a webhook log.

Use the new `result.isApproved` / `isRejected` / `isPendingReview`
convenience booleans instead of string-comparing `decision`.

#### API renamed: `startSession` → `startVerification`

```ts
// Before (v1.x)
const result = await UseSense.startSession({ sessionType: 'enrollment' });

// After (v2.0)
const result = await UseSense.startVerification({ sessionType: 'enrollment' });
```

The new name matches the native SDKs' `startVerification` methods
directly. No behavioural difference.

#### Removed methods

- `UseSense.cancelSession()` — the native SDKs don't expose a
  programmatic cancel. Sessions are cancelled by the user via the
  back / dismiss button in the native camera UI, which causes
  `startVerification` to reject with `USER_CANCELLED` /
  `session_cancelled`.
- `UseSense.getSessionStatus(sessionId)` — the native SDKs don't
  expose a session-status query. Poll your backend instead, which
  has full access to the session's state via the UseSense API.
- `UseSense.getSdkVersion()` — not supported by the current native
  SDK's public API.

#### `UseSenseConfig` reshaped

Several fields are removed because they don't exist on the native
SDKs' v4.x `UseSenseConfig`:

- `organizationId` — inferred from the API key by the server.
- `sessionType` (at config level) — now a per-call property of
  `VerificationRequest`.
- `identityId` (at config level) — same, per-call.
- `challengePolicy` — no longer a client-side config; the server
  decides.
- `enableAudio` — same, server-side policy.
- `timeout` — the native SDKs enforce their own timeouts.
- `metadata` (at config level) — now a per-call property of
  `VerificationRequest`.

The v2.0 config is:

```ts
interface UseSenseConfig {
  apiKey: string;
  environment?: 'sandbox' | 'production' | 'auto';
  apiEndpoint?: string;
  branding?: BrandingConfig;
}
```

#### Error codes are now uppercase strings

Previously a mix of `'camera_permission_denied'` and
`'CAMERA_PERMISSION_DENIED'`. Now always uppercase, matching the
native SDKs' `UseSenseErrorCode` enum rawValues. Bridge-specific
codes (`'session_cancelled'`, `'sdk_not_initialized'`,
`'no_view_controller'`, `'invalid_config'`) remain lowercase.

### Added

- **Native SDK deps** bumped:
  - iOS: `UseSenseSDK` `~> 1.0` → `~> 4.2` (minimum v4.2.2, which has
    the terminal-screen centering fix)
  - Android: `ai.usesense:sdk:1.0.0` → `4.2.1` (now on Maven
    Central — `mavenCentral()` is in every Android project by
    default, so no custom Maven repo declaration is needed)
- **iOS bridge rewritten** against the v4.x native SDK API. Uses the
  instance-based `UseSense(config:)` client, `startVerification(request:)`
  session pattern, and `UseSenseViewController` for presentation.
  Event subscription is set up synchronously inside `initialize` so
  there's no frame gap between `UseSense.initialize` and events
  being wired; the previous v1.x bridge didn't have this because
  iOS SDK events weren't exposed at all.
- **`UseSense.reset()`** method — clears event listeners and
  releases the native client. Useful for test teardown or when
  re-initializing with a different key.
- **`UseSense.isInitialized()`** method — returns whether the
  native plugin has an active SDK client. Useful for
  feature-flagging UI.
- **Example app rewritten** to accept the API key at runtime via a
  masked `TextInput` with show/hide toggle, a sandbox/production
  `Switch`, and `AsyncStorage` persistence across launches.
  Matches the iOS example's `@AppStorage("apiKey")` + `SecureField`
  pattern and the Android example's `SharedPreferences` pattern.
  No source editing required — clone, run, paste key, test. Adds
  `@react-native-async-storage/async-storage` as an example-only
  dep.
- **`.github/` governance files**: `CODEOWNERS`, PR template, bug
  report + feature request issue templates. Matches the layout of
  `qudusadeyemi/usesense-ios-sdk` and `qudusadeyemi/usesense-android-sdk`.
- **`CONTRIBUTING.md`** gains a "Maintainer notes" section covering
  the plugin architecture, Turbo Module vs Bridge, native SDK
  version management, release process, and the npm publish flow.

### Fixed

- **iOS bridge compilation** against the current iOS SDK (v4.x).
  Previously the bridge only compiled against `~> 1.0` because it
  referenced accessors like `useSenseResult.channelTrustScore` that
  were removed in v4.0's `RedactedDecisionObject`.
- **Android bridge** no longer passes `gatewayKey` to
  `UseSenseConfig`. The field was removed from the v4.0 native
  Android SDK when the Cloudflare Worker proxy took over gateway
  responsibilities server-side. The JS API no longer exposes the
  field; any stale callers that still pass it will have the key
  silently ignored.
- **Stale URL references** across README and INTEGRATION_GUIDE
  updated from `app.usesense.ai` to `watchtower.usesense.ai`
  (the dashboard moved in April 2026 as part of the watchtower
  consolidation).
- **Decision string values in INTEGRATION_GUIDE's production
  checklist** updated from lowercase `approved`/`rejected`/
  `manual_review` to uppercase `APPROVE`/`REJECT`/`MANUAL_REVIEW`.

### Migration guide

If you're upgrading from `react-native-usesense@1.0.0`:

1. **Replace `startSession` with `startVerification`**:
   ```diff
   - const result = await UseSense.startSession({ sessionType: 'enrollment' });
   + const result = await UseSense.startVerification({ sessionType: 'enrollment' });
   ```

2. **Uppercase decision string comparisons**:
   ```diff
   - if (result.decision === 'approved') { ... }
   + if (result.isApproved) { ... }
   ```

3. **Remove any reads of pillar scores or signature fields** from
   your JS code. If you were using them for UI feedback, consider
   using the `decision` / `isApproved` / `isRejected` /
   `isPendingReview` fields instead. If you were using them for
   access-control decisions, **you must move that logic to your
   backend** and read the pillar scores from the webhook payload
   — the client-side values were never trustworthy and should
   never have been exposed.

4. **Remove any calls to `cancelSession`, `getSessionStatus`, or
   `getSdkVersion`**. Cancellation is now user-driven through the
   native camera UI; session status comes from your backend
   querying the UseSense API; SDK version is no longer exposed.

5. **Remove any `UseSenseConfig` fields other than `apiKey`,
   `environment`, `apiEndpoint`, and `branding`**. Move
   `sessionType`, `identityId`, and `metadata` to the
   `VerificationRequest` argument of `startVerification`.

6. **Bump your `@react-native-async-storage/async-storage` peer
   dependency** if you want to use the example app's runtime
   key-input pattern.

## [1.0.0] - 2026-03-13

### Added
- Initial public release
- `UseSense.initialize()` for plugin configuration
- `UseSense.startSession()` for enrollment and authentication
- `UseSense.cancelSession()` for programmatic cancellation
- `UseSense.getSessionStatus()` for polling session state
- `UseSense.addListener()` for real-time event streaming
- `UseSense.getSdkVersion()` for native SDK version retrieval
- Three-pillar result model: `channelTrustScore`, `livenessScore`, `matchSenseRiskScore`
- Fused `presenceConfidence` score
- Full error code set with recovery guidance
- Turbo Module support (New Architecture)
- Old Architecture backward compatibility via interop layer
- Full TypeScript declarations
- iOS support via CocoaPods (UseSenseSDK dependency)
- Android support via Maven Central (ai.usesense:sdk dependency)
- npm distribution with react-native-builder-bob
- GitHub Actions CI/CD (PR checks + tagged release publishing)
- Complete example app demonstrating enrollment, authentication, and event streaming
