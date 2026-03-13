import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { UseSense, UseSenseError } from 'react-native-usesense';
import { RootStackParamList } from '../App';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: Props) {
  const [identityId, setIdentityId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSession = async (sessionType: 'enrollment' | 'authentication') => {
    if (sessionType === 'authentication' && !identityId.trim()) {
      Alert.alert('Identity ID Required', 'Enter an identity ID for authentication sessions.');
      return;
    }

    setLoading(true);

    try {
      const result = await UseSense.startSession({
        sessionType,
        identityId: sessionType === 'authentication' ? identityId.trim() : undefined,
      });

      navigation.navigate('Result', { result });
    } catch (error) {
      const err = error as UseSenseError;

      switch (err.code) {
        case 'session_cancelled':
          // User cancelled -- no alert needed
          break;
        case 'camera_permission_denied':
          Alert.alert(
            'Camera Required',
            'Camera access is required for identity verification.',
          );
          break;
        case 'network_error':
          Alert.alert('Network Error', 'Check your internet connection and try again.');
          break;
        default:
          Alert.alert('Verification Failed', `${err.code}: ${err.message}`);
          break;
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Human Presence Verification</Text>
        <Text style={styles.subtitle}>
          Verify that a real human is behind the camera
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Enrollment</Text>
        <Text style={styles.cardDescription}>
          First-time face registration. Creates a new identity record after 1:N duplicate scan.
        </Text>
        <TouchableOpacity
          style={[styles.button, styles.enrollButton]}
          onPress={() => handleSession('enrollment')}
          disabled={loading}
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
          Verify a returning user against their enrolled face template (1:1 + 1:N).
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Identity ID (e.g. idn_abc123)"
          placeholderTextColor="#888"
          value={identityId}
          onChangeText={setIdentityId}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.button, styles.authButton]}
          onPress={() => handleSession('authentication')}
          disabled={loading}
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

      <Text style={styles.version}>
        SDK: {UseSense.getSdkVersion()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F23',
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
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
  button: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  enrollButton: {
    backgroundColor: '#4F46E5',
  },
  authButton: {
    backgroundColor: '#059669',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  eventLogLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  eventLogLinkText: {
    color: '#818CF8',
    fontSize: 14,
    fontWeight: '500',
  },
  version: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 12,
    marginTop: 'auto',
    paddingBottom: 8,
  },
});
