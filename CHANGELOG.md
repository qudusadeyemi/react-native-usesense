# Changelog

All notable changes to react-native-usesense will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/).

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
