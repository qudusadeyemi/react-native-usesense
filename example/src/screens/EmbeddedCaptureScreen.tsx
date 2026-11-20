import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { UseSenseView, type UseSenseError } from 'react-native-usesense';
import type { ScreenProps } from '../navigation';

/**
 * The capture embedded in the app's own screen (<UseSenseView />), under the
 * example's own header and caption, instead of a full-screen native screen.
 * Leaving this screen unmounts the view, which ends the capture.
 *
 * On completion this screen is REPLACED by the result, not pushed under it:
 * its route holds a single-use client token, and Back from the result must
 * not land on a capture that would start again with that spent token.
 */
export default function EmbeddedCaptureScreen({ navigation, route }: ScreenProps<'EmbeddedCapture'>) {
  const { launch } = route.params;

  const onError = (error: UseSenseError) => {
    Alert.alert('Verification Failed', `${error.code}: ${error.message}`);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.caption}>
        {launch.kind === 'token'
          ? `Embedded capture from a client token (${launch.sessionType})`
          : `Embedded capture with the API key (${launch.request.sessionType})`}
      </Text>
      {launch.kind === 'token' ? (
        <UseSenseView
          style={styles.capture}
          clientToken={launch.clientToken}
          sessionType={launch.sessionType}
          onComplete={(result) => navigation.replace('Result', { result })}
          onError={onError}
          onCancel={() => navigation.goBack()}
        />
      ) : (
        <UseSenseView
          style={styles.capture}
          request={launch.request}
          onComplete={(result) => navigation.replace('Result', { result })}
          onError={onError}
          onCancel={() => navigation.goBack()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F23' },
  caption: { color: '#9CA3AF', fontSize: 12, textAlign: 'center', paddingVertical: 8 },
  capture: { flex: 1 },
});
