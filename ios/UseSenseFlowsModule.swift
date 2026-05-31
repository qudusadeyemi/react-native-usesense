import Foundation
import React
import UseSenseSDK

/// React Native bridge for the UseSense iOS Flows runner.
///
/// Exposes a single JS-callable method, `runFlow`, that forwards into the
/// native `UseSenseFlows.run(flowRunId:sdkToken:from:completion:)` entry
/// point and resolves the Promise with a `FlowRunResult` map. On failure the
/// Promise rejects with the SDK's `FlowError.Code.rawValue` as the JS error
/// code, mirroring the taxonomy host apps catch on every other surface.
///
/// Sits alongside `UseSenseModule` (Sessions); the existing module is
/// untouched. Sessions and Flows coexist — host apps pick one per call.
@objc(UseSenseFlowsModule)
class UseSenseFlowsModule: NSObject {

    @objc
    static func requiresMainQueueSetup() -> Bool {
        // Presentation work happens in `runFlow` after the JS call dispatches
        // back to main via `DispatchQueue.main`. The module itself has no
        // initialisation that must run on the main queue.
        return false
    }

    /// `runFlow(flowRunId, sdkToken, apiBaseUrl?, resolve, reject)` — Promise.
    /// The SDK takes care of presentation; we just resolve when the run
    /// reaches a terminal state.
    @objc
    func runFlow(_ flowRunId: String,
                 sdkToken: String,
                 apiBaseUrl: String?,
                 resolver resolve: @escaping RCTPromiseResolveBlock,
                 rejecter reject: @escaping RCTPromiseRejectBlock) {
        let baseString = apiBaseUrl ?? "https://api.usesense.ai"
        guard let baseURL = URL(string: baseString) else {
            reject("unknown", "Invalid apiBaseUrl: \(baseString)", nil)
            return
        }
        DispatchQueue.main.async {
            guard let presenter = Self.topViewController() else {
                reject("unknown", "No view controller to present from", nil)
                return
            }
            UseSenseFlows.run(
                flowRunId: flowRunId,
                sdkToken: sdkToken,
                apiBaseURL: baseURL,
                from: presenter
            ) { runResult in
                switch runResult {
                case .success(let r):
                    resolve([
                        "flowRunId": r.flowRunId,
                        "state": Self.stateWire(r.state),
                        "outcome": r.outcome.map(Self.outcomeWire) as Any,
                    ])
                case .failure(let e):
                    reject(e.code.rawValue, e.message, nil)
                }
            }
        }
    }

    // MARK: - Helpers (mirror UseSenseFlowsBridge in the Flutter plugin)

    private static func stateWire(_ state: FlowRunState) -> String {
        switch state {
        case .pending: return "pending"
        case .inProgress: return "in_progress"
        case .stalled: return "stalled"
        case .awaitingReview: return "awaiting_review"
        case .completed: return "completed"
        case .errored: return "errored"
        case .abandoned: return "abandoned"
        case .cancelled: return "cancelled"
        }
    }

    private static func outcomeWire(_ outcome: FlowOutcome) -> String {
        switch outcome {
        case .approve: return "APPROVE"
        case .reject: return "REJECT"
        case .manualReview: return "MANUAL_REVIEW"
        }
    }

    /// Find the top-most view controller to present from. Mirrors the
    /// pattern used elsewhere in the bridge layer; works across UIKit +
    /// SceneDelegate apps and falls back to `keyWindow.rootViewController`.
    private static func topViewController() -> UIViewController? {
        var root: UIViewController?
        if #available(iOS 13.0, *) {
            for scene in UIApplication.shared.connectedScenes {
                guard let windowScene = scene as? UIWindowScene else { continue }
                if let keyWindow = windowScene.windows.first(where: { $0.isKeyWindow }) ?? windowScene.windows.first {
                    root = keyWindow.rootViewController
                    break
                }
            }
        }
        if root == nil {
            root = UIApplication.shared.keyWindow?.rootViewController
        }
        var current = root
        while let presented = current?.presentedViewController {
            current = presented
        }
        return current
    }
}
