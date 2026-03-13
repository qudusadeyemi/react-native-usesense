import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  title: string;
  subtitle: string;
  score: number;
  highIsGood: boolean;
}

function getScoreColor(score: number, highIsGood: boolean): string {
  const effective = highIsGood ? score : 100 - score;
  if (effective >= 70) return '#10B981';
  if (effective >= 40) return '#F59E0B';
  return '#EF4444';
}

export default function ScoreCard({ title, subtitle, score, highIsGood }: Props) {
  const color = getScoreColor(score, highIsGood);

  return (
    <View style={styles.card}>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <Text style={[styles.score, { color }]}>{score}</Text>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 10,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  score: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4,
  },
  title: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
