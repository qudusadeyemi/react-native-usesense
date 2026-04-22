//
//  V4BridgeDelegate.swift
//  react-native-usesense
//
//  Phase 1 ticket R-1. Adapter that translates LiveSenseV4Delegate
//  callbacks into React Native promise resolve/reject + bridge events.
//

import Foundation
import UseSenseSDK

final class V4BridgeDelegate: NSObject, LiveSenseV4Delegate {
    private let resolve: (Any?) -> Void
    private let reject: (String, String?, Error?) -> Void
    private let emit: ([String: Any]) -> Void
    private var strongSession: LiveSenseV4Session?
    private var didFinish = false

    init(resolve: @escaping (Any?) -> Void,
         reject: @escaping (String, String?, Error?) -> Void,
         emit: @escaping ([String: Any]) -> Void) {
        self.resolve = resolve
        self.reject = reject
        self.emit = emit
    }

    func retain(_ session: LiveSenseV4Session) {
        strongSession = session
    }

    func sessionDidComplete(verdict: V4Verdict) {
        if didFinish { return }
        didFinish = true
        let body: [String: Any?] = [
            "session_id": verdict.sessionId,
            "verdict": verdict.verdict.rawValue,
            "confidence": verdict.confidence.rawValue,
            "assurance_level_achieved": verdict.assuranceLevelAchieved,
            "capture_channel": "rn",
            "match_sense_embedding_id": verdict.matchSenseEmbeddingId,
            "timestamp": verdict.timestamp
        ]
        resolve(body.compactMapValues { $0 })
        strongSession = nil
    }

    func sessionDidFail(error: Error) {
        if didFinish { return }
        didFinish = true
        reject("V4_FAILED", error.localizedDescription, error)
        strongSession = nil
    }

    func sessionPhaseDidChange(phase: LiveSenseV4Phase) {
        let body: [String: Any] = [
            "type": "V4_PHASE_CHANGE",
            "phase": phase.rawValue,
            "timestamp": Int64(Date().timeIntervalSince1970 * 1000)
        ]
        emit(body)
    }
}
