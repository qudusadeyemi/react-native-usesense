import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { UseSenseResult } from 'react-native-usesense';
import { RootStackParamList } from '../App';
import ScoreCard from '../components/ScoreCard';

type Props = NativeStackScreenProps<RootStackParamList, 'Result'>;

const DECISION_CONFIG = {
  approved: { label: 'Approved', color: '#10B981', bg: '#064E3B' },
  rejected: { label: 'Rejected', color: '#EF4444', bg: '#7F1D1D' },
  manual_review: { label: 'Manual Review', color: '#F59E0B', bg: '#78350F' },
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

      <View style={styles.confidenceRow}>
        <Text style={styles.confidenceLabel}>Presence Confidence</Text>
        <Text style={styles.confidenceValue}>{result.presenceConfidence}</Text>
      </View>

      <View style={styles.scoresContainer}>
        <ScoreCard
          title="Channel Trust"
          subtitle="DeepSense"
          score={result.channelTrustScore}
          highIsGood={true}
        />
        <ScoreCard
          title="Liveness"
          subtitle="LiveSense"
          score={result.livenessScore}
          highIsGood={true}
        />
        <ScoreCard
          title="MatchSense Risk"
          subtitle="MatchSense"
          score={result.matchSenseRiskScore}
          highIsGood={false}
        />
      </View>

      {result.reasons.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reasons</Text>
          {result.reasons.map((reason, index) => (
            <View key={index} style={styles.reasonRow}>
              <Text style={styles.reasonBullet}>-</Text>
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          ))}
        </View>
      )}

      {result.ruleTriggered && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rule Triggered</Text>
          <Text style={styles.detailValue}>{result.ruleTriggered}</Text>
        </View>
      )}

      {result.recommendedAction && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommended Action</Text>
          <Text style={styles.detailValue}>{result.recommendedAction}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Session Details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Session ID</Text>
          <Text style={styles.detailValueMono}>{result.sessionId}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Signature</Text>
          <Text style={styles.detailValueMono} numberOfLines={1} ellipsizeMode="middle">
            {result.sessionSignature}
          </Text>
        </View>
      </View>

      <View style={styles.warning}>
        <Text style={styles.warningText}>
          This result is for UI feedback only. The definitive verdict arrives at your backend via webhook.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F23',
  },
  content: {
    padding: 20,
  },
  decisionBadge: {
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 24,
  },
  decisionText: {
    fontSize: 20,
    fontWeight: '700',
  },
  confidenceRow: {
    alignItems: 'center',
    marginBottom: 24,
  },
  confidenceLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  confidenceValue: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scoresContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
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
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reasonRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  reasonBullet: {
    color: '#9CA3AF',
    marginRight: 8,
  },
  reasonText: {
    flex: 1,
    color: '#D1D5DB',
    fontSize: 14,
  },
  detailRow: {
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#D1D5DB',
  },
  detailValueMono: {
    fontSize: 12,
    color: '#D1D5DB',
    fontFamily: 'monospace',
  },
  warning: {
    backgroundColor: '#78350F',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  warningText: {
    color: '#FCD34D',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
