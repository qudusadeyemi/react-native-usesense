import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { UseSenseEvent } from 'react-native-usesense';

interface Props {
  event: UseSenseEvent;
  timestamp: Date;
}

const EVENT_ICONS: Partial<Record<UseSenseEvent['type'], string>> = {
  SESSION_CREATED: '[S]',
  CHALLENGE_STARTED: '[C]',
  CHALLENGE_COMPLETED: '[V]',
  UPLOAD_STARTED: '[U]',
  COMPLETE_STARTED: '[P]',
  DECISION_RECEIVED: '[D]',
  ERROR: '[!]',
};

const EVENT_COLORS: Partial<Record<UseSenseEvent['type'], string>> = {
  SESSION_CREATED: '#818CF8',
  CHALLENGE_STARTED: '#F59E0B',
  CHALLENGE_COMPLETED: '#10B981',
  UPLOAD_STARTED: '#60A5FA',
  COMPLETE_STARTED: '#60A5FA',
  DECISION_RECEIVED: '#34D399',
  ERROR: '#EF4444',
};

/** The event's payload as `key: value` pairs (opaque strings, never scoring data). */
function getEventDetail(event: UseSenseEvent): string {
  if (!event.data) return '';
  return Object.entries(event.data)
    .map(([k, v]) => `${k}: ${v}`)
    .join('  ');
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
