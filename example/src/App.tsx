import React from 'react';

import { StackNavigator, type RootStackParamList } from './navigation';
import HomeScreen from './screens/HomeScreen';
import ResultScreen from './screens/ResultScreen';
import EventLogScreen from './screens/EventLogScreen';
import DeviceCheckScreen, { launchCheck } from './screens/DeviceCheckScreen';

export type { RootStackParamList };

/**
 * Example app root.
 *
 * The SDK is intentionally NOT initialized here. Initialization is
 * deferred to `HomeScreen`, which reads an API key from an
 * AsyncStorage-backed TextInput and calls `UseSense.initialize` lazily
 * on first Enroll/Authenticate tap. This matches the iOS example's
 * `@AppStorage("apiKey")` + `SecureField` pattern and the Android
 * example's `SharedPreferences` pattern: integrators can clone, run,
 * paste their key once, and test without touching any source code.
 */
export default function App() {
  return (
    <StackNavigator
      // A launch carrying a device check (automated iOS device tests)
      // opens the silent device check screen, which runs it.
      initialRoute={launchCheck() ? 'DeviceCheck' : 'Home'}
      screens={{
        Home: { component: HomeScreen, title: 'Sense Example' },
        Result: { component: ResultScreen, title: 'Verification Result' },
        EventLog: { component: EventLogScreen, title: 'Event Log' },
        DeviceCheck: { component: DeviceCheckScreen, title: 'Silent device check' },
      }}
    />
  );
}
