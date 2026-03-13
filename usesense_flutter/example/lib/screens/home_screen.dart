import 'dart:async';

import 'package:flutter/material.dart';
import 'package:usesense_flutter/usesense_flutter.dart';

import '../widgets/event_tile.dart';
import 'result_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({
    super.key,
    required this.useSense,
    required this.initialized,
    this.initError,
  });

  final UseSenseFlutter useSense;
  final bool initialized;
  final String? initError;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _identityIdController = TextEditingController();
  final _events = <UseSenseEvent>[];
  bool _loading = false;
  StreamSubscription<UseSenseEvent>? _eventSub;
  StreamSubscription<void>? _cancelledSub;

  @override
  void initState() {
    super.initState();
    _eventSub = widget.useSense.onEvent.listen(_onEvent);
    _cancelledSub = widget.useSense.onCancelled.listen((_) {
      _addSyntheticEvent('Session cancelled by user');
    });
  }

  @override
  void dispose() {
    _eventSub?.cancel();
    _cancelledSub?.cancel();
    _identityIdController.dispose();
    super.dispose();
  }

  void _onEvent(UseSenseEvent event) {
    setState(() {
      _events.insert(0, event);
      if (_events.length > 100) _events.removeLast();
    });
  }

  void _addSyntheticEvent(String message) {
    setState(() {
      _events.insert(
        0,
        UseSenseEvent(
          type: UseSenseEventType.error,
          timestamp: DateTime.now().millisecondsSinceEpoch,
          data: {'message': message},
        ),
      );
    });
  }

  Future<void> _startEnrollment() async {
    setState(() => _loading = true);
    try {
      final result = await widget.useSense.startVerification(
        const VerificationRequest(sessionType: SessionType.enrollment),
      );
      if (mounted) {
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => ResultScreen(result: result)),
        );
      }
    } on UseSenseError catch (e) {
      if (mounted) _showError(e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _startAuthentication() async {
    final identityId = _identityIdController.text.trim();
    if (identityId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter an identity ID to authenticate.')),
      );
      return;
    }
    setState(() => _loading = true);
    try {
      final result = await widget.useSense.startVerification(
        VerificationRequest(
          sessionType: SessionType.authentication,
          identityId: identityId,
        ),
      );
      if (mounted) {
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => ResultScreen(result: result)),
        );
      }
    } on UseSenseError catch (e) {
      if (mounted) _showError(e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showError(UseSenseError error) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Verification Failed'),
        content: Text('${error.message}\n\nCode: ${error.code}'),
        actions: [
          if (error.isRetryable)
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Retry'),
            ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isReady = widget.initialized && !_loading;

    return Scaffold(
      appBar: AppBar(
        title: const Text('UseSense Example'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Reset SDK',
            onPressed: () async {
              await widget.useSense.reset();
              setState(() => _events.clear());
            },
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Status card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Icon(
                      widget.initialized ? Icons.check_circle : Icons.error,
                      color: widget.initialized
                          ? theme.colorScheme.primary
                          : theme.colorScheme.error,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        widget.initError ??
                            (widget.initialized
                                ? 'SDK initialized (sandbox)'
                                : 'Initializing...'),
                        style: theme.textTheme.bodyLarge,
                      ),
                    ),
                    if (_loading) const CircularProgressIndicator(),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Enroll button
            FilledButton.icon(
              onPressed: isReady ? _startEnrollment : null,
              icon: const Icon(Icons.person_add),
              label: const Text('Enroll New Identity'),
            ),
            const SizedBox(height: 12),

            // Identity ID field + Authenticate button
            TextField(
              controller: _identityIdController,
              decoration: const InputDecoration(
                labelText: 'Identity ID',
                hintText: 'idn_...',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 8),
            FilledButton.tonal(
              onPressed: isReady ? _startAuthentication : null,
              child: const Text('Authenticate'),
            ),
            const SizedBox(height: 16),

            // Event log
            Text('Event Log', style: theme.textTheme.titleSmall),
            const Divider(),
            Expanded(
              child: _events.isEmpty
                  ? Center(
                      child: Text(
                        'Events will appear here during a session.',
                        style: theme.textTheme.bodySmall,
                      ),
                    )
                  : ListView.builder(
                      itemCount: _events.length,
                      itemBuilder: (_, i) => EventTile(event: _events[i]),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
