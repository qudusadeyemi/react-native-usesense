/// Flutter plugin for UseSense — human presence verification.
///
/// Provides cross-platform access to the UseSense native SDKs for identity
/// verification with DeepSense (device integrity), LiveSense (proof-of-life),
/// and Dedupe (identity collision detection).
///
/// ## Getting started
///
/// ```dart
/// import 'package:usesense_flutter/usesense_flutter.dart';
///
/// final useSense = UseSenseFlutter();
/// await useSense.initialize(UseSenseConfig(apiKey: 'your_api_key'));
///
/// final result = await useSense.startVerification(
///   VerificationRequest(sessionType: SessionType.enrollment),
/// );
/// ```
library;

export 'src/usesense_error.dart' show UseSenseError;
export 'src/usesense_flutter_platform_interface.dart'
    show UseSenseFlutterPlatform;
export 'src/usesense_flutter_plugin.dart' show UseSenseFlutter;
export 'src/usesense_types.dart'
    show
        BrandingConfig,
        SessionType,
        UseSenseConfig,
        UseSenseEnvironment,
        UseSenseEvent,
        UseSenseEventType,
        UseSenseResult,
        VerificationRequest;
