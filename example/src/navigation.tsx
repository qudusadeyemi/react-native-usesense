/**
 * A minimal stack navigator for the example app.
 *
 * The example has a handful of screens and needs push, back and typed params, so it
 * keeps no navigation library (and no extra native modules) between an
 * integrator and the plugin. Screens receive `navigation` and `route` props
 * shaped like React Navigation's, so they read the same way.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { SessionType, UseSenseResult, VerificationRequest } from 'react-native-usesense';

/** What the embedded capture screen starts from. */
export type EmbeddedLaunch =
  | { kind: 'token'; clientToken: string; sessionType: SessionType }
  | { kind: 'request'; request: VerificationRequest };

export type RootStackParamList = {
  Home: undefined;
  Result: { result: UseSenseResult };
  EmbeddedCapture: { launch: EmbeddedLaunch };
  EventLog: undefined;
  DeviceCheck: undefined;
};

type RouteName = keyof RootStackParamList;

export type Route<N extends RouteName> = { name: N; params: RootStackParamList[N] };

export interface Navigation {
  navigate<N extends RouteName>(
    name: N,
    ...params: RootStackParamList[N] extends undefined ? [] : [RootStackParamList[N]]
  ): void;
  /** Swaps the current screen for another, so Back skips it. */
  replace<N extends RouteName>(
    name: N,
    ...params: RootStackParamList[N] extends undefined ? [] : [RootStackParamList[N]]
  ): void;
  goBack(): void;
}

export interface ScreenProps<N extends RouteName> {
  navigation: Navigation;
  route: Route<N>;
}

export interface ScreenConfig {
  // Each screen takes the props for its own route.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: React.ComponentType<ScreenProps<any>>;
  title: string;
}

export function StackNavigator({
  screens,
  initialRoute,
}: {
  screens: Record<RouteName, ScreenConfig>;
  initialRoute: RouteName;
}) {
  const [stack, setStack] = useState<Route<RouteName>[]>([
    { name: initialRoute, params: undefined } as Route<RouteName>,
  ]);

  const goBack = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);

  const navigation = useMemo<Navigation>(
    () => ({
      navigate: (name, ...params) =>
        setStack((s) => [...s, { name, params: params[0] } as Route<RouteName>]),
      replace: (name, ...params) =>
        setStack((s) => [...s.slice(0, -1), { name, params: params[0] } as Route<RouteName>]),
      goBack,
    }),
    [goBack],
  );

  // Android hardware back pops the stack; on the first screen it leaves the app.
  const canGoBack = stack.length > 1;
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack) return false;
      goBack();
      return true;
    });
    return () => sub.remove();
  }, [canGoBack, goBack]);

  const route = stack[stack.length - 1];
  const { component: Screen, title } = screens[route.name];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A2E" />
      <View style={styles.header}>
        {canGoBack ? (
          <TouchableOpacity onPress={goBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.back} />
        )}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.back} />
      </View>
      <View style={styles.body}>
        <Screen key={`${stack.length}-${route.name}`} navigation={navigation} route={route} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F23' },
  header: {
    backgroundColor: '#1A1A2E',
    paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight ?? 24),
    paddingBottom: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  back: { width: 72 },
  backText: { color: '#FFFFFF', fontSize: 16 },
  title: { flex: 1, textAlign: 'center', color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  body: { flex: 1 },
});
