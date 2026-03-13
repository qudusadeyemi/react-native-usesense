# Changelog

All notable changes to `usesense_flutter` will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-03-13

### Added
- `UseSenseFlutter.initialize()` for SDK configuration with API key and environment
- `UseSenseFlutter.startVerification()` for enrollment and authentication sessions
- `UseSenseFlutter.startRemoteEnrollment()` for hosted enrollment flows
- `UseSenseFlutter.startRemoteVerification()` for hosted verification flows
- `UseSenseFlutter.onEvent` stream for real-time session event listening
- `UseSenseFlutter.onCancelled` stream for user cancellation detection
- `UseSenseFlutter.isInitialized()` for initialization state checking
- `UseSenseFlutter.reset()` for SDK cleanup and resource release
- `UseSenseResult` with decision (APPROVE, REJECT, MANUAL_REVIEW), session ID,
  identity ID, and convenience getters (`isApproved`, `isRejected`, `isPendingReview`)
- `UseSenseError` with 13 structured error codes and retry guidance
- `UseSenseEvent` with 18 event types covering the full session lifecycle
- `BrandingConfig` for UI customization (logo, colors, button radius, font)
- Pigeon-based type-safe platform channels (Dart, Kotlin, Swift)
- iOS support via UseSenseSDK (iOS 16.0+)
- Android support via UseSense Android SDK (API 24+)
- Multi-screen example app with enrollment, authentication, and event log
- Comprehensive README, integration guide, and pub.dev packaging
- CI/CD workflows for pull requests and pub.dev releases
