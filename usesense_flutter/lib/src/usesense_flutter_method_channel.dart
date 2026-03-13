import 'package:flutter/services.dart';

import 'generated/usesense_api.g.dart';
import 'usesense_error.dart';
import 'usesense_flutter_platform_interface.dart';
import 'usesense_types.dart';

/// Method-channel implementation of [UseSenseFlutterPlatform].
///
/// Uses the Pigeon-generated [UseSenseHostApi] for Dart → Native calls and
/// [UseSenseFlutterApi] for Native → Dart callbacks.
class MethodChannelUseSenseFlutter extends UseSenseFlutterPlatform
    implements UseSenseFlutterApi {
  /// Creates a [MethodChannelUseSenseFlutter] and registers the Flutter API.
  MethodChannelUseSenseFlutter() {
    UseSenseFlutterApi.setUp(this);
  }

  final UseSenseHostApi _hostApi = UseSenseHostApi();

  final List<void Function(UseSenseEvent)> _eventListeners = [];
  final List<void Function()> _cancelledListeners = [];

  // ---------------------------------------------------------------------------
  // HostApi wrappers (Dart → Native)
  // ---------------------------------------------------------------------------

  @override
  Future<void> initialize(UseSenseConfig config) async {
    try {
      await _hostApi.initialize(_toPigeonConfig(config));
    } on PlatformException catch (e) {
      throw _wrapError(e);
    }
  }

  @override
  Future<UseSenseResult> startVerification(VerificationRequest request) async {
    try {
      final result =
          await _hostApi.startVerification(_toPigeonRequest(request));
      return _fromPigeonResult(result);
    } on PlatformException catch (e) {
      throw _wrapError(e);
    }
  }

  @override
  Future<UseSenseResult> startRemoteEnrollment(
    String remoteEnrollmentId,
  ) async {
    try {
      final result =
          await _hostApi.startRemoteEnrollment(remoteEnrollmentId);
      return _fromPigeonResult(result);
    } on PlatformException catch (e) {
      throw _wrapError(e);
    }
  }

  @override
  Future<UseSenseResult> startRemoteVerification(
    String remoteSessionId,
  ) async {
    try {
      final result =
          await _hostApi.startRemoteVerification(remoteSessionId);
      return _fromPigeonResult(result);
    } on PlatformException catch (e) {
      throw _wrapError(e);
    }
  }

  @override
  Future<bool> isInitialized() async {
    try {
      return await _hostApi.isInitialized();
    } on PlatformException catch (e) {
      throw _wrapError(e);
    }
  }

  @override
  Future<void> reset() async {
    try {
      await _hostApi.reset();
    } on PlatformException catch (e) {
      throw _wrapError(e);
    }
  }

  // ---------------------------------------------------------------------------
  // Event listeners
  // ---------------------------------------------------------------------------

  @override
  void addEventListener(void Function(UseSenseEvent event) listener) {
    _eventListeners.add(listener);
  }

  @override
  void removeEventListener(void Function(UseSenseEvent event) listener) {
    _eventListeners.remove(listener);
  }

  @override
  void addCancelledListener(void Function() listener) {
    _cancelledListeners.add(listener);
  }

  @override
  void removeCancelledListener(void Function() listener) {
    _cancelledListeners.remove(listener);
  }

  // ---------------------------------------------------------------------------
  // FlutterApi callbacks (Native → Dart)
  // ---------------------------------------------------------------------------

  @override
  void onEvent(PigeonUseSenseEvent event) {
    final mapped = UseSenseEvent(
      type: UseSenseEventType.values[event.type.index],
      timestamp: event.timestamp,
      data: event.data,
    );
    for (final listener in List.of(_eventListeners)) {
      listener(mapped);
    }
  }

  @override
  void onCancelled() {
    for (final listener in List.of(_cancelledListeners)) {
      listener();
    }
  }

  // ---------------------------------------------------------------------------
  // Mapping helpers
  // ---------------------------------------------------------------------------

  PigeonUseSenseConfig _toPigeonConfig(UseSenseConfig config) {
    return PigeonUseSenseConfig(
      apiKey: config.apiKey,
      environment:
          PigeonUseSenseEnvironment.values[config.environment.index],
      baseUrl: config.baseUrl,
      gatewayKey: config.gatewayKey,
      branding: config.branding != null
          ? PigeonBrandingConfig(
              displayName: config.branding!.displayName,
              logoUrl: config.branding!.logoUrl,
              primaryColor: config.branding!.primaryColor,
              redirectUrl: config.branding!.redirectUrl,
              buttonRadius: config.branding!.buttonRadius,
              fontFamily: config.branding!.fontFamily,
            )
          : null,
      googleCloudProjectNumber: config.googleCloudProjectNumber,
    );
  }

  PigeonVerificationRequest _toPigeonRequest(VerificationRequest request) {
    return PigeonVerificationRequest(
      sessionType: PigeonSessionType.values[request.sessionType.index],
      externalUserId: request.externalUserId,
      identityId: request.identityId,
      metadata: request.metadata,
    );
  }

  UseSenseResult _fromPigeonResult(PigeonUseSenseResult result) {
    return UseSenseResult(
      sessionId: result.sessionId,
      sessionType: result.sessionType,
      identityId: result.identityId,
      decision: result.decision,
      timestamp: result.timestamp,
    );
  }

  UseSenseError _wrapError(PlatformException e) {
    return UseSenseError(
      code: UseSenseError.codeFromString(e.code),
      message: e.message ?? 'An unknown error occurred.',
      isRetryable: _isRetryableCode(e.code),
      details: e.details is Map
          ? (e.details as Map).cast<String, String>()
          : null,
    );
  }

  bool _isRetryableCode(String code) {
    return code == 'network_error' ||
        code == 'network_timeout' ||
        code == 'upload_failed';
  }
}
