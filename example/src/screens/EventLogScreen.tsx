import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { UseSense, UseSenseEvent } from 'react-native-usesense';
import EventItem from '../components/EventItem';

interface TimestampedEvent {
  id: string;
  event: UseSenseEvent;
  timestamp: Date;
}

export default function EventLogScreen() {
  const [events, setEvents] = useState<TimestampedEvent[]>([]);
  const [listening, setListening] = useState(false);
  const listenerRef = useRef<{ remove: () => void } | null>(null);
  const counterRef = useRef(0);

  const startListening = () => {
    listenerRef.current = UseSense.addListener((event) => {
      counterRef.current += 1;
      setEvents((prev) => [
        {
          id: String(counterRef.current),
          event,
          timestamp: new Date(),
        },
        ...prev,
      ]);
    });
    setListening(true);
  };

  const stopListening = () => {
    listenerRef.current?.remove();
    listenerRef.current = null;
    setListening(false);
  };

  const clearLog = () => {
    setEvents([]);
    counterRef.current = 0;
  };

  useEffect(() => {
    startListening();
    return () => stopListening();
  }, []);

  const startTestSession = async () => {
    try {
      await UseSense.startSession({ sessionType: 'enrollment' });
    } catch (error) {
      const err = error as any;
      if (err.code !== 'session_cancelled') {
        Alert.alert('Session Error', err.message);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, listening ? styles.stopButton : styles.startButton]}
          onPress={listening ? stopListening : startListening}
        >
          <Text style={styles.controlButtonText}>
            {listening ? 'Stop Listening' : 'Start Listening'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.sessionButton]}
          onPress={startTestSession}
        >
          <Text style={styles.controlButtonText}>Start Session</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.clearButton]}
          onPress={clearLog}
        >
          <Text style={styles.controlButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusBar}>
        <View style={[styles.statusDot, { backgroundColor: listening ? '#10B981' : '#6B7280' }]} />
        <Text style={styles.statusText}>
          {listening ? 'Listening for events' : 'Not listening'}
        </Text>
        <Text style={styles.eventCount}>{events.length} events</Text>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EventItem event={item.event} timestamp={item.timestamp} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No events yet.</Text>
            <Text style={styles.emptySubtext}>
              Start a verification session to see real-time events.
            </Text>
          </View>
        }
        contentContainerStyle={events.length === 0 ? styles.emptyContainer : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F23',
  },
  controls: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  controlButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#059669',
  },
  stopButton: {
    backgroundColor: '#DC2626',
  },
  sessionButton: {
    backgroundColor: '#4F46E5',
  },
  clearButton: {
    backgroundColor: '#374151',
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1A1A2E',
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D44',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#9CA3AF',
    fontSize: 13,
    flex: 1,
  },
  eventCount: {
    color: '#6B7280',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#6B7280',
    fontSize: 13,
    textAlign: 'center',
  },
});
