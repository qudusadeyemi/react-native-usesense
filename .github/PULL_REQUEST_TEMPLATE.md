<!--
  Thanks for contributing to the UseSense React Native plugin.

  External code contributions are not accepted at this time; this
  template is primarily for internal maintainers and sanctioned
  partners. If you're filing a bug report or feature request,
  please open an issue instead.
-->

## Summary

<!-- 1-3 sentences: what does this PR change and why? -->

## Type of change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that changes existing public API)
- [ ] Documentation or tooling only
- [ ] Release prep (version bump + CHANGELOG entry)

## Checklist

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run build` succeeds (react-native-builder-bob compilation)
- [ ] Any new public TypeScript API has TSDoc comments
- [ ] `CHANGELOG.md` has been updated for user-visible changes
- [ ] `package.json` version has been bumped if this is a release PR
- [ ] If the native SDK dep was bumped, confirmed that the bridge code still compiles against the new native SDK API surface
- [ ] **Result type is still reduced to the five redacted fields**: `sessionId`, `sessionType`, `identityId`, `decision`, `timestamp` (plus convenience booleans). Did NOT add pillar scores, `sessionSignature`, or any other internal verdict metadata back to the result.
- [ ] Example app (`cd example && npm run ios && npm run android`) still launches and runs enrollment + authentication flows
- [ ] No secrets, API keys, or signing identities committed

## Testing notes

<!--
  Describe how you tested this locally. Note which iOS / Android
  versions you smoke-tested on, and whether native SDK versions
  needed to be updated in the podspec / Gradle alongside this PR.
-->

## Related issues

<!-- Closes #123, relates to #456 -->
