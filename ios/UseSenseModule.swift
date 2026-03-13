import Foundation
import React
import UseSenseSDK

@objc(UseSenseModule)
class UseSenseModule: RCTEventEmitter {

    private var hasListeners = false

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
    func initialize(_ config: NSDictionary) {
        guard let apiKey = config["apiKey"] as? String else {
            return
        }

        let environment: UseSenseEnvironment = {
            switch config["environment"] as? String {
            case "production": return .production
            case "sandbox": return .sandbox
            default: return .sandbox
            }
        }()

        let useSenseConfig = UseSenseConfig(
            apiKey: apiKey,
            environment: environment,
            organizationId: config["organizationId"] as? String,
            sessionType: (config["sessionType"] as? String) == "authentication" ? .authentication : .enrollment,
            challengePolicy: {
                switch config["challengePolicy"] as? String {
                case "enhanced": return .enhanced
                case "adaptive": return .adaptive
                default: return .standard
                }
            }(),
            enableAudio: config["enableAudio"] as? Bool ?? false,
            timeout: config["timeout"] as? TimeInterval ?? 60000,
            metadata: config["metadata"] as? [String: String]
        )

        UseSense.initialize(config: useSenseConfig)
    }

    @objc
    func startSession(_ options: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            guard let viewController = RCTPresentedViewController() else {
                reject("no_view_controller", "No view controller available", nil)
                return
            }

            let sessionType: SessionType = (options["sessionType"] as? String) == "authentication" ? .authentication : .enrollment
            let identityId = options["identityId"] as? String

            UseSense.startSession(
                from: viewController,
                sessionType: sessionType,
                identityId: identityId
            ) { result in
                switch result {
                case .success(let useSenseResult):
                    let resultDict: [String: Any] = [
                        "sessionId": useSenseResult.sessionId,
                        "decision": useSenseResult.decision.rawValue,
                        "channelTrustScore": useSenseResult.channelTrustScore,
                        "livenessScore": useSenseResult.livenessScore,
                        "matchSenseRiskScore": useSenseResult.matchSenseRiskScore,
                        "presenceConfidence": useSenseResult.presenceConfidence,
                        "reasons": useSenseResult.reasons,
                        "ruleTriggered": useSenseResult.ruleTriggered as Any,
                        "recommendedAction": useSenseResult.recommendedAction as Any,
                        "sessionSignature": useSenseResult.sessionSignature,
                    ]
                    resolve(resultDict)

                case .failure(let error):
                    reject(error.code, error.message, nil)
                }
            }
        }
    }

    @objc
    func cancelSession(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        UseSense.cancelSession()
        resolve(nil)
    }

    @objc
    func getSessionStatus(_ sessionId: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        UseSense.getSessionStatus(sessionId: sessionId) { result in
            switch result {
            case .success(let status):
                var dict: [String: Any] = ["status": status.status]
                if let r = status.result {
                    dict["result"] = [
                        "sessionId": r.sessionId,
                        "decision": r.decision.rawValue,
                        "channelTrustScore": r.channelTrustScore,
                        "livenessScore": r.livenessScore,
                        "matchSenseRiskScore": r.matchSenseRiskScore,
                        "presenceConfidence": r.presenceConfidence,
                        "reasons": r.reasons,
                        "sessionSignature": r.sessionSignature,
                    ]
                }
                resolve(dict)
            case .failure(let error):
                reject(error.code, error.message, nil)
            }
        }
    }

    @objc
    func subscribeToEvents() {
        UseSense.onEvent { [weak self] event in
            guard let self = self, self.hasListeners else { return }
            self.sendEvent(withName: "UseSenseEvent", body: event.toDictionary())
        }
    }

    @objc
    func unsubscribeFromEvents() {
        UseSense.removeEventListener()
    }

    @objc
    func getSdkVersion() -> String {
        return UseSense.sdkVersion
    }

    @objc
    override static func requiresMainQueueSetup() -> Bool {
        return false
    }
}
