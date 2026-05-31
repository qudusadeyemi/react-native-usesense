/**
 * Jest config for the JS Flows wrapper contract suite.
 *
 * The runtime under test (`src/flows.ts`) reads from `NativeModules` lazily
 * and never touches a real React Native runtime — the tests stub it via
 * `jest.mock('react-native', ...)`. A plain `node` environment with the
 * `ts-jest` transformer is therefore enough, and avoids pulling in
 * `jest-expo` / `react-native` Jest presets that would force a much larger
 * dependency surface for a 50-line wrapper.
 *
 * Sessions code is intentionally NOT under test here: `src/index.ts` imports
 * `react-native` at module load time, which is incompatible with this minimal
 * node setup. Sessions are exercised at the native SDK level (XCTest / JUnit).
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
};
