import 'package:flutter/material.dart';
import 'package:usesense_flutter/usesense_flutter.dart';

class EventTile extends StatelessWidget {
  const EventTile({super.key, required this.event});

  final UseSenseEvent event;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final time = DateTime.fromMillisecondsSinceEpoch(event.timestamp);
    final timeStr =
        '${time.hour.toString().padLeft(2, '0')}:'
        '${time.minute.toString().padLeft(2, '0')}:'
        '${time.second.toString().padLeft(2, '0')}';

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Icon(_iconFor(event.type), size: 16, color: _colorFor(event.type)),
          const SizedBox(width: 8),
          Text(timeStr, style: theme.textTheme.labelSmall),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              _labelFor(event.type),
              style: theme.textTheme.bodySmall,
            ),
          ),
        ],
      ),
    );
  }

  static IconData _iconFor(UseSenseEventType type) {
    return switch (type) {
      UseSenseEventType.sessionCreated => Icons.play_circle_outline,
      UseSenseEventType.permissionsRequested => Icons.lock_open,
      UseSenseEventType.permissionsGranted => Icons.lock_open,
      UseSenseEventType.permissionsDenied => Icons.lock,
      UseSenseEventType.captureStarted => Icons.camera_alt,
      UseSenseEventType.frameCaptured => Icons.photo_camera,
      UseSenseEventType.captureCompleted => Icons.camera_alt,
      UseSenseEventType.audioRecordStarted => Icons.mic,
      UseSenseEventType.audioRecordCompleted => Icons.mic_off,
      UseSenseEventType.challengeStarted => Icons.sports_esports,
      UseSenseEventType.challengeCompleted => Icons.sports_score,
      UseSenseEventType.uploadStarted => Icons.cloud_upload,
      UseSenseEventType.uploadProgress => Icons.cloud_upload,
      UseSenseEventType.uploadCompleted => Icons.cloud_done,
      UseSenseEventType.completeStarted => Icons.hourglass_top,
      UseSenseEventType.decisionReceived => Icons.gavel,
      UseSenseEventType.imageQualityCheck => Icons.image_search,
      UseSenseEventType.error => Icons.error_outline,
    };
  }

  static Color _colorFor(UseSenseEventType type) {
    return switch (type) {
      UseSenseEventType.error => Colors.red,
      UseSenseEventType.permissionsDenied => Colors.orange,
      UseSenseEventType.decisionReceived => Colors.green,
      _ => Colors.blueGrey,
    };
  }

  static String _labelFor(UseSenseEventType type) {
    return switch (type) {
      UseSenseEventType.sessionCreated => 'Session created',
      UseSenseEventType.permissionsRequested => 'Permissions requested',
      UseSenseEventType.permissionsGranted => 'Permissions granted',
      UseSenseEventType.permissionsDenied => 'Permissions denied',
      UseSenseEventType.captureStarted => 'Capture started',
      UseSenseEventType.frameCaptured => 'Frame captured',
      UseSenseEventType.captureCompleted => 'Capture completed',
      UseSenseEventType.audioRecordStarted => 'Audio recording started',
      UseSenseEventType.audioRecordCompleted => 'Audio recording completed',
      UseSenseEventType.challengeStarted => 'Challenge started',
      UseSenseEventType.challengeCompleted => 'Challenge completed',
      UseSenseEventType.uploadStarted => 'Upload started',
      UseSenseEventType.uploadProgress => 'Upload in progress',
      UseSenseEventType.uploadCompleted => 'Upload completed',
      UseSenseEventType.completeStarted => 'Processing...',
      UseSenseEventType.decisionReceived => 'Decision received',
      UseSenseEventType.imageQualityCheck => 'Image quality check',
      UseSenseEventType.error => 'Error',
    };
  }
}
