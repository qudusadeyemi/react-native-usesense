import Foundation
import React
import UIKit
import UseSenseSDK

/// `<UseSenseView />` on iOS. A legacy view manager, so it also runs under
/// the New Architecture through React Native's interop layer.
@objc(RNUseSenseViewManager)
class RNUseSenseViewManager: RCTViewManager {
    override func view() -> UIView! {
        return UseSenseHostView()
    }

    override static func requiresMainQueueSetup() -> Bool {
        return true
    }
}

/// Hosts the SDK's `UseSenseViewController` as a child view controller of the
/// React screen. The controller (not the bare SwiftUI `UseSenseView`) is
/// embedded because it seeds the code-wins branding (appearance and copy)
/// for the capture screens.
///
/// The controller ends by calling `dismiss(animated:)` after it reports. As a
/// child inside a modally presented React screen that would dismiss the
/// host's screen, so the child is detached in the callback, before that call:
/// a controller with no parent and no presenter dismisses nothing.
class UseSenseHostView: UIView {

    /// Set once from JS: `{ kind: "request" | "token", ... }`.
    @objc var launch: NSDictionary?
    @objc var onUseSenseComplete: RCTDirectEventBlock?
    @objc var onUseSenseError: RCTDirectEventBlock?
    @objc var onUseSenseCancel: RCTDirectEventBlock?

    private var controller: UseSenseViewController?
    private var started = false
    /// A callback fired: nothing more reaches JS.
    private var settled = false

    override func didSetProps(_ changedProps: [String]!) {
        super.didSetProps(changedProps)
        maybeStart()
    }

    override func didMoveToWindow() {
        super.didMoveToWindow()
        if window != nil { maybeStart() }
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        controller?.view.frame = bounds
    }

    /// Starts once: when the launch prop is set and the view is in a window
    /// under a view controller.
    private func maybeStart() {
        guard let launch, !started, !settled, window != nil else { return }
        guard let parent = reactViewController() else { return }
        started = true

        let session: UseSenseSession
        let sessionType = UseSenseModule.sessionType(from: launch["sessionType"] as? String)
        switch launch["kind"] as? String {
        case "token":
            let token = ((launch["clientToken"] as? String) ?? "")
                .trimmingCharacters(in: .whitespacesAndNewlines)
            guard !token.isEmpty else {
                return emitError(code: "INVALID_CONFIG", message: "clientToken must not be blank")
            }
            session = UseSenseBridgeState.tokenClient()
                .createSessionWithToken(clientToken: token, sessionType: sessionType)
        case "request":
            guard let client = UseSenseBridgeState.client else {
                return emitError(code: "sdk_not_initialized",
                                 message: "UseSense SDK is not initialized. Call initialize() first.")
            }
            guard UseSenseBridgeState.hasApiKey else {
                return emitError(code: "INVALID_CONFIG",
                                 message: "No API key: pass apiKey to initialize(), or use clientToken")
            }
            session = client.startVerification(request: UseSenseModule.verificationRequest(from: launch))
        default:
            return emitError(code: "INVALID_CONFIG", message: "UseSenseView launch has no kind")
        }

        let vc = UseSenseViewController(session: session) { [weak self] result in
            self?.finish(result)
        }
        controller = vc
        parent.addChild(vc)
        vc.view.frame = bounds
        vc.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        addSubview(vc.view)
        vc.didMove(toParent: parent)
    }

    private func finish(_ result: Result<RedactedDecisionObject, UseSenseError>) {
        // Detach first: the controller calls dismiss(animated:) right after
        // this callback returns (see the type comment).
        detachController()
        guard !settled else { return }
        settled = true
        switch result {
        case .success(let decision):
            onUseSenseComplete?(UseSenseModule.redactedResultDict(decision))
        case .failure(let error) where error.code == .userCancelled:
            onUseSenseCancel?([:])
        case .failure(let error):
            onUseSenseError?(UseSenseModule.errorFields(error))
        }
    }

    private func emitError(code: String, message: String) {
        guard !settled else { return }
        settled = true
        onUseSenseError?(["code": code, "message": message, "isRetryable": false])
    }

    private func detachController() {
        guard let vc = controller else { return }
        controller = nil
        vc.willMove(toParent: nil)
        vc.view.removeFromSuperview()
        vc.removeFromParent()
    }

    deinit {
        // Unmounted mid-capture: take the capture off screen. No callback
        // reaches JS for a view that is gone.
        guard let vc = controller else { return }
        let detach = {
            vc.willMove(toParent: nil)
            vc.view.removeFromSuperview()
            vc.removeFromParent()
        }
        if Thread.isMainThread { detach() } else { DispatchQueue.main.async(execute: detach) }
    }
}
