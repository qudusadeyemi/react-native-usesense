import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:usesense_flutter/usesense_flutter.dart';

class ResultScreen extends StatelessWidget {
  const ResultScreen({super.key, required this.result});

  final UseSenseResult result;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    final Color decisionColor;
    final IconData decisionIcon;
    final String decisionLabel;

    if (result.isApproved) {
      decisionColor = Colors.green;
      decisionIcon = Icons.check_circle;
      decisionLabel = 'Approved';
    } else if (result.isRejected) {
      decisionColor = colors.error;
      decisionIcon = Icons.cancel;
      decisionLabel = 'Rejected';
    } else {
      decisionColor = Colors.amber.shade700;
      decisionIcon = Icons.hourglass_top;
      decisionLabel = 'Manual Review';
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Verification Result')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Decision badge
          Card(
            color: decisionColor.withAlpha(30),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
              child: Column(
                children: [
                  Icon(decisionIcon, size: 48, color: decisionColor),
                  const SizedBox(height: 8),
                  Text(
                    decisionLabel,
                    style: theme.textTheme.headlineMedium?.copyWith(
                      color: decisionColor,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Session details
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Session Details',
                    style: theme.textTheme.titleMedium,
                  ),
                  const SizedBox(height: 12),
                  _DetailRow(
                    label: 'Session ID',
                    value: result.sessionId,
                    copyable: true,
                  ),
                  if (result.sessionType != null)
                    _DetailRow(
                      label: 'Session Type',
                      value: result.sessionType!,
                    ),
                  if (result.identityId != null)
                    _DetailRow(
                      label: 'Identity ID',
                      value: result.identityId!,
                      copyable: true,
                    ),
                  _DetailRow(
                    label: 'Decision',
                    value: result.decision,
                  ),
                  _DetailRow(
                    label: 'Timestamp',
                    value: result.timestamp,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Security note
          Card(
            color: colors.tertiaryContainer,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.security,
                    color: colors.onTertiaryContainer,
                    size: 20,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'This result is for UI feedback only. The definitive '
                      'verdict is delivered via webhook to your backend. '
                      'Never trust the SDK result for access-control decisions.',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colors.onTertiaryContainer,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          FilledButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({
    required this.label,
    required this.value,
    this.copyable = false,
  });

  final String label;
  final String value;
  final bool copyable;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.outline),
            ),
          ),
          Expanded(
            child: Text(value, style: theme.textTheme.bodyMedium),
          ),
          if (copyable)
            InkWell(
              onTap: () {
                Clipboard.setData(ClipboardData(text: value));
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('$label copied')),
                );
              },
              child: Icon(
                Icons.copy,
                size: 16,
                color: theme.colorScheme.outline,
              ),
            ),
        ],
      ),
    );
  }
}
