import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { UseSenseEvent } from 'react-native-usesense';

interface Props {
  event: UseSenseEvent;
  timestamp: Date;
}

const EVENT_ICONS: Record<string, string> = {
  session_started: '[S]',
  challenge_presented: '[C]',
  challenge_completed: '[V]',
  processing: '[P]',
  session_completed: '[D]',
  session_error: '[!]',
};

const EVENT_COLORS: Record<string, string> = {
  session_started: '#818CF8',
  challenge_presented: '#F59E0B',
  challenge_completed: '#10B981',
  processing: '#60A5FA',
  session_completed: '#34D399',
  session_error: '#EF4444',
};

function getEventDetail(event: UseSenseEvent): string {
  switch (event.type) {
    case 'session_started':
      return event.sessionId;
    case 'challenge_presented':
      return event.challengeType;
    case 'challenge_completed':
      return event.challengeType;
    case 'processing':
      return event.stage;
    case 'session_completed':
      return event.result.decision;
    case 'session_error':
      return `${event.error.code}: ${event.error.message}`;
    default:
      return '';
  }
}

function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  const s = date.getSeconds().toString().padStart(2, '0');
  const ms = date.getMilliseconds().toString().padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

export default function EventItem({ event, timestamp }: Props) {
  const icon = EVENT_ICONS[event.type] ?? '[?]';
  const color = EVENT_COLORS[event.type] ?? '#9CA3AF';
  const detail = getEventDetail(event);

  return (
    <View style={styles.container}>
      <Text style={[styles.icon, { color }]}>{icon}</Text>
      <View style={styles.body}>
        <View style={styles.header}>
          <Text style={[styles.type, { color }]}>{event.type}</Text>
          <Text style={styles.time}>{formatTime(timestamp)}</Text>
        </View>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A2E',
  },
  icon: {
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: '700',
    marginRight: 12,
    marginTop: 2,
  },
  body: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  type: {
    fontSize: 13,
    fontWeight: '600',
  },
  time: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: 'monospace',
  },
  detail: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
