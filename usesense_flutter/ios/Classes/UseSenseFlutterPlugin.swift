import Flutter
import UIKit
import UseSenseSDK

/// Flutter plugin that bridges Dart calls to the UseSense iOS SDK.
///
/// Implements `UseSenseHostApi` (Pigeon-generated) for Dart → Native calls and
/// uses `UseSenseFlutterApiImpl` (Pigeon-generated) for Native → Dart callbacks.
public class UseSenseFlutterPlugin: NSObject, FlutterPlugin, UseSenseHostApi {

    private var flutterApi: UseSenseFlutterApiImpl?
    private var eventUnsubscribe: (() -> Void)?
    private var client: UseSenseClient?

    // MARK: - FlutterPlugin

    public static func register(with registrar: FlutterPluginRegistrar) {
        let instance = UseSenseFlutterPlugin()
        instance.flutterApi = UseSenseFlutterApiImpl(binaryMessenger: registrar.messenger())
        UseSenseHostApiSetup(registrar.messenger(), instance)
    }

    // MARK: - UseSenseHostApi

    func initialize(config: PigeonUseSenseConfig, completion: @escaping (Result<Void, Error>) -> Void) {
        do {
            let environment: UseSenseEnvironment
            switch config.environment {
            case .sandbox:
                environment = .sandbox
            case .production:
                environment = .production
            case .auto:
                environment = .auto
            }

            var brandingConfig: BrandingConfig? = nil
            if let b = config.branding {
                brandingConfig = BrandingConfig(
                    displayName: b.displayName,
                    logoUrl: b.logoUrl,
                    primaryColor: b.primaryColor,
                    redirectUrl: b.redirectUrl,
                    buttonRadius: b.buttonRadius.map { Int($0) } ?? 12,
                    fontFamily: b.fontFamily
                )
            }

            let nativeConfig = UseSenseConfig(
                apiKey: config.apiKey,
                environment: environment,
                baseUrl: config.baseUrl,
                gatewayKey: config.gatewayKey,
                branding: brandingConfig
            )

            client = UseSense.initialize(config: nativeConfig)

            // Subscribe to native events and forward to Dart.
            eventUnsubscribe?.self()
            eventUnsubscribe = client?.onEvent { [weak self] event in
                DispatchQueue.main.async {
                    self?.forwardEvent(event)
                }
            }

            completion(.success(()))
        } catch {
            completion(.failure(PigeonError(
                code: "invalid_config",
                message: error.localizedDescription,
                details: nil
            )))
        }
    }

    func startVerification(request: PigeonVerificationRequest, completion: @escaping (Result<PigeonUseSenseResult, Error>) -> Void) {
        guard let client = client else {
            completion(.failure(PigeonError(
                code: "sdk_not_initialized",
                message: "UseSense SDK is not initialized. Call initialize() first.",
                details: nil
            )))
            return
        }

        guard let rootVC = UIApplication.shared.delegate?.window??.rootViewController else {
            completion(.failure(PigeonError(
                code: "sdk_not_initialized",
                message: "Root view controller is not available.",
                details: nil
            )))
            return
        }

        let sessionType: SessionType
        switch request.sessionType {
        case .enrollment:
            sessionType = .enrollment
        case .authentication:
            sessionType = .authentication
        }

        let nativeRequest = VerificationRequest(
            sessionType: sessionType,
            externalUserId: request.externalUserId,
            identityId: request.identityId,
            metadata: request.metadata?.mapValues { AnyCodableValue.string($0) }
        )

        let session = client.startVerification(request: nativeRequest)

        session.present(from: rootVC) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let useSenseResult):
                    let pigeonResult = PigeonUseSenseResult(
                        sessionId: useSenseResult.sessionId,
                        sessionType: useSenseResult.sessionType,
                        identityId: useSenseResult.identityId,
                        decision: useSenseResult.decision,
                        timestamp: useSenseResult.timestamp
                    )
                    completion(.success(pigeonResult))
                case .failure(let error):
                    if case .cancelled = error as? UseSenseSessionError {
                        self?.flutterApi?.onCancelled { _ in }
                        completion(.failure(PigeonError(
                            code: "session_cancelled",
                            message: "User cancelled the verification session.",
                            details: nil
                        )))
                    } else {
                        completion(.failure(self?.mapError(error) ?? PigeonError(
                            code: "sdk_error",
                            message: error.localizedDescription,
                            details: nil
                        )))
                    }
                }
            }
        }
    }

    func startRemoteEnrollment(remoteEnrollmentId: String, completion: @escaping (Result<PigeonUseSenseResult, Error>) -> Void) {
        guard let client = client else {
            completion(.failure(PigeonError(
                code: "sdk_not_initialized",
                message: "UseSense SDK is not initialized. Call initialize() first.",
                details: nil
            )))
            return
        }

        guard let rootVC = UIApplication.shared.delegate?.window??.rootViewController else {
            completion(.failure(PigeonError(
                code: "sdk_not_initialized",
                message: "Root view controller is not available.",
                details: nil
            )))
            return
        }

        client.startRemoteEnrollment(enrollmentId: remoteEnrollmentId, from: rootVC) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let useSenseResult):
                    completion(.success(PigeonUseSenseResult(
                        sessionId: useSenseResult.sessionId,
                        sessionType: useSenseResult.sessionType,
                        identityId: useSenseResult.identityId,
                        decision: useSenseResult.decision,
                        timestamp: useSenseResult.timestamp
                    )))
                case .failure(let error):
                    completion(.failure(self?.mapError(error) ?? PigeonError(
                        code: "sdk_error",
                        message: error.localizedDescription,
                        details: nil
                    )))
                }
            }
        }
    }

    func startRemoteVerification(remoteSessionId: String, completion: @escaping (Result<PigeonUseSenseResult, Error>) -> Void) {
        guard let client = client else {
            completion(.failure(PigeonError(
                code: "sdk_not_initialized",
                message: "UseSense SDK is not initialized. Call initialize() first.",
                details: nil
            )))
            return
        }

        guard let rootVC = UIApplication.shared.delegate?.window??.rootViewController else {
            completion(.failure(PigeonError(
                code: "sdk_not_initialized",
                message: "Root view controller is not available.",
                details: nil
            )))
            return
        }

        client.startRemoteVerification(sessionId: remoteSessionId, from: rootVC) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let useSenseResult):
                    completion(.success(PigeonUseSenseResult(
                        sessionId: useSenseResult.sessionId,
                        sessionType: useSenseResult.sessionType,
                        identityId: useSenseResult.identityId,
                        decision: useSenseResult.decision,
                        timestamp: useSenseResult.timestamp
                    )))
                case .failure(let error):
                    completion(.failure(self?.mapError(error) ?? PigeonError(
                        code: "sdk_error",
                        message: error.localizedDescription,
                        details: nil
                    )))
                }
            }
        }
    }

    func isInitialized() throws -> Bool {
        return client != nil
    }

    func reset() throws {
        eventUnsubscribe?()
        eventUnsubscribe = nil
        client?.reset()
        client = nil
    }

    // MARK: - Private helpers

    private func forwardEvent(_ event: UseSenseEvent) {
        let pigeonType: PigeonEventType
        switch event.type {
        case .sessionCreated: pigeonType = .sessionCreated
        case .permissionsRequested: pigeonType = .permissionsRequested
        case .permissionsGranted: pigeonType = .permissionsGranted
        case .permissionsDenied: pigeonType = .permissionsDenied
        case .captureStarted: pigeonType = .captureStarted
        case .frameCaptured: pigeonType = .frameCaptured
        case .captureCompleted: pigeonType = .captureCompleted
        case .audioRecordStarted: pigeonType = .audioRecordStarted
        case .audioRecordCompleted: pigeonType = .audioRecordCompleted
        case .challengeStarted: pigeonType = .challengeStarted
        case .challengeCompleted: pigeonType = .challengeCompleted
        case .uploadStarted: pigeonType = .uploadStarted
        case .uploadProgress: pigeonType = .uploadProgress
        case .uploadCompleted: pigeonType = .uploadCompleted
        case .completeStarted: pigeonType = .completeStarted
        case .decisionReceived: pigeonType = .decisionReceived
        case .imageQualityCheck: pigeonType = .imageQualityCheck
        case .error: pigeonType = .error
        @unknown default: pigeonType = .error
        }

        // Convert data values to platform-channel-safe types.
        let safeData: [String: Any?]? = event.data?.mapValues { value in
            switch value {
            case let s as String: return s
            case let i as Int: return i
            case let d as Double: return d
            case let b as Bool: return b
            case nil: return nil
            default: return "\(value)"
            }
        }

        let pigeonEvent = PigeonUseSenseEvent(
            type: pigeonType,
            timestamp: Int64(event.timestamp),
            data: safeData
        )
        flutterApi?.onEvent(event: pigeonEvent) { _ in }
    }

    private func mapError(_ error: Error) -> PigeonError {
        if let sdkError = error as? UseSenseError {
            let code: String
            switch sdkError.code {
            case 1001: code = "camera_unavailable"
            case 1002: code = "camera_permission_denied"
            case 1003: code = "microphone_permission_denied"
            case 2001: code = "network_error"
            case 2002: code = "network_timeout"
            case 3001: code = "session_expired"
            case 3002: code = "upload_failed"
            case 4001: code = "capture_failed"
            case 4002: code = "encoding_failed"
            case 5001: code = "invalid_config"
            case 6001: code = "quota_exceeded"
            default: code = "sdk_error"
            }
            return PigeonError(code: code, message: sdkError.message, details: nil)
        }
        return PigeonError(code: "sdk_error", message: error.localizedDescription, details: nil)
    }
}

/// Enum matching the iOS SDK's session error type for cancellation detection.
enum UseSenseSessionError: Error {
    case cancelled
}
