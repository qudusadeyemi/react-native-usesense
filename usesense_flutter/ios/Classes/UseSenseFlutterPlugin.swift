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
    private var client: UseSense?
    private var nativeConfig: UseSenseConfig?

    // MARK: - FlutterPlugin

    public static func register(with registrar: FlutterPluginRegistrar) {
        let instance = UseSenseFlutterPlugin()
        instance.flutterApi = UseSenseFlutterApiImpl(binaryMessenger: registrar.messenger())
        UseSenseHostApiSetup(registrar.messenger(), instance)
    }

    // MARK: - UseSenseHostApi

    func initialize(config: PigeonUseSenseConfig, completion: @escaping (Result<Void, Error>) -> Void) {
        let environment: Environment
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
                logoUrl: b.logoUrl,
                primaryColor: b.primaryColor ?? "#4F63F5",
                buttonRadius: CGFloat(b.buttonRadius ?? 12),
                fontFamily: b.fontFamily
            )
        }

        let sdkConfig = UseSenseConfig(
            apiKey: config.apiKey,
            gatewayKey: config.gatewayKey ?? UseSenseConfig.defaultGatewayKey,
            environment: environment,
            branding: brandingConfig
        )

        nativeConfig = sdkConfig
        client = UseSense(config: sdkConfig)

        // Subscribe to native events and forward to Dart.
        eventUnsubscribe?()
        eventUnsubscribe = client?.onEvent { [weak self] event in
            DispatchQueue.main.async {
                self?.forwardEvent(event)
            }
        }

        completion(.success(()))
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

        // Present the SDK's camera UI as a full-screen modal.
        let vc = UseSenseViewController(session: session) { [weak self] result in
            DispatchQueue.main.async {
                rootVC.dismiss(animated: true)
                switch result {
                case .success(let decision):
                    let pigeonResult = PigeonUseSenseResult(
                        sessionId: decision.sessionId,
                        sessionType: decision.sessionType,
                        identityId: decision.identityId,
                        decision: decision.decision,
                        timestamp: decision.timestamp
                    )
                    completion(.success(pigeonResult))
                case .failure(let error):
                    if error.code == .userCancelled {
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

        vc.modalPresentationStyle = .fullScreen
        rootVC.present(vc, animated: true)
    }

    func startRemoteEnrollment(remoteEnrollmentId: String, completion: @escaping (Result<PigeonUseSenseResult, Error>) -> Void) {
        guard let nativeConfig = nativeConfig else {
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

        let vc = HostedEnrollmentViewController(
            enrollmentId: remoteEnrollmentId,
            config: nativeConfig
        ) { [weak self] result in
            DispatchQueue.main.async {
                rootVC.dismiss(animated: true)
                switch result {
                case .success(let decision):
                    // HostedEnrollmentViewController returns a decision string.
                    completion(.success(PigeonUseSenseResult(
                        sessionId: remoteEnrollmentId,
                        sessionType: "enrollment",
                        identityId: nil,
                        decision: decision,
                        timestamp: ISO8601DateFormatter().string(from: Date())
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

        vc.modalPresentationStyle = .fullScreen
        rootVC.present(vc, animated: true)
    }

    func startRemoteVerification(remoteSessionId: String, completion: @escaping (Result<PigeonUseSenseResult, Error>) -> Void) {
        guard let nativeConfig = nativeConfig else {
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

        let vc = HostedVerificationViewController(
            remoteSessionId: remoteSessionId,
            config: nativeConfig
        ) { [weak self] result in
            DispatchQueue.main.async {
                rootVC.dismiss(animated: true)
                switch result {
                case .success(let decision):
                    completion(.success(PigeonUseSenseResult(
                        sessionId: remoteSessionId,
                        sessionType: "authentication",
                        identityId: nil,
                        decision: decision,
                        timestamp: ISO8601DateFormatter().string(from: Date())
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

        vc.modalPresentationStyle = .fullScreen
        rootVC.present(vc, animated: true)
    }

    func isInitialized() throws -> Bool {
        return client != nil
    }

    func reset() throws {
        eventUnsubscribe?()
        eventUnsubscribe = nil
        client?.reset()
        client = nil
        nativeConfig = nil
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

        // iOS SDK event.data is [String: String]?, already safe for platform channels.
        let safeData: [String: Any?]? = event.data?.mapValues { $0 as Any? }

        let pigeonEvent = PigeonUseSenseEvent(
            type: pigeonType,
            timestamp: Int64(event.timestamp.timeIntervalSince1970 * 1000),
            data: safeData
        )
        flutterApi?.onEvent(event: pigeonEvent) { _ in }
    }

    private func mapError(_ error: UseSenseError) -> PigeonError {
        let code: String
        switch error.code {
        case .cameraUnavailable: code = "camera_unavailable"
        case .cameraPermissionDenied: code = "camera_permission_denied"
        case .micPermissionDenied: code = "microphone_permission_denied"
        case .networkError: code = "network_error"
        case .networkTimeout: code = "network_timeout"
        case .sessionExpired: code = "session_expired"
        case .uploadFailed: code = "upload_failed"
        case .captureFailed: code = "capture_failed"
        case .encodingFailed: code = "encoding_failed"
        case .invalidConfig: code = "invalid_config"
        case .quotaExceeded: code = "quota_exceeded"
        case .userCancelled: code = "session_cancelled"
        case .unauthorized: code = "unauthorized"
        case .invalidToken: code = "invalid_token"
        case .sessionNotFound: code = "session_not_found"
        case .identityNotFound: code = "identity_not_found"
        case .invalidRequest: code = "invalid_request"
        case .faceNotDetected: code = "face_not_detected"
        case .lowLight: code = "low_light"
        case .timeout: code = "session_timeout"
        case .serverError: code = "server_error"
        case .serviceUnavailable: code = "service_unavailable"
        case .unknownError: code = "sdk_error"
        @unknown default: code = "sdk_error"
        }
        return PigeonError(code: code, message: error.message, details: error.details)
    }
}
