import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Alert } from 'react-native';
import { UseSense, UseSenseResult } from 'react-native-usesense';

import HomeScreen from './screens/HomeScreen';
import ResultScreen from './screens/ResultScreen';
import EventLogScreen from './screens/EventLogScreen';

export type RootStackParamList = {
  Home: undefined;
  Result: { result: UseSenseResult };
  EventLog: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// TODO: Replace with your sandbox API key from https://app.usesense.ai
const API_KEY = 'your_sandbox_api_key';

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    UseSense.initialize({
      apiKey: API_KEY,
      environment: 'sandbox',
    })
      .then(() => setIsReady(true))
      .catch((error) => {
        Alert.alert('Initialization Failed', error.message);
      });
  }, []);

  if (!isReady) {
    return null;
  }

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
          options={{ title: 'UseSense Demo' }}
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
