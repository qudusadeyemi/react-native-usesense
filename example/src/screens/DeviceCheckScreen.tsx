import React, { useEffect, useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  Settings,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { deviceCheck, type DeviceCheck } from 'react-native-usesense';

/**
 * Silent device check (Your KYC) demo.
 *
 * In a real app your server calls `POST /v1/device-checks` with its API key
 * and hands the three values below to the app. Here you paste them, then run
 * start and finish.
 *
 * For automated device tests on iOS the screen also reads them from launch
 * arguments (`-USESENSE_DC_ID dc_... -USESENSE_DC_TOKEN dct_...
 * -USESENSE_DC_NONCE dn_... -USESENSE_DC_BASE_URL https://...`), which iOS
 * puts in NSUserDefaults, and runs start then finish on its own.
 */
export function launchCheck(): { id: string; token: string; nonce: string; baseUrl: string } | null {
  if (Platform.OS !== 'ios') return null;
  const get = (k: string) => {
    const v = Settings.get(k);
    return typeof v === 'string' ? v : '';
  };
  const id = get('USESENSE_DC_ID');
  const token = get('USESENSE_DC_TOKEN');
  const nonce = get('USESENSE_DC_NONCE');
  if (!id || !token || !nonce) return null;
  return { id, token, nonce, baseUrl: get('USESENSE_DC_BASE_URL') };
}

export default function DeviceCheckScreen() {
  const launch = useRef(launchCheck()).current;
  const [baseUrl, setBaseUrl] = useState(launch?.baseUrl || 'https://api.usesense.ai');
  const [id, setId] = useState(launch?.id ?? '');
  const [token, setToken] = useState(launch?.token ?? '');
  const [nonce, setNonce] = useState(launch?.nonce ?? '');
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const check = useRef<DeviceCheck | null>(null);

  const current = () =>
    (check.current ??= deviceCheck({
      deviceCheckId: id.trim(),
      token: token.trim(),
      nonce: nonce.trim(),
      apiBaseUrl: baseUrl.trim(),
    }));

  const run = async (phase: 'start' | 'finish') => {
    setBusy(true);
    const c = current();
    const r = phase === 'start' ? await c.start() : await c.finish();
    const line = r.ok ? `${r.phase}: received` : `${r.phase}: ${r.error.code} (${r.error.message})`;
    // Visible in the device console, for automated runs.
    console.log(`USESENSE_DEVICE_CHECK ${id} ${line}`);
    setLog((prev) => [line, ...prev]);
    setBusy(false);
  };

  useEffect(() => {
    if (!launch) return;
    (async () => {
      await run('start');
      await run('finish');
    })();
    return () => check.current?.dispose();
    // Run once, on mount, for a launch-argument check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    check.current?.dispose();
    check.current = null;
    setLog([]);
  };

  const field = (value: string, onChange: (v: string) => void, placeholder: string) => (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="#6B7280"
      autoCapitalize="none"
      autoCorrect={false}
    />
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.description}>
        Your server creates the check (POST /v1/device-checks) and passes these to the app. No UI,
        camera or permission prompt.
      </Text>
      {field(baseUrl, setBaseUrl, 'https://api.usesense.ai')}
      {field(id, setId, 'Device check id (dc_...)')}
      {field(token, setToken, 'Token (dct_...)')}
      {field(nonce, setNonce, 'Nonce (dn_...)')}
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.button, busy && styles.disabled]}
          disabled={busy}
          onPress={() => run('start')}
        >
          <Text style={styles.buttonText}>Start</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.secondary, busy && styles.disabled]}
          disabled={busy}
          onPress={() => run('finish')}
        >
          <Text style={styles.buttonText}>Finish</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={reset}>
        <Text style={styles.link}>New check</Text>
      </TouchableOpacity>
      {log.map((line, i) => (
        <Text key={`${i}-${line}`} style={styles.log}>
          {line}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F23' },
  content: { padding: 20 },
  description: { color: '#9CA3AF', fontSize: 13, lineHeight: 18, marginBottom: 16 },
  input: {
    backgroundColor: '#1A1A2E',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2D2D44',
  },
  row: { flexDirection: 'row', gap: 12 },
  button: {
    flex: 1,
    backgroundColor: '#4F7CFF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondary: { backgroundColor: '#2D2D44' },
  disabled: { opacity: 0.5 },
  buttonText: { color: '#FFFFFF', fontWeight: '600' },
  link: { color: '#4F7CFF', marginTop: 16, marginBottom: 8 },
  log: { color: '#FFFFFF', fontSize: 13, marginTop: 6 },
});
