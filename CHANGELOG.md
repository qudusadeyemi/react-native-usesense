# Changelog

All notable changes to react-native-usesense will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/).

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
