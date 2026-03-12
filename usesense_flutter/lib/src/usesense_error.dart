/// Error types for the UseSense Flutter plugin.
library;

/// An error from the UseSense SDK.
///
/// Wraps native SDK errors with structured codes, human-readable messages,
/// and retry guidance.
class UseSenseError implements Exception {
  /// Creates a [UseSenseError].
  const UseSenseError({
    required this.code,
    required this.message,
    this.serverCode,
    this.isRetryable = false,
    this.details,
  });

  /// Creates a [UseSenseError] from a [PlatformException].
  factory UseSenseError.fromPlatformException(Object exception) {
    if (exception is UseSenseError) return exception;
    return UseSenseError(
      code: codeFromString(exception.toString()),
      message: exception.toString(),
    );
  }

  // -- Error codes matching the native SDK --

  /// Camera hardware unavailable.
  static const int cameraUnavailable = 1001;

  /// Camera permission denied by the user.
  static const int cameraPermissionDenied = 1002;

  /// Microphone permission denied by the user.
  static const int microphonePermissionDenied = 1003;

  /// Network communication error.
  static const int networkError = 2001;

  /// Network request timed out.
  static const int networkTimeout = 2002;

  /// Session has expired.
  static const int sessionExpired = 3001;

  /// Frame/data upload failed.
  static const int uploadFailed = 3002;

  /// Frame capture failed.
  static const int captureFailed = 4001;

  /// Frame encoding failed.
  static const int encodingFailed = 4002;

  /// Invalid SDK configuration.
  static const int invalidConfig = 5001;

  /// Organization quota exceeded.
  static const int quotaExceeded = 6001;

  /// SDK not initialized.
  static const int sdkNotInitialized = 7001;

  /// Session was cancelled by the user.
  static const int sessionCancelled = 8001;

  /// Numeric error code.
  final int code;

  /// Server-specific error code, if available.
  final String? serverCode;

  /// Human-readable error description.
  final String message;

  /// Whether the operation can be retried.
  final bool isRetryable;

  /// Additional error details.
  final Map<String, String>? details;

  /// Converts a string error code from the native platform to a numeric code.
  static int codeFromString(String code) {
    switch (code) {
      case 'camera_unavailable':
        return cameraUnavailable;
      case 'camera_permission_denied':
        return cameraPermissionDenied;
      case 'microphone_permission_denied':
        return microphonePermissionDenied;
      case 'network_error':
        return networkError;
      case 'network_timeout':
        return networkTimeout;
      case 'session_expired':
        return sessionExpired;
      case 'upload_failed':
        return uploadFailed;
      case 'capture_failed':
        return captureFailed;
      case 'encoding_failed':
        return encodingFailed;
      case 'invalid_config':
        return invalidConfig;
      case 'quota_exceeded':
        return quotaExceeded;
      case 'sdk_not_initialized':
        return sdkNotInitialized;
      case 'session_cancelled':
        return sessionCancelled;
      default:
        return -1;
    }
  }

  @override
  String toString() =>
      'UseSenseError(code: $code, message: $message, retryable: $isRetryable)';
}
