import Foundation
import React
import UseSenseSDK

/// React Native bridge for the UseSense iOS SDK.
///
/// Exposes five JS-callable methods — `initialize`, `startVerification`,
/// `reset`, `isInitialized`, plus RCTEventEmitter `supportedEvents`/
/// `startObserving`/`stopObserving` — that mirror the native SDK's
/// public API without leaking any internal scoring data through the
/// bridge.
///
/// The result payload returned from `startVerification` is the
/// five-field redacted shape defined by the native SDK's
/// `RedactedDecisionObject`: `sessionId`, `sessionType`, `identityId`,
/// `decision` (`APPROVE` / `REJECT` / `MANUAL_REVIEW`), `timestamp`.
/// Pillar scores (channel trust, liveness, matchsense risk) are
/// intentionally NOT exposed — integrators must consume those via
/// the signed webhook delivered to their backend, never from the
/// client. Matches the behaviour of the native Android bridge at
/// `android/src/main/java/com/usesense/reactnative/UseSenseModule.kt`
/// and the Flutter plugin at `ios/Classes/UseSenseFlutterPlugin.swift`.
@objc(UseSenseModule)
class UseSenseModule: RCTEventEmitter {

    private var client: UseSense?
    private var eventUnsubscribe: (() -> Void)?
    private var hasListeners = false

    // MARK: - RCTEventEmitter

    override func supportedEvents() -> [String]! {
        return ["UseSenseEvent"]
    }

    override func startObserving() {
        hasListeners = true
    }

    override func stopObserving() {
        hasListeners = false
    }

    @objc
    override static func requiresMainQueueSetup() -> Bool {
        return false
    }

    // MARK: - Module methods

    @objc
    func initialize(_ config: NSDictionary,
                    resolver resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard let apiKey = config["apiKey"] as? String, !apiKey.isEmpty else {
            reject("invalid_config", "apiKey is required", nil)
            return
        }

        let environment: Environment
        switch config["environment"] as? String {
        case "sandbox":
            environment = .sandbox
        case "production":
            environment = .production
        case "auto", nil:
            environment = .auto
        default:
            environment = .auto
        }

        var brandingConfig: BrandingConfig? = nil
        if let b = config["branding"] as? [String: Any] {
            // iOS BrandingConfig accepts logoUrl, primaryColor, buttonRadius,
            // fontFamily. Android-only fields (displayName, redirectUrl) are
            // accepted by the JS API for cross-platform consistency but
            // ignored here since the iOS SDK doesn't support them.
            brandingConfig = BrandingConfig(
                logoUrl: b["logoUrl"] as? String,
                primaryColor: (b["primaryColor"] as? String) ?? "#4F7CFF",
                buttonRadius: CGFloat((b["buttonRadius"] as? Int) ?? 10),
                fontFamily: b["fontFamily"] as? String
            )
        }

        let apiEndpoint = (config["apiEndpoint"] as? String)
            ?? UseSenseConfig.defaultEndpoint

        let sdkConfig = UseSenseConfig(
            apiEndpoint: apiEndpoint,
            apiKey: apiKey,
            environment: environment,
            branding: brandingConfig
        )

        // Create (or replace) the client. If a previous client was
        // active, its event subscription is disposed before we
        // replace it so we don't accumulate stale listeners on
        // repeated initialize() calls.
        eventUnsubscribe?()
        eventUnsubscribe = nil

        let newClient = UseSense(config: sdkConfig)
        eventUnsubscribe = newClient.onEvent { [weak self] event in
            self?.emitEvent(event)
        }
        client = newClient

        resolve(nil)
    }

    @objc
    func startVerification(_ request: NSDictionary,
                           resolver resolve: @escaping RCTPromiseResolveBlock,
                           rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard let client = client else {
            reject("sdk_not_initialized",
                   "UseSense SDK is not initialized. Call initialize() first.",
                   nil)
            return
        }

        let sessionType: SessionType = (request["sessionType"] as? String) == "authentication"
            ? .authentication
            : .enrollment

        // The native iOS `VerificationRequest` takes an `AnyCodableValue`
        // map for metadata. RN can only pass plain JSON so we coerce
        // every value to a string — matches what the Flutter plugin
        // does over the Pigeon channel.
        let rawMetadata = request["metadata"] as? [String: Any]
        let metadata: [String: AnyCodableValue]? = rawMetadata?.mapValues { value in
            if let s = value as? String { return .string(s) }
            if let b = value as? Bool { return .bool(b) }
            if let i = value as? Int { return .int(i) }
            if let d = value as? Double { return .double(d) }
            return .string(String(describing: value))
        }

        let nativeRequest = VerificationRequest(
            sessionType: sessionType,
            externalUserId: request["externalUserId"] as? String,
            identityId: request["identityId"] as? String,
            metadata: metadata
        )

        DispatchQueue.main.async {
            guard let rootVC = Self.topmostViewController() else {
                reject("no_view_controller",
                       "No view controller available to present the camera UI.",
                       nil)
                return
            }

            let session = client.startVerification(request: nativeRequest)
            let vc = UseSenseViewController(session: session) { [weak rootVC] result in
                // The view controller dismisses itself on the main
                // thread before invoking this closure. We're safe to
                // resolve/reject directly without hopping.
                _ = rootVC
                switch result {
                case .success(let decision):
                    resolve(Self.redactedResultDict(decision))
                case .failure(let error):
                    if error.code == .userCancelled {
                        reject("session_cancelled",
                               "User cancelled the verification session.",
                               nil)
                    } else {
                        reject(Self.bridgeErrorCode(error.code),
                               error.message,
                               error)
                    }
                }
            }
            vc.modalPresentationStyle = .fullScreen
            rootVC.present(vc, animated: true)
        }
    }

    @objc
    func reset(_ resolve: @escaping RCTPromiseResolveBlock,
               rejecter reject: @escaping RCTPromiseRejectBlock) {
        eventUnsubscribe?()
        eventUnsubscribe = nil
        client?.reset()
        client = nil
        resolve(nil)
    }

    @objc
    func isInitialized(_ resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
        resolve(client != nil)
    }

    // MARK: - Private helpers

    private func emitEvent(_ event: UseSenseEvent) {
        guard hasListeners else { return }
        let eventTypeString = Self.eventTypeString(event.type)
        let body: [String: Any] = [
            "type": eventTypeString,
            "timestamp": Int64(event.timestamp.timeIntervalSince1970 * 1000),
            "data": event.data ?? [:]
        ]
        DispatchQueue.main.async { [weak self] in
            self?.sendEvent(withName: "UseSenseEvent", body: body)
        }
    }

    /// Maps the SDK's `RedactedDecisionObject` into the exact five-field
    /// dict the JS API exposes. Adding or returning anything beyond
    /// these five fields would leak internal scoring data through the
    /// bridge — do NOT add channel/liveness/matchsense scores here.
    private static func redactedResultDict(_ decision: RedactedDecisionObject) -> [String: Any] {
        return [
            "sessionId": decision.sessionId,
            "sessionType": decision.sessionType as Any,
            "identityId": decision.identityId as Any,
            "decision": decision.decision,
            "timestamp": decision.timestamp,
            // Convenience booleans computed on the native side so the
            // JS consumer doesn't have to string-compare decision codes.
            "isApproved": decision.isApproved,
            "isRejected": decision.isRejected,
            "isPendingReview": decision.isPendingReview
        ]
    }

    private static func bridgeErrorCode(_ code: UseSenseErrorCode) -> String {
        // Return the raw error code string (e.g. "NETWORK_ERROR"). JS
        // consumers can key off this via UseSenseError.code. Matches the
        // string-valued error codes the Flutter plugin emits.
        return code.rawValue
    }

    private static func eventTypeString(_ type: UseSenseEventType) -> String {
        // RN bridges typically emit UPPER_SNAKE_CASE event type strings.
        // Map the SDK's enum cases to the same canonical form the
        // Android bridge uses (event.type.name) so JS consumers can
        // switch on a single constant set regardless of platform.
        switch type {
        case .sessionCreated: return "SESSION_CREATED"
        case .permissionsRequested: return "PERMISSIONS_REQUESTED"
        case .permissionsGranted: return "PERMISSIONS_GRANTED"
        case .permissionsDenied: return "PERMISSIONS_DENIED"
        case .captureStarted: return "CAPTURE_STARTED"
        case .frameCaptured: return "FRAME_CAPTURED"
        case .captureCompleted: return "CAPTURE_COMPLETED"
        case .audioRecordStarted: return "AUDIO_RECORD_STARTED"
        case .audioRecordCompleted: return "AUDIO_RECORD_COMPLETED"
        case .challengeStarted: return "CHALLENGE_STARTED"
        case .challengeCompleted: return "CHALLENGE_COMPLETED"
        case .uploadStarted: return "UPLOAD_STARTED"
        case .uploadProgress: return "UPLOAD_PROGRESS"
        case .uploadCompleted: return "UPLOAD_COMPLETED"
        case .completeStarted: return "COMPLETE_STARTED"
        case .decisionReceived: return "DECISION_RECEIVED"
        case .imageQualityCheck: return "IMAGE_QUALITY_CHECK"
        case .error: return "ERROR"
        @unknown default: return "UNKNOWN"
        }
    }

    /// Walks the currently-presented view controller chain and returns
    /// the topmost one — which is the correct presenter for a new
    /// full-screen modal. `RCTPresentedViewController()` returns the
    /// currently-displayed VC which may itself be a modal, so we
    /// traverse to the leaf to avoid "already presenting" errors.
    private static func topmostViewController() -> UIViewController? {
        guard var top = UIApplication.shared.connectedScenes
            .compactMap({ ($0 as? UIWindowScene)?.keyWindow })
            .first?
            .rootViewController else {
            return RCTPresentedViewController()
        }
        while let presented = top.presentedViewController {
            top = presented
        }
        return top
    }
}
