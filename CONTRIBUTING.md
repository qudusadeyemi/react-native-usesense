# Contributing

react-native-usesense is a proprietary SDK developed by UseSense Technologies Ltd. External code contributions are not accepted at this time.

## Bug Reports

If you encounter a bug, please report it via one of the following channels:

- **GitHub Issues**: [https://github.com/qudusadeyemi/react-native-usesense/issues](https://github.com/qudusadeyemi/react-native-usesense/issues)
- **Email**: [support@usesense.ai](mailto:support@usesense.ai)

When reporting a bug, please include:

1. Plugin version (`npm list react-native-usesense`)
2. React Native version (`npx react-native --version`)
3. Platform (iOS / Android) and OS version
4. Device model (or simulator/emulator details)
5. Steps to reproduce
6. Expected vs actual behavior
7. Relevant logs or error messages

## Feature Requests

Feature requests are welcome via GitHub Issues or email. Please describe your use case and how the feature would help your integration.

## Security Vulnerabilities

If you discover a security vulnerability, please **do not** open a public issue. Instead, report it to [support@usesense.ai](mailto:support@usesense.ai). See [SECURITY.md](./SECURITY.md) for details.

---

## Maintainer notes: plugin architecture and release process

This section is for internal maintainers. External contributors can ignore it.

### Plugin architecture

`react-native-usesense` is a thin bridge that wraps the native UseSense iOS and Android SDKs. The layout:

```
react-native-usesense/
├── src/
│   └── index.ts             # Public TypeScript API (hand-written)
├── lib/                     # react-native-builder-bob output (gitignored)
├── ios/
│   └── UseSenseModule.swift # RCTEventEmitter-based bridge
├── android/
│   ├── build.gradle
│   └── src/main/java/com/usesense/reactnative/
│       ├── UseSenseModule.kt  # ReactContextBaseJavaModule bridge
│       └── UseSensePackage.kt # Module registration
├── react-native-usesense.podspec  # CocoaPods spec (version from package.json)
└── example/                 # Full example app (AsyncStorage-backed runtime key input)
```

### Public API surface

The plugin exposes exactly five `UseSense.*` static methods:
`initialize`, `startVerification`, `addListener`, `reset`,
`isInitialized`. Anything beyond those five is either a TypeScript
type export or an internal bridge method that callers shouldn't
invoke directly.

**The result type is intentionally reduced to five fields plus
three convenience booleans.** Do NOT add pillar scores,
`sessionSignature`, `reasons`, or any other internal verdict
metadata back to the result dict on either the iOS or Android
bridge. Those fields are stripped at the native SDK level for
security reasons (preventing client-side reverse-engineering of
scoring logic); the React Native plugin must match. If an
integrator needs pillar scores, point them at their webhook
payload — that's where those values live, signed and verifiable.

### Turbo Module vs Bridge

The plugin declares `codegenConfig` in `package.json` with a
Turbo Module name of `RNUseSenseSpec`. On New Architecture
projects React Native uses the generated Turbo Module interface
automatically; on Old Architecture projects it falls back to the
RCTBridgeModule interop layer. Both paths are supported without
conditional code at the bridge level.

### Native SDK version management

The plugin depends on specific minimum versions of the native SDKs:

| Platform | Manifest | Current floor |
|----------|----------|---------------|
| iOS | `react-native-usesense.podspec` → `s.dependency "UseSenseSDK", "~> 4.2"` | 4.2.2 |
| Android | `android/build.gradle` → `implementation "ai.usesense:sdk:4.2.1"` | 4.2.1 |

When the native SDKs ship a new version:

1. Check the CHANGELOG for each native repo (`qudusadeyemi/usesense-ios-sdk`, `qudusadeyemi/usesense-android-sdk`) and decide whether the plugin needs to bump. Bug fixes usually don't; new public API or removed/renamed symbols do.
2. Update the version strings in the two manifests above.
3. If the native SDK public API changed, update `ios/UseSenseModule.swift` and `android/src/main/java/com/usesense/reactnative/UseSenseModule.kt` to match. The v1.x → v4.2 bump in this PR is the cautionary tale — doing the rewrite late made it much harder because we had to reconcile a completely rewritten result shape, a completely rewritten config shape, and a completely rewritten session-launch pattern all at once.
4. Run `npm run typecheck` and `npm test` to catch any TS-side drift.
5. Bump `package.json` version, add a CHANGELOG entry, tag, push.

### Release process

1. Create a release-prep PR that bumps:
   - `package.json` → `"version": "X.Y.Z"`
   - `CHANGELOG.md` → new `[X.Y.Z]` entry at the top
2. Merge the PR.
3. Tag the merge commit: `git tag -a vX.Y.Z -m "vX.Y.Z" && git push origin vX.Y.Z`.
4. `release.yml` takes over: runs `npm ci`, build, typecheck, test, `npm publish` with the `NPM_TOKEN` repo secret, and creates a matching GitHub Release.

If the publish step fails with "duplicate version", bump to the next patch and re-tag — npm is immutable per version.

### npm publish secret

`release.yml` reads `secrets.NPM_TOKEN`. Generate the token at https://www.npmjs.com/settings/<user>/tokens with the **Automation** scope (it's the type that works inside CI without 2FA prompts). Add it to the repo at Settings → Secrets and variables → Actions → New repository secret.

### Cross-checking with iOS / Android / Flutter / Web SDKs

The React Native plugin version is decoupled from the native SDK versions — bumped only when the plugin's public JS API changes, not every time the native SDKs ship a patch. The native SDK floors in the manifests above are what tie a specific plugin version to a specific native version range. When coordinating a release across all platforms (iOS, Android, Web, React Native, Flutter), the plugin usually ships last since it needs the native releases to already be on their respective registries.
