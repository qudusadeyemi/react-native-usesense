import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { UseSenseResult } from 'react-native-usesense';

import HomeScreen from './screens/HomeScreen';
import ResultScreen from './screens/ResultScreen';
import EventLogScreen from './screens/EventLogScreen';

export type RootStackParamList = {
  Home: undefined;
  Result: { result: UseSenseResult };
  EventLog: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Example app root.
 *
 * The SDK is intentionally NOT initialized here. Initialization is
 * deferred to `HomeScreen`, which reads an API key from an
 * AsyncStorage-backed TextInput and calls `UseSense.initialize` lazily
 * on first Enroll/Authenticate tap. This matches the iOS example's
 * `@AppStorage("apiKey")` + `SecureField` pattern and the Android
 * example's `SharedPreferences` pattern — integrators can clone, run,
 * paste their key once, and test without touching any source code.
 */
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#1A1A2E' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: '600' },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'UseSense Example' }}
        />
        <Stack.Screen
          name="Result"
          component={ResultScreen}
          options={{ title: 'Verification Result' }}
        />
        <Stack.Screen
          name="EventLog"
          component={EventLogScreen}
          options={{ title: 'Event Log' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
