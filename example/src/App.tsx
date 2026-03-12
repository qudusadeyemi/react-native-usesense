import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import UseSense, {
  type UseSenseResult,
  type UseSenseEvent,
} from 'react-native-usesense';

// ---------------------------------------------------------------------------
// Replace with your actual API key
// ---------------------------------------------------------------------------
const API_KEY = 'sk_test_your_api_key_here';

export default function App() {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UseSenseResult | null>(null);
  const [events, setEvents] = useState<UseSenseEvent[]>([]);

  // Initialize the SDK on mount
  useEffect(() => {
    UseSense.initialize({
      apiKey: API_KEY,
      environment: 'sandbox',
      branding: {
        primaryColor: '#4F46E5',
        buttonRadius: 12,
      },
    });
    setInitialized(true);
  }, []);

  // Subscribe to SDK lifecycle events
  useEffect(() => {
    const unsubscribe = UseSense.onEvent((event) => {
      console.log(`[UseSense] ${event.type}`, event.data);
      setEvents((prev) => [event, ...prev].slice(0, 50));
    });

    return unsubscribe;
  }, []);

  // Run an enrollment session
  const handleEnrollment = useCallback(async () => {
    setLoading(true);
    setResult(null);

    try {
      const res = await UseSense.startVerification({
        sessionType: 'enrollment',
        externalUserId: 'example-user-001',
        metadata: { source: 'example-app', flow: 'onboarding' },
      });

      setResult(res);

      if (res.isApproved) {
        Alert.alert('Approved', `Identity verified.\nSession: ${res.sessionId}`);
      } else if (res.isPendingReview) {
        Alert.alert('Pending Review', 'Your verification is under review.');
      } else {
        Alert.alert('Rejected', 'Verification was not approved.');
      }
    } catch (error: any) {
      if (error.code === 'CANCELLED') {
        Alert.alert('Cancelled', 'You cancelled the verification.');
      } else {
        Alert.alert('Error', error.message ?? 'An unknown error occurred.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Run an authentication session
  const handleAuthentication = useCallback(async () => {
    if (!result?.identityId) {
      Alert.alert(
        'No Identity',
        'Run an enrollment first to get an identityId.',
      );
      return;
    }

    setLoading(true);

    try {
      const res = await UseSense.startVerification({
        sessionType: 'authentication',
        identityId: result.identityId,
        externalUserId: 'example-user-001',
      });

      setResult(res);

      if (res.isApproved) {
        Alert.alert('Authenticated', 'Identity confirmed.');
      } else {
        Alert.alert('Failed', `Decision: ${res.decision}`);
      }
    } catch (error: any) {
      if (error.code === 'CANCELLED') {
        Alert.alert('Cancelled', 'You cancelled the verification.');
      } else {
        Alert.alert('Error', error.message ?? 'An unknown error occurred.');
      }
    } finally {
      setLoading(false);
    }
  }, [result?.identityId]);

  // Reset SDK state
  const handleReset = useCallback(() => {
    UseSense.reset();
    setResult(null);
    setEvents([]);
    setInitialized(false);

    // Re-initialize
    UseSense.initialize({
      apiKey: API_KEY,
      environment: 'sandbox',
    });
    setInitialized(true);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>UseSense Example</Text>
        <Text style={styles.subtitle}>
          Platform: {UseSense.platform} | Initialized: {String(initialized)}
        </Text>

        {/* Action buttons */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleEnrollment}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Start Enrollment</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleAuthentication}
            disabled={loading || !result?.identityId}
          >
            <Text
              style={[
                styles.buttonText,
                (!result?.identityId) && styles.buttonTextDisabled,
              ]}
            >
              Authenticate
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.outlineButton]}
            onPress={handleReset}
            disabled={loading}
          >
            <Text style={styles.outlineButtonText}>Reset SDK</Text>
          </TouchableOpacity>
        </View>

        {/* Last result */}
        {result && (
          <View style={styles.resultCard}>
            <Text style={styles.sectionTitle}>Last Result</Text>
            <Text style={styles.mono}>Session: {result.sessionId}</Text>
            <Text style={styles.mono}>Decision: {result.decision}</Text>
            <Text style={styles.mono}>Type: {result.sessionType}</Text>
            <Text style={styles.mono}>Identity: {result.identityId ?? '—'}</Text>
            <Text style={styles.mono}>
              Approved: {String(result.isApproved)} | Rejected:{' '}
              {String(result.isRejected)} | Pending:{' '}
              {String(result.isPendingReview)}
            </Text>
          </View>
        )}

        {/* Event log */}
        {events.length > 0 && (
          <View style={styles.eventLog}>
            <Text style={styles.sectionTitle}>
              Events ({events.length})
            </Text>
            {events.map((evt, i) => (
              <Text key={i} style={styles.eventItem}>
                {evt.type}
                {evt.data ? ` — ${JSON.stringify(evt.data)}` : ''}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 32,
  },
  buttonGroup: {
    gap: 12,
    marginBottom: 32,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
  },
  secondaryButton: {
    backgroundColor: '#059669',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextDisabled: {
    opacity: 0.4,
  },
  outlineButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  mono: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#374151',
    marginBottom: 2,
  },
  eventLog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  eventItem: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#6B7280',
    marginBottom: 4,
  },
});
