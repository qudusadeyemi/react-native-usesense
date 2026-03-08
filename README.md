# react-native-usesense

React Native wrapper for the [UseSense Android SDK](https://github.com/qudusadeyemi/usesense-android-sdk) — identity verification and liveness detection for mobile apps.

## Installation

```bash
npm install react-native-usesense
```

### Android Setup

1. Add the UseSense Android SDK dependency to your app's `android/build.gradle`:

```groovy
allprojects {
    repositories {
        // Add the UseSense Maven repository (when published)
        // maven { url 'https://maven.usesense.ai/releases' }
    }
}
```

2. Register the package in your `MainApplication.java` / `MainApplication.kt`:

```kotlin
import com.usesense.reactnative.UseSensePackage

// Inside getPackages():
packages.add(UseSensePackage())
```

> If you use autolinking (React Native 0.60+), this step may be automatic.

3. Ensure your `minSdkVersion` is at least **24** in `android/build.gradle`.

## Usage

```typescript
import UseSense from 'react-native-usesense';

// 1. Initialize (once, e.g. on app startup)
UseSense.initialize({
  apiKey: 'your_api_key',
  environment: 'sandbox', // or 'production'
});

// 2. Subscribe to events (optional)
const unsubscribe = UseSense.onEvent((event) => {
  console.log(`[${event.type}]`, event.data);
});

// 3. Start verification
try {
  const result = await UseSense.startVerification({
    sessionType: 'enrollment',
    externalUserId: 'user_123',
    metadata: { source: 'onboarding' },
  });

  if (result.isApproved) {
    console.log('Verified!', result.sessionId);
  } else if (result.isPendingReview) {
    console.log('Under review');
  } else {
    console.log('Rejected');
  }
} catch (error) {
  if (error.code === 'CANCELLED') {
    console.log('User cancelled');
  } else {
    console.error('Verification failed:', error.message);
  }
} finally {
  unsubscribe();
}
```

### Authentication Sessions

```typescript
const result = await UseSense.startVerification({
  sessionType: 'authentication',
  identityId: 'identity_abc123', // required for authentication
  externalUserId: 'user_123',
});
```

### Branding

```typescript
UseSense.initialize({
  apiKey: 'your_api_key',
  branding: {
    primaryColor: '#4F63F5',
    buttonRadius: 12,
    logoUrl: 'https://example.com/logo.png',
    fontFamily: 'Inter',
  },
});
```

## API Reference

### `initialize(config)`

| Parameter                  | Type     | Required | Default                  |
| -------------------------- | -------- | -------- | ------------------------ |
| `apiKey`                   | string   | Yes      |                          |
| `environment`              | string   | No       | `'auto'`                 |
| `baseUrl`                  | string   | No       | UseSense default         |
| `gatewayKey`               | string   | No       |                          |
| `branding`                 | object   | No       |                          |
| `googleCloudProjectNumber` | number   | No       |                          |

### `startVerification(request)` → `Promise<UseSenseResult>`

| Parameter        | Type     | Required | Notes                                   |
| ---------------- | -------- | -------- | --------------------------------------- |
| `sessionType`    | string   | Yes      | `'enrollment'` or `'authentication'`    |
| `externalUserId` | string   | No       |                                         |
| `identityId`     | string   | No       | Required for `'authentication'`         |
| `metadata`       | object   | No       |                                         |

### `onEvent(callback)` → `() => void`

Subscribe to SDK lifecycle events. Returns an unsubscribe function.

### `isInitialized()` → `Promise<boolean>`

### `reset()`

## Platform Support

| Platform | Supported |
| -------- | --------- |
| Android  | ✅        |
| iOS      | Planned   |

## License

MIT
