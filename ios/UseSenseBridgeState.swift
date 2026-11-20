import Foundation
import UseSenseSDK

/// What `UseSense.initialize` set up, shared by the module and the
/// `<UseSenseView />` view manager (React Native creates them separately).
enum UseSenseBridgeState {
    /// The client `initialize` created; nil before it and after `reset`.
    static var client: UseSense?
    /// The config `initialize` built (remote flows take it directly).
    static var config: UseSenseConfig?

    /// Client-token starts need no `initialize`. Without it they run on this
    /// default client (no key, SDK defaults), whose events still reach JS.
    private static var defaultTokenClient: UseSense?

    static var hasApiKey: Bool { !(config?.apiKey.isEmpty ?? true) }

    /// The client a client-token session runs on: `initialize`'s when there
    /// is one (its endpoint, environment, branding and options apply, not its
    /// key), else a default one.
    static func tokenClient() -> UseSense {
        if let client { return client }
        if let defaultTokenClient { return defaultTokenClient }
        let fallback = UseSense(config: UseSenseConfig(apiKey: ""))
        fallback.onEvent { event in UseSenseModule.current?.emitEvent(event) }
        defaultTokenClient = fallback
        return fallback
    }
}
