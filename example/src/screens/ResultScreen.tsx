import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Result'>;

const DECISION_CONFIG = {
  APPROVE: { label: 'Approved', color: '#00D4AA', bg: '#064E3B' },
  REJECT: { label: 'Rejected', color: '#FF6B4A', bg: '#7F1D1D' },
  MANUAL_REVIEW: { label: 'Manual Review', color: '#FFB84D', bg: '#78350F' },
} as const;

export default function ResultScreen({ route }: Props) {
  const { result } = route.params;
  const decision = DECISION_CONFIG[result.decision];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.decisionBadge, { backgroundColor: decision.bg }]}>
        <Text style={[styles.decisionText, { color: decision.color }]}>
          {decision.label}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Session Details</Text>
        <DetailRow label="Session ID" value={result.sessionId} mono />
        {result.sessionType && (
          <DetailRow label="Session Type" value={result.sessionType} />
        )}
        {result.identityId && (
          <DetailRow label="Identity ID" value={result.identityId} mono />
        )}
        <DetailRow label="Decision" value={result.decision} />
        <DetailRow label="Timestamp" value={result.timestamp} mono />
      </View>

      <View style={styles.warning}>
        <Text style={styles.warningText}>
          This result is intentionally redacted. The SDK result is for UI
          feedback only. Pillar scores (channel trust, liveness,
          MatchSense risk) and the cryptographic session signature are
          delivered to your backend via the signed webhook — never trust
          the client-side decision for access-control.
        </Text>
      </View>
    </ScrollView>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={mono ? styles.detailValueMono : styles.detailValue}
        numberOfLines={mono ? 1 : undefined}
        ellipsizeMode={mono ? 'middle' : undefined}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F23' },
  content: { padding: 20 },
  decisionBadge: {
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 24,
  },
  decisionText: { fontSize: 20, fontWeight: '700' },
  section: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailRow: { marginBottom: 10 },
  detailLabel: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  detailValue: { fontSize: 14, color: '#D1D5DB' },
  detailValueMono: {
    fontSize: 12,
    color: '#D1D5DB',
    fontFamily: 'monospace',
  },
  warning: {
    backgroundColor: '#78350F',
    borderRadius: 8,
    padding: 14,
    marginTop: 8,
  },
  warningText: {
    color: '#FCD34D',
    fontSize: 12,
    lineHeight: 18,
  },
});
