import 'dart:async';

import 'package:flutter/material.dart';
import 'package:usesense_flutter/usesense_flutter.dart';

void main() {
  runApp(const UseSenseExampleApp());
}

class UseSenseExampleApp extends StatelessWidget {
  const UseSenseExampleApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'UseSense Example',
      theme: ThemeData(
        colorSchemeSeed: const Color(0xFF4F46E5),
        useMaterial3: true,
      ),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final _useSense = UseSenseFlutter();

  bool _initialized = false;
  bool _loading = false;
  String _status = 'Not initialized';
  final List<String> _events = [];
  StreamSubscription<UseSenseEvent>? _eventSub;
  StreamSubscription<void>? _cancelledSub;

  @override
  void initState() {
    super.initState();
    _eventSub = _useSense.onEvent.listen(_onEvent);
    _cancelledSub = _useSense.onCancelled.listen((_) {
      _addEvent('Session cancelled by user');
    });
  }

  @override
  void dispose() {
    _eventSub?.cancel();
    _cancelledSub?.cancel();
    _useSense.dispose();
    super.dispose();
  }

  void _onEvent(UseSenseEvent event) {
    _addEvent('${event.type.name} (${event.timestamp})');
  }

  void _addEvent(String message) {
    setState(() {
      _events.insert(0, message);
      if (_events.length > 50) _events.removeLast();
    });
  }

  Future<void> _initialize() async {
    setState(() {
      _loading = true;
      _status = 'Initializing...';
    });
    try {
      await _useSense.initialize(
        const UseSenseConfig(
          apiKey: 'YOUR_API_KEY_HERE',
          // environment: UseSenseEnvironment.sandbox,
        ),
      );
      setState(() {
        _initialized = true;
        _status = 'Initialized';
      });
    } on UseSenseError catch (e) {
      setState(() => _status = 'Init failed: ${e.message}');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _startEnrollment() async {
    setState(() {
      _loading = true;
      _status = 'Starting enrollment...';
    });
    try {
      final result = await _useSense.startVerification(
        const VerificationRequest(
          sessionType: SessionType.enrollment,
          // externalUserId: 'user-123',
        ),
      );
      setState(() {
        _status = 'Enrollment ${result.decision}';
        if (result.identityId != null) {
          _addEvent('Identity ID: ${result.identityId}');
        }
      });
    } on UseSenseError catch (e) {
      setState(() => _status = 'Enrollment failed: ${e.message}');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _startAuthentication() async {
    setState(() {
      _loading = true;
      _status = 'Starting authentication...';
    });
    try {
      final result = await _useSense.startVerification(
        const VerificationRequest(
          sessionType: SessionType.authentication,
          identityId: 'IDENTITY_ID_FROM_ENROLLMENT',
        ),
      );
      setState(() => _status = 'Authentication ${result.decision}');
    } on UseSenseError catch (e) {
      setState(() => _status = 'Auth failed: ${e.message}');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _resetSdk() async {
    await _useSense.reset();
    setState(() {
      _initialized = false;
      _status = 'Not initialized';
      _events.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('UseSense Example')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Text('Status: $_status',
                        style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    if (_loading) const LinearProgressIndicator(),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loading || _initialized ? null : _initialize,
              child: const Text('Initialize SDK'),
            ),
            const SizedBox(height: 8),
            ElevatedButton(
              onPressed: _loading || !_initialized ? null : _startEnrollment,
              child: const Text('Start Enrollment'),
            ),
            const SizedBox(height: 8),
            ElevatedButton(
              onPressed:
                  _loading || !_initialized ? null : _startAuthentication,
              child: const Text('Start Authentication'),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: _loading ? null : _resetSdk,
              child: const Text('Reset SDK'),
            ),
            const SizedBox(height: 16),
            Text('Events', style: Theme.of(context).textTheme.titleSmall),
            const Divider(),
            Expanded(
              child: ListView.builder(
                itemCount: _events.length,
                itemBuilder: (context, index) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 2),
                    child: Text(_events[index],
                        style: Theme.of(context).textTheme.bodySmall),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
