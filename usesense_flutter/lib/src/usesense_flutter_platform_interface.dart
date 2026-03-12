import 'package:plugin_platform_interface/plugin_platform_interface.dart';

import 'usesense_flutter_method_channel.dart';
import 'usesense_types.dart';

/// The interface that platform-specific implementations of `usesense_flutter`
/// must implement.
///
/// Platform implementations should extend this class rather than implement it,
/// as new methods may be added in the future. Extending this class ensures
/// backward compatibility.
abstract class UseSenseFlutterPlatform extends PlatformInterface {
  /// Constructs a [UseSenseFlutterPlatform].
  UseSenseFlutterPlatform() : super(token: _token);

  static final Object _token = Object();

  static UseSenseFlutterPlatform _instance = MethodChannelUseSenseFlutter();

  /// The default instance of [UseSenseFlutterPlatform] to use.
  static UseSenseFlutterPlatform get instance => _instance;

  /// Platform-specific implementations should set this to their own
  /// platform-specific class that extends [UseSenseFlutterPlatform] when they
  /// register themselves.
  static set instance(UseSenseFlutterPlatform instance) {
    PlatformInterface.verify(instance, _token);
    _instance = instance;
  }

  /// Initialize the UseSense SDK.
  Future<void> initialize(UseSenseConfig config);

  /// Start a verification session.
  Future<UseSenseResult> startVerification(VerificationRequest request);

  /// Start a remote enrollment flow.
  Future<UseSenseResult> startRemoteEnrollment(String remoteEnrollmentId);

  /// Start a remote verification flow.
  Future<UseSenseResult> startRemoteVerification(String remoteSessionId);

  /// Whether the SDK has been initialized.
  Future<bool> isInitialized();

  /// Reset the SDK and release all resources.
  Future<void> reset();

  /// Register a listener for session events.
  void addEventListener(void Function(UseSenseEvent event) listener);

  /// Remove a previously registered event listener.
  void removeEventListener(void Function(UseSenseEvent event) listener);

  /// Register a listener for session cancellation.
  void addCancelledListener(void Function() listener);

  /// Remove a previously registered cancellation listener.
  void removeCancelledListener(void Function() listener);
}
