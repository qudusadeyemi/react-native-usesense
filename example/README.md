# UseSense React Native Example

Full React Native example app demonstrating plugin initialization,
enrollment, authentication, real-time event streaming, and error
handling. The app is a standalone RN 0.73.11 project that consumes
the plugin from the parent directory via a `file:..` dependency.

## Setup

1. Clone this repository
2. Build the plugin once at the repo root:
   ```bash
   npm install
   npm run build
   ```
3. Install example dependencies:
   ```bash
   cd example
   npm install --legacy-peer-deps
   ```
4. (iOS only) Install pods:
   ```bash
   cd ios && pod install && cd ..
   ```
5. Run on a physical device (camera required for real verification):
   ```bash
   npx react-native run-ios
   # or
   npx react-native run-android
   ```
6. On first launch, paste your sandbox or production API key from
   [watchtower.usesense.ai](https://watchtower.usesense.ai) into the
   **API Key** field at the top of the app. The key is persisted via
   `AsyncStorage` and survives subsequent launches. No source editing
   required.
7. Flip the **Production** toggle if you're using a production key
   (`sk_prod_*`); leave it off for sandbox (`sk_sandbox_*`).
8. Tap **Enroll** to run a first-time enrollment, or paste an existing
   Identity ID and tap **Authenticate** to run an authentication session.

## What This Demonstrates

- Deferred SDK initialisation: the SDK is not initialised until the
  user enters an API key and taps Enroll or Authenticate, matching the
  iOS example's `@AppStorage("apiKey")` + `SecureField` pattern and
  the Android example's `SharedPreferences` + text-field pattern.
- Enrollment session (first-time face registration)
- Authentication session (returning user verification against an
  existing identity ID)
- Real-time event streaming via `UseSense.addListener()`
- Error handling with user-facing dialogs for common failure modes
  (cancelled, camera denied, network error, ...)
- The redacted five-field result object (`sessionId`, `sessionType`,
  `identityId`, `decision`, `timestamp`) displayed after every
  completed session, with a prominent reminder that the definitive
  verdict arrives via the webhook on your backend — **the client-side
  result is UI feedback only**

## Screens

### Home
- Masked API key input with show/hide toggle (persisted)
- Production / Sandbox switch (persisted)
- Warning banner when the API key is empty
- Enroll button for enrollment sessions
- Identity ID input + Authenticate button for authentication sessions
- Link to event log

### Result
- Decision badge (green APPROVED, red REJECTED, amber MANUAL REVIEW)
- Session ID, session type, identity ID, decision, and timestamp
- Security reminder that pillar scores and the session signature are
  delivered to your backend via webhook, not exposed to the client

### Event Log
- Real-time scrolling event feed
- Timestamped entries with event type indicators
- Shows the full lifecycle: `SESSION_CREATED` →
  `PERMISSIONS_REQUESTED` → `CAPTURE_STARTED` → ... →
  `DECISION_RECEIVED`

## Notes

- The example is a RN 0.73.11 project scaffolded via
  `npx @react-native-community/cli init`. If you need to regenerate
  native projects for a different RN version, delete `example/ios`,
  `example/android`, `example/index.js`, `example/metro.config.js`,
  `example/babel.config.js`, and `example/tsconfig.json` and re-run
  `init` at the desired version.
- Android `minSdkVersion` is bumped from the RN template default of
  21 to 28 because the UseSense Android SDK's AAR declares
  `minSdk = 28`. Don't lower it.
- iOS `minimum deployment target` is inherited from the RN template
  (iOS 13); the UseSense iOS SDK requires iOS 15.0+, so the example
  effectively targets iOS 15. If you see a build warning about the
  deployment target mismatch, bump the Podfile's
  `platform :ios, min_ios_version_supported` line.
