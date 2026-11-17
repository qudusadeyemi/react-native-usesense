import Foundation
import React
import UseSenseSDK

/// React Native bridge for the headless silent device check
/// (`UseSense.deviceCheck(config:)`). JS methods `start(handle, config)`,
/// `finish(handle, config)` and `dispose(handle)`.
///
/// The first call for a handle creates the native `UseSenseDeviceCheck`; later
/// calls reuse it (start and finish must run on the same instance). The Promise
/// always resolves with `{ok, phase, error?}`, never rejects.
@objc(UseSenseDeviceCheckModule)
class UseSenseDeviceCheckModule: NSObject {
    private var checks: [String: UseSenseDeviceCheck] = [:]
    private let lock = NSLock()

    @objc
    static func requiresMainQueueSetup() -> Bool { false }

    @objc
    func start(_ handle: String?,
               config: NSDictionary?,
               resolver resolve: @escaping RCTPromiseResolveBlock,
               rejecter reject: @escaping RCTPromiseRejectBlock) {
        run(phase: "start", handle: handle, config: config, resolve: resolve)
    }

    @objc
    func finish(_ handle: String?,
                config: NSDictionary?,
                resolver resolve: @escaping RCTPromiseResolveBlock,
                rejecter reject: @escaping RCTPromiseRejectBlock) {
        run(phase: "finish", handle: handle, config: config, resolve: resolve)
    }

    @objc
    func dispose(_ handle: String?) {
        guard let handle = handle else { return }
        lock.lock()
        checks.removeValue(forKey: handle)
        lock.unlock()
    }

    private func run(phase: String, handle: String?, config: NSDictionary?, resolve: @escaping RCTPromiseResolveBlock) {
        guard let handle = handle, !handle.isEmpty, let config = config else {
            resolve(Self.failure(phase: phase, code: "invalid_config", message: "The device check is not set up (no handle or config)"))
            return
        }
        lock.lock()
        let check: UseSenseDeviceCheck
        if let existing = checks[handle] {
            check = existing
        } else {
            let base = (config["apiBaseUrl"] as? String).flatMap(URL.init(string:)) ?? DeviceCheckConfig.defaultBaseURL
            let timeout = (config["timeoutMs"] as? NSNumber).map { $0.doubleValue / 1000 } ?? DeviceCheckConfig.defaultRequestTimeout
            check = UseSense.deviceCheck(config: DeviceCheckConfig(
                deviceCheckId: (config["deviceCheckId"] as? String) ?? "",
                token: (config["token"] as? String) ?? "",
                nonce: (config["nonce"] as? String) ?? "",
                baseURL: base,
                requestTimeout: timeout
            ))
            checks[handle] = check
        }
        lock.unlock()

        let done: (DeviceCheckResult) -> Void = { r in resolve(Self.toMap(r, phase: phase)) }
        if phase == "start" {
            check.start(completion: done)
        } else {
            check.finish(completion: done)
        }
    }

    private static func toMap(_ r: DeviceCheckResult, phase: String) -> [String: Any] {
        switch r {
        case .received(let p):
            return ["ok": true, "phase": p.rawValue]
        case .failed(let e):
            var error: [String: Any] = [
                "code": e.code.rawValue,
                "message": e.message,
                "retryable": e.isRetryable,
            ]
            if let s = e.serverCode { error["serverCode"] = s }
            if let h = e.httpStatus { error["httpStatus"] = h }
            return ["ok": false, "phase": phase, "error": error]
        }
    }

    private static func failure(phase: String, code: String, message: String) -> [String: Any] {
        ["ok": false, "phase": phase, "error": ["code": code, "message": message, "retryable": false]]
    }
}
