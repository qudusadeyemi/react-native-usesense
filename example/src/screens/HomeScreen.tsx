import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  UseSense,
  UseSenseError,
  UseSenseEnvironment,
} from 'react-native-usesense';
import { RootStackParamList } from '../App';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

// AsyncStorage keys — match the semantics of iOS's @AppStorage("apiKey")
// and Android's SharedPreferences("api_key").
const STORAGE_KEY_API_KEY = 'usesense_example_api_key';
const STORAGE_KEY_USE_PRODUCTION = 'usesense_example_use_production';

export default function HomeScreen({ navigation }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [useProduction, setUseProduction] = useState(false);
  const [identityId, setIdentityId] = useState('');
  const [loading, setLoading] = useState(false);

  // Tracks the key the SDK is currently initialized for. If the user
  // changes the key (or flips the environment toggle), we force a
  // re-init on next tap so the new values take effect.
  const initializedForRef = useRef<string | null>(null);

  // Restore persisted state on first render.
  useEffect(() => {
    (async () => {
      try {
        const [storedKey, storedProd] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_API_KEY),
          AsyncStorage.getItem(STORAGE_KEY_USE_PRODUCTION),
        ]);
        if (storedKey) setApiKey(storedKey);
        if (storedProd === 'true') setUseProduction(true);
      } catch {
        // AsyncStorage read failures are non-fatal for the example
        // app — the user can just retype their key if persistence
        // didn't work on this device.
      }
    })();
  }, []);

  // Persist API key and environment as they change.
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY_API_KEY, apiKey).catch(() => {});
  }, [apiKey]);
  useEffect(() => {
    AsyncStorage.setItem(
      STORAGE_KEY_USE_PRODUCTION,
      useProduction ? 'true' : 'false',
    ).catch(() => {});
  }, [useProduction]);

  // Ensure the SDK is initialized with the currently-entered key
  // before starting a session. Returns `true` if the SDK is ready,
  // `false` if the key is empty or initialization fails.
  const ensureInitialized = async (): Promise<boolean> => {
    const trimmed = apiKey.trim();
    if (!trimmed) return false;
    const stateKey = `${trimmed}|${useProduction ? 'prod' : 'sandbox'}`;
    if (initializedForRef.current === stateKey) return true;
    try {
      await UseSense.initialize({
        apiKey: trimmed,
        environment: (useProduction
          ? 'production'
          : 'sandbox') as UseSenseEnvironment,
      });
      initializedForRef.current = stateKey;
      return true;
    } catch (err) {
      const e = err as UseSenseError;
      Alert.alert(
        'Initialization Failed',
        `${e.code ?? 'unknown'}: ${e.message ?? 'SDK could not be initialized.'}`,
      );
      return false;
    }
  };

  const handleSession = async (
    sessionType: 'enrollment' | 'authentication',
  ) => {
    if (sessionType === 'authentication' && !identityId.trim()) {
      Alert.alert(
        'Identity ID Required',
        'Enter an identity ID for authentication sessions.',
      );
      return;
    }

    if (!(await ensureInitialized())) return;

    setLoading(true);
    try {
      const result = await UseSense.startVerification({
        sessionType,
        identityId:
          sessionType === 'authentication' ? identityId.trim() : undefined,
      });
      navigation.navigate('Result', { result });
    } catch (error) {
      const err = error as UseSenseError;
      switch (err.code) {
        case 'session_cancelled':
        case 'USER_CANCELLED':
          // User cancelled — silent.
          break;
        case 'CAMERA_PERMISSION_DENIED':
          Alert.alert(
            'Camera Required',
            'Camera access is required for identity verification.',
          );
          break;
        case 'NETWORK_ERROR':
        case 'NETWORK_TIMEOUT':
          Alert.alert(
            'Network Error',
            'Check your internet connection and try again.',
          );
          break;
        default:
          Alert.alert(
            'Verification Failed',
            `${err.code ?? 'unknown'}: ${err.message ?? 'Session could not be completed.'}`,
          );
      }
    } finally {
      setLoading(false);
    }
  };

  const hasKey = apiKey.trim().length > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>Human Presence Verification</Text>
        <Text style={styles.subtitle}>
          Verify that a real human is behind the camera
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Configuration</Text>

        {/* API key input — masked by default, persisted across launches. */}
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, styles.inputFlex]}
            placeholder="API Key (sk_sandbox_... or sk_prod_...)"
            placeholderTextColor="#6B7280"
            value={apiKey}
            onChangeText={(text) => {
              setApiKey(text);
              // Force re-init on next tap if the key changed.
              initializedForRef.current = null;
            }}
            secureTextEntry={!apiKeyVisible}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            onPress={() => setApiKeyVisible((v) => !v)}
            style={styles.eyeButton}
          >
            <Text style={styles.eyeButtonText}>
              {apiKeyVisible ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Production / Sandbox toggle. */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Production</Text>
          <Switch
            value={useProduction}
            onValueChange={(v) => {
              setUseProduction(v);
              initializedForRef.current = null;
            }}
            trackColor={{ false: '#374151', true: '#4F7CFF' }}
          />
        </View>

        {!hasKey && (
          <Text style={styles.warning}>
            Enter your API key from watchtower.usesense.ai
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Enrollment</Text>
        <Text style={styles.cardDescription}>
          First-time face registration. Creates a new identity record after
          1:N duplicate scan.
        </Text>
        <TouchableOpacity
          style={[
            styles.button,
            styles.enrollButton,
            (!hasKey || loading) && styles.buttonDisabled,
          ]}
          onPress={() => handleSession('enrollment')}
          disabled={!hasKey || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Enroll</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Authentication</Text>
        <Text style={styles.cardDescription}>
          Verify a returning user against their enrolled face template
          (1:1 + 1:N).
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Identity ID (e.g. idn_abc123)"
          placeholderTextColor="#6B7280"
          value={identityId}
          onChangeText={setIdentityId}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[
            styles.button,
            styles.authButton,
            (!hasKey || !identityId.trim() || loading) && styles.buttonDisabled,
          ]}
          onPress={() => handleSession('authentication')}
          disabled={!hasKey || !identityId.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Authenticate</Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.eventLogLink}
        onPress={() => navigation.navigate('EventLog')}
      >
        <Text style={styles.eventLogLinkText}>View Event Log</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F23' },
  content: { padding: 20 },
  header: { marginBottom: 24 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: { fontSize: 14, color: '#9CA3AF' },
  card: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 16,
    lineHeight: 18,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  inputFlex: { flex: 1 },
  input: {
    backgroundColor: '#0F0F23',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2D2D44',
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    marginLeft: 8,
    backgroundColor: '#0F0F23',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2D2D44',
  },
  eyeButtonText: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  toggleLabel: { color: '#D1D5DB', fontSize: 14 },
  warning: {
    marginTop: 8,
    color: '#FBBF24',
    fontSize: 12,
  },
  button: { borderRadius: 8, padding: 14, alignItems: 'center' },
  enrollButton: { backgroundColor: '#4F7CFF' },
  authButton: { backgroundColor: '#00D4AA' },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  eventLogLink: { alignItems: 'center', paddingVertical: 12 },
  eventLogLinkText: { color: '#818CF8', fontSize: 14, fontWeight: '500' },
});
