/// Public types for the UseSense Flutter plugin.
///
/// These types provide a clean, idiomatic Dart API on top of the
/// Pigeon-generated message classes.
library;

/// The target environment for the UseSense backend.
enum UseSenseEnvironment {
  /// Sandbox environment for testing.
  sandbox,

  /// Production environment.
  production,

  /// Auto-detect from the API key prefix.
  auto,
}

/// The type of verification session.
enum SessionType {
  /// Enroll a new identity.
  enrollment,

  /// Authenticate an existing identity.
  authentication,
}

/// Branding configuration for the SDK's camera UI.
class BrandingConfig {
  /// Creates a [BrandingConfig].
  const BrandingConfig({
    this.displayName,
    this.logoUrl,
    this.primaryColor,
    this.redirectUrl,
    this.buttonRadius = 12,
    this.fontFamily,
  });

  /// Display name shown in the UI. Null inherits from organization settings.
  final String? displayName;

  /// URL of the logo shown in the UI. Null inherits from organization settings.
  final String? logoUrl;

  /// Primary color hex string (e.g. `#4f46e5`). Null inherits from
  /// organization settings.
  final String? primaryColor;

  /// URL to redirect to after session completion. Null inherits from
  /// organization settings.
  final String? redirectUrl;

  /// Corner radius for buttons in dp. Defaults to 12.
  final int buttonRadius;

  /// Custom font family name. Null uses the system default.
  final String? fontFamily;
}

/// Configuration for the UseSense SDK.
class UseSenseConfig {
  /// Creates a [UseSenseConfig].
  ///
  /// [apiKey] is required. All other fields have sensible defaults.
  const UseSenseConfig({
    required this.apiKey,
    this.environment = UseSenseEnvironment.auto,
    this.baseUrl,
    this.gatewayKey,
    this.branding,
    this.googleCloudProjectNumber,
  });

  /// Your UseSense API key.
  final String apiKey;

  /// The backend environment. Defaults to [UseSenseEnvironment.auto].
  final UseSenseEnvironment environment;

  /// Override the default backend URL. Null uses the SDK default.
  final String? baseUrl;

  /// Optional Supabase gateway key.
  final String? gatewayKey;

  /// Optional UI branding overrides.
  final BrandingConfig? branding;

  /// Google Cloud project number for Play Integrity attestation (Android only).
  final int? googleCloudProjectNumber;
}

/// A request to start a verification session.
class VerificationRequest {
  /// Creates a [VerificationRequest].
  const VerificationRequest({
    required this.sessionType,
    this.externalUserId,
    this.identityId,
    this.metadata,
  });

  /// The type of session to start.
  final SessionType sessionType;

  /// Your internal user identifier. Optional.
  final String? externalUserId;

  /// The identity ID to authenticate against. Required for
  /// [SessionType.authentication].
  final String? identityId;

  /// Arbitrary key-value metadata attached to the session.
  final Map<String, String>? metadata;
}

/// The outcome of a completed verification session.
class UseSenseResult {
  /// Creates a [UseSenseResult].
  const UseSenseResult({
    required this.sessionId,
    this.sessionType,
    this.identityId,
    required this.decision,
    required this.timestamp,
  });

  /// Unique session identifier.
  final String sessionId;

  /// The session type (`enrollment` or `authentication`).
  final String? sessionType;

  /// The identity ID assigned during enrollment, or verified during
  /// authentication.
  final String? identityId;

  /// The verification decision: `APPROVE`, `REJECT`, or `MANUAL_REVIEW`.
  final String decision;

  /// ISO 8601 timestamp of the decision.
  final String timestamp;

  /// Whether the decision is `APPROVE`.
  bool get isApproved => decision == 'APPROVE';

  /// Whether the decision is `REJECT`.
  bool get isRejected => decision == 'REJECT';

  /// Whether the decision is `MANUAL_REVIEW`.
  bool get isPendingReview => decision == 'MANUAL_REVIEW';

  @override
  String toString() =>
      'UseSenseResult(sessionId: $sessionId, decision: $decision)';
}

/// Event types emitted by the native SDK during a verification session.
enum UseSenseEventType {
  /// Session created on the server.
  sessionCreated,

  /// Device permissions requested.
  permissionsRequested,

  /// Device permissions granted.
  permissionsGranted,

  /// Device permissions denied by the user.
  permissionsDenied,

  /// Frame capture started.
  captureStarted,

  /// A single frame was captured.
  frameCaptured,

  /// All frames captured.
  captureCompleted,

  /// Audio recording started.
  audioRecordStarted,

  /// Audio recording finished.
  audioRecordCompleted,

  /// Challenge phase started.
  challengeStarted,

  /// Challenge phase finished.
  challengeCompleted,

  /// Upload started.
  uploadStarted,

  /// Upload progress update.
  uploadProgress,

  /// Upload finished.
  uploadCompleted,

  /// Server evaluation started.
  completeStarted,

  /// Verdict received from server.
  decisionReceived,

  /// Image quality analysis result.
  imageQualityCheck,

  /// An error occurred.
  error,
}

/// An event emitted by the native SDK during a verification session.
class UseSenseEvent {
  /// Creates a [UseSenseEvent].
  const UseSenseEvent({
    required this.type,
    required this.timestamp,
    this.data,
  });

  /// The event type.
  final UseSenseEventType type;

  /// Millisecond timestamp of the event.
  final int timestamp;

  /// Optional event payload.
  final Map<String, Object?>? data;

  @override
  String toString() => 'UseSenseEvent(type: $type, timestamp: $timestamp)';
}
