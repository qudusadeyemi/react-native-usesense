import Foundation
import React
import UseSenseSDK

// ---------------------------------------------------------------------------
// MARK: - UseSenseModule
// ---------------------------------------------------------------------------
//
// React Native bridge for the UseSense iOS SDK.
// Supports both TurboModules (New Architecture) and legacy Bridge.
//
// The native SDK manages its own camera UI (UseSenseViewController) which is
// presented modally over the app's root view controller. This module only
// marshals configuration/request data from JS and returns results via promises.
// ---------------------------------------------------------------------------

@objc(UseSenseModule)
class UseSenseModule: RCTEventEmitter {

  // MARK: - State

  private var isListening = false
  private var sdk: UseSense?
  private var eventUnsubscribe: (() -> Void)?

  // MARK: - RCTEventEmitter overrides

  override static func moduleName() -> String! {
    return "UseSenseModule"
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  override func supportedEvents() -> [String]! {
    return ["UseSenseEvent"]
  }

  // MARK: - Initialize

  @objc
  func initialize(_ config: NSDictionary) {
    guard let apiKey = config["apiKey"] as? String, !apiKey.isEmpty else {
      NSLog("[UseSenseModule] Error: apiKey is required in initialize()")
      return
    }

    let environment = config["environment"] as? String
    let baseUrl = config["baseUrl"] as? String
    let gatewayKey = config["gatewayKey"] as? String
    let primaryColor = config["primaryColor"] as? String
    let buttonRadius = config["buttonRadius"] as? NSNumber
    let logoUrl = config["logoUrl"] as? String
    let fontFamily = config["fontFamily"] as? String

    // Build branding config if any branding props are provided
    var branding: BrandingConfig?
    if primaryColor != nil || buttonRadius != nil || logoUrl != nil || fontFamily != nil {
      var b = BrandingConfig()
      if let c = primaryColor { b.primaryColor = c }
      if let r = buttonRadius { b.buttonRadius = CGFloat(r.doubleValue) }
      b.logoUrl = logoUrl
      b.fontFamily = fontFamily
      branding = b
    }

    // Map environment string to SDK enum
    var env: Environment?
    switch environment {
    case "sandbox":    env = .sandbox
    case "production": env = .production
    default:           env = .auto
    }

    var sdkConfig: UseSenseConfig
    if let baseUrl = baseUrl {
      sdkConfig = UseSenseConfig(
        apiEndpoint: baseUrl,
        apiKey: apiKey,
        gatewayKey: gatewayKey ?? UseSenseConfig.defaultGatewayKey,
        environment: env,
        branding: branding
      )
    } else {
      sdkConfig = UseSenseConfig(
        apiKey: apiKey,
        gatewayKey: gatewayKey ?? UseSenseConfig.defaultGatewayKey,
        environment: env,
        branding: branding
      )
    }

    sdk = UseSense(config: sdkConfig)

    NSLog("[UseSenseModule] SDK initialized (env=\(environment ?? "auto"))")
  }

  // MARK: - Start Verification

  @objc
  func startVerification(
    _ request: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let sdk = sdk else {
      reject("NOT_INITIALIZED", "UseSense SDK has not been initialized. Call initialize() first.", nil)
      return
    }

    guard let sessionTypeStr = request["sessionType"] as? String else {
      reject("INVALID_REQUEST", "sessionType is required.", nil)
      return
    }

    let sessionType: SessionType = sessionTypeStr == "authentication" ? .authentication : .enrollment
    let externalUserId = request["externalUserId"] as? String
    let identityId = request["identityId"] as? String
    let metadataJson = request["metadata"] as? String

    // Parse metadata JSON string into [String: AnyCodableValue]
    var metadata: [String: AnyCodableValue]?
    if let json = metadataJson,
       let data = json.data(using: .utf8),
       let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
      var converted = [String: AnyCodableValue]()
      for (key, value) in dict {
        switch value {
        case let s as String:  converted[key] = .string(s)
        case let i as Int:     converted[key] = .int(i)
        case let d as Double:  converted[key] = .double(d)
        case let b as Bool:    converted[key] = .bool(b)
        default:               converted[key] = .string(String(describing: value))
        }
      }
      metadata = converted
    }

    let verificationRequest = VerificationRequest(
      sessionType: sessionType,
      externalUserId: externalUserId,
      identityId: identityId,
      metadata: metadata
    )

    let session = sdk.startVerification(request: verificationRequest)

    DispatchQueue.main.async {
      guard let rootVC = self.rootViewController() else {
        reject("NO_ROOT_VC", "Could not find root view controller to present verification UI.", nil)
        return
      }

      let vc = UseSenseViewController(session: session) { result in
        rootVC.dismiss(animated: true)

        switch result {
        case .success(let decision):
          resolve([
            "sessionId": decision.sessionId,
            "sessionType": decision.sessionType as Any,
            "identityId": decision.identityId as Any,
            "decision": decision.decision,
            "timestamp": decision.timestamp,
            "isApproved": decision.isApproved,
            "isRejected": decision.isRejected,
            "isPendingReview": decision.isPendingReview,
          ] as [String: Any])

        case .failure(let error):
          let code = error.code.rawValue
          if code == UseSenseErrorCode.userCancelled.rawValue {
            reject("CANCELLED", "User cancelled the verification.", nil)
          } else {
            reject(
              code,
              error.message,
              NSError(
                domain: "UseSenseSDK",
                code: 0,
                userInfo: [
                  "code": code,
                  "isRetryable": error.isRetryable,
                  "details": error.details ?? "",
                ]
              )
            )
          }
        }
      }

      vc.modalPresentationStyle = .fullScreen
      rootVC.present(vc, animated: true)
    }
  }

  // MARK: - Is Initialized

  @objc
  func isInitialized(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    resolve(sdk != nil)
  }

  // MARK: - Reset

  @objc
  func reset() {
    eventUnsubscribe?()
    eventUnsubscribe = nil
    sdk?.reset()
    sdk = nil
    NSLog("[UseSenseModule] SDK state reset")
  }

  // MARK: - Event subscriptions

  @objc
  func subscribeToEvents() {
    guard let sdk = sdk else { return }

    isListening = true

    // Remove previous subscription if any
    eventUnsubscribe?()

    eventUnsubscribe = sdk.onEvent { [weak self] event in
      self?.emitSdkEvent(event)
    }
  }

  @objc
  func unsubscribeFromEvents() {
    isListening = false
    eventUnsubscribe?()
    eventUnsubscribe = nil
  }

  @objc override func addListener(_ eventName: String!) {
    super.addListener(eventName)
  }

  @objc override func removeListeners(_ count: Double) {
    super.removeListeners(count)
  }

  // MARK: - Helpers

  private func emitSdkEvent(_ event: UseSenseEvent) {
    guard isListening else { return }

    let typeString = mapEventType(event.type)
    var payload: [String: Any] = [
      "type": typeString,
      "timestamp": event.timestamp.timeIntervalSince1970 * 1000,
    ]
    if let data = event.data {
      payload["data"] = data
    }
    sendEvent(withName: "UseSenseEvent", body: payload)
  }

  private func mapEventType(_ type: UseSenseEventType) -> String {
    switch type {
    case .sessionCreated:       return "SESSION_CREATED"
    case .permissionsRequested: return "PERMISSIONS_REQUESTED"
    case .permissionsGranted:   return "PERMISSIONS_GRANTED"
    case .permissionsDenied:    return "PERMISSIONS_DENIED"
    case .captureStarted:       return "CAPTURE_STARTED"
    case .frameCaptured:        return "FRAME_CAPTURED"
    case .captureCompleted:     return "CAPTURE_COMPLETED"
    case .audioRecordStarted:   return "AUDIO_RECORD_STARTED"
    case .audioRecordCompleted: return "AUDIO_RECORD_COMPLETED"
    case .challengeStarted:     return "CHALLENGE_STARTED"
    case .challengeCompleted:   return "CHALLENGE_COMPLETED"
    case .uploadStarted:        return "UPLOAD_STARTED"
    case .uploadProgress:       return "UPLOAD_PROGRESS"
    case .uploadCompleted:      return "UPLOAD_COMPLETED"
    case .completeStarted:      return "COMPLETE_STARTED"
    case .decisionReceived:     return "DECISION_RECEIVED"
    case .imageQualityCheck:    return "IMAGE_QUALITY_CHECK"
    case .error:                return "ERROR"
    @unknown default:           return "UNKNOWN"
    }
  }

  private func rootViewController() -> UIViewController? {
    var rootVC: UIViewController?
    if #available(iOS 15.0, *) {
      rootVC = UIApplication.shared.connectedScenes
        .compactMap { $0 as? UIWindowScene }
        .flatMap { $0.windows }
        .first { $0.isKeyWindow }?
        .rootViewController
    } else {
      rootVC = UIApplication.shared.keyWindow?.rootViewController
    }
    // Walk to the topmost presented controller
    while let presented = rootVC?.presentedViewController {
      rootVC = presented
    }
    return rootVC
  }
}
