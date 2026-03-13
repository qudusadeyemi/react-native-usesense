import 'package:pigeon/pigeon.dart';

@ConfigurePigeon(
  PigeonOptions(
    dartOut: 'lib/src/generated/usesense_api.g.dart',
    kotlinOut:
        'android/src/main/kotlin/com/usesense/flutter/UseSenseApi.g.kt',
    kotlinOptions: KotlinOptions(package: 'com.usesense.flutter'),
    swiftOut: 'ios/Classes/UseSenseApi.g.swift',
  ),
)

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/// The target environment for the UseSense backend.
enum PigeonUseSenseEnvironment {
  sandbox,
  production,
  auto,
}

/// The type of verification session.
enum PigeonSessionType {
  enrollment,
  authentication,
}

/// Event types emitted during a verification session.
enum PigeonEventType {
  sessionCreated,
  permissionsRequested,
  permissionsGranted,
  permissionsDenied,
  captureStarted,
  frameCaptured,
  captureCompleted,
  audioRecordStarted,
  audioRecordCompleted,
  challengeStarted,
  challengeCompleted,
  uploadStarted,
  uploadProgress,
  uploadCompleted,
  completeStarted,
  decisionReceived,
  imageQualityCheck,
  error,
}

// ---------------------------------------------------------------------------
// Message classes
// ---------------------------------------------------------------------------

/// Branding configuration for the SDK UI.
class PigeonBrandingConfig {
  PigeonBrandingConfig({
    this.displayName,
    this.logoUrl,
    this.primaryColor,
    this.redirectUrl,
    this.buttonRadius,
    this.fontFamily,
  });

  String? displayName;
  String? logoUrl;
  String? primaryColor;
  String? redirectUrl;
  int? buttonRadius;
  String? fontFamily;
}

/// SDK configuration passed to [UseSenseHostApi.initialize].
class PigeonUseSenseConfig {
  PigeonUseSenseConfig({
    required this.apiKey,
    this.environment = PigeonUseSenseEnvironment.auto,
    this.baseUrl,
    this.gatewayKey,
    this.branding,
    this.googleCloudProjectNumber,
  });

  String apiKey;
  PigeonUseSenseEnvironment environment;
  String? baseUrl;
  String? gatewayKey;
  PigeonBrandingConfig? branding;
  int? googleCloudProjectNumber;
}

/// Request to start a verification session.
class PigeonVerificationRequest {
  PigeonVerificationRequest({
    required this.sessionType,
    this.externalUserId,
    this.identityId,
    this.metadata,
  });

  PigeonSessionType sessionType;
  String? externalUserId;
  String? identityId;
  Map<String, String>? metadata;
}

/// The outcome of a completed verification session.
class PigeonUseSenseResult {
  PigeonUseSenseResult({
    required this.sessionId,
    this.sessionType,
    this.identityId,
    required this.decision,
    required this.timestamp,
  });

  String sessionId;
  String? sessionType;
  String? identityId;
  String decision;
  String timestamp;
}

/// An event emitted during a verification session.
class PigeonUseSenseEvent {
  PigeonUseSenseEvent({
    required this.type,
    required this.timestamp,
    this.data,
  });

  PigeonEventType type;
  int timestamp;
  Map<String, Object?>? data;
}

/// Structured error from the native SDK.
class PigeonUseSenseError {
  PigeonUseSenseError({
    required this.code,
    this.serverCode,
    required this.message,
    this.isRetryable = false,
    this.details,
  });

  int code;
  String? serverCode;
  String message;
  bool isRetryable;
  Map<String, String>? details;
}

// ---------------------------------------------------------------------------
// Host API — Dart → Native
// ---------------------------------------------------------------------------

/// Methods callable from Dart that execute on the native platform.
@HostApi()
abstract class UseSenseHostApi {
  /// Initialize the UseSense SDK with the given [config].
  ///
  /// Must be called once before any other method. Calling again after
  /// a successful initialization is a no-op.
  @async
  void initialize(PigeonUseSenseConfig config);

  /// Start a verification session.
  ///
  /// The native SDK will present a full-screen camera UI. The returned
  /// future resolves when the session completes with a result, or rejects
  /// if the session fails or is cancelled.
  @async
  PigeonUseSenseResult startVerification(PigeonVerificationRequest request);

  /// Start a remote enrollment flow using a pre-created enrollment ID.
  @async
  PigeonUseSenseResult startRemoteEnrollment(String remoteEnrollmentId);

  /// Start a remote verification flow using a pre-created session ID.
  @async
  PigeonUseSenseResult startRemoteVerification(String remoteSessionId);

  /// Whether the SDK has been initialized successfully.
  bool isInitialized();

  /// Reset the SDK, releasing all resources.
  void reset();
}

// ---------------------------------------------------------------------------
// Flutter API — Native → Dart
// ---------------------------------------------------------------------------

/// Callbacks from native code to Dart during a verification session.
@FlutterApi()
abstract class UseSenseFlutterApi {
  /// Called when the native SDK emits a session event.
  void onEvent(PigeonUseSenseEvent event);

  /// Called when the user cancels the verification session.
  void onCancelled();
}
