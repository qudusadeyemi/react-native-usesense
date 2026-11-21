# Releasing the UseSense SDKs

Five SDKs ship together: Android (`ai.usesense:sdk`), iOS (`UseSenseSDK` +
`UseSenseMediaPipe`), web (`@usesense/web-sdk`), Flutter (`usesense_flutter`)
and React Native (`react-native-usesense`). Flutter and React Native are thin
wrappers over the native SDKs and must always pin the latest native versions.

## One batch, one update

Customers should update once per batch of work. Hold a release until every
change planned for that platform in the batch is merged, and release the
wrappers once, after the native SDKs they need are published.

## Order

1. **Native first.** Merge to `main`, check every version constant (Android:
   `gradle.properties` `sdkVersion` and `DeviceSignalCollector.SDK_VERSION`;
   iOS: both podspecs and `UseSense.version`), then push the tag `vX.Y.Z`.
   `release-android.yml` publishes to Maven Central; `release-ios.yml` builds
   the isolated MediaPipe bundle, creates the GitHub release and pushes both pods
   to CocoaPods trunk. Web: tag `vX.Y.Z` in `usesense-web-sdk` (npm).
2. **Wait for the registries.** Maven Central and the CocoaPods CDN version
   index lag the publish by minutes (the index file is cached for up to 10
   minutes). `python3 scripts/native_pins.py wait` in a wrapper waits for both.
3. **Wrappers.** Every hour, each wrapper's `bump-native-pins.yml` checks the
   registries. Once a newer native release is installable it opens (or
   refreshes) a `bot/native-pins` PR that moves every pin (Gradle, podspec,
   README, the React Native example `Podfile.lock`) to it, bumps the wrapper's
   patch version, adds a CHANGELOG line and starts CI on the branch. Merge it,
   then tag the wrapper (`release.yml`). To skip the wait, run the workflow by
   hand (Actions, Bump native SDK pins, Run workflow).

## Guards

- **`native-pins.yml`** (both wrappers): every PR, every push to `main` and
  daily, `scripts/native_pins.py check` fails if any native pin is behind the
  latest release. To ship a wrapper that intentionally lags, label the PR
  `native-pins-lag-ok`.
- Every place a wrapper names a native version is listed in `PINS` in
  `scripts/native_pins.py`. If you add another, add it there too, or the check
  reports it as missing.

## No stored tokens

The automation uses only each run's built-in `GITHUB_TOKEN` (scoped to that
repo, expires with the run). There is no personal or cross-repo token to leak.
A PR opened with `GITHUB_TOKEN` does not start `pull_request` workflows, so the
bump run starts `ci.yml` and `native-pins.yml` on its branch with
`workflow_dispatch`; their checks show on the PR.

Publishing stays in your hands: pushing a `v*` tag is what releases each SDK.
Protect `v*` tags and `main` in every SDK repo (Settings, Rules, Rulesets) so
only maintainers can tag or merge.

## Device test before publishing (required)

Nothing is published (no tag, no registry push) until the **release candidate itself** has passed on real phones. Unit tests and CI builds are not enough. They passed for every release that later failed on a phone:

- Android 4.16.0: under R8, no face mesh, and Play services read false. The cause was missing protobuf keep rules, and real people were rejected.
- Android 4.16.0 with AGP 9: a launch crash (ML Kit registrars).
- Flutter 2.11.0: every iOS start failed under UIScene.
- Web 4.16.1: double `complete` events, and a ring that never filled.

Customers pay for every update they have to ship (store review, user upgrades), and repeated updates lost us a customer. So each platform gets **one** release, tested first.

### How
1. Build the candidate **the way a customer does**:
   - a **release** build, with R8 / minify **on** for Android;
   - the native SDK from the candidate artifact (`publishToMavenLocal` with the release version, or the podspec and xcframework zip the release will publish), not a debug build of the repo;
   - wrappers pinned to the candidate native versions.
2. Run it on a **Galaxy A03** (Android) and an **iPhone** with a production sandbox key. Run every applicable step and **check each result on the server**: decision, face mesh tier, Play services / attestation, and the Flow run state in both KV and Postgres.

| Step | What to check |
|---|---|
| Liveness, full screen, client token | Face lines show. The ring fills. APPROVE or the expected review, and the face mesh tier is `pass`. |
| Liveness, embedded, client token | As above, inside the host screen. |
| Enrolment, embedded, API key | It is an `enrollment` session and an identity is created. |
| Enrolment, full screen | As above. |
| Run a Flow that ends in review (`flw_66502aee-...`, NIN `00000000001`) | Only the Flow's "Under review" screen shows, and the run is `awaiting_review` with one `review_pending`. |
| Web, Chrome on the A03 and Safari on the iPhone (web SDK only) | The ring fills, the order matches the apps, there is no magnified first frame, and `complete` fires once. |

3. Write the results (session and run ids) in the release PR. A failure means fix, rebuild the candidate, and test again. Never publish and patch later.
