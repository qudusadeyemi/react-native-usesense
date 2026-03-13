import { NativeModules, NativeEventEmitter } from 'react-native';

const { UseSenseModule } = NativeModules;

if (!UseSenseModule) {
  throw new Error(
    'react-native-usesense: NativeModule not found. Make sure you have linked the library correctly.\n' +
      'iOS: Run `cd ios && pod install`\n' +
      'Android: Rebuild the app after installing the package.',
  );
}

// ─── Types ───────────────────────────────────────────────────────────

/** Environment for the UseSense API. */
export type UseSenseEnvironment = 'production' | 'sandbox';

/** Session type for verification. */
export type SessionType = 'enrollment' | 'authentication';

/** Challenge policy controlling verification difficulty. */
export type ChallengePolicy = 'standard' | 'enhanced' | 'adaptive';

/** Decision returned by the verification engine. */
export type UseSenseDecision = 'approved' | 'rejected' | 'manual_review';

/** Processing stage during server-side analysis. */
export type ProcessingStage = 'deepsense' | 'livesense' | 'matchsense' | 'fusion';

/**
 * Configuration for initializing the UseSense plugin.
 *
 * @example
 * ```ts
 * await UseSense.initialize({
 *   apiKey: 'your_api_key',
 *   environment: 'sandbox',
 * });
 * ```
 */
export interface UseSenseConfig {
  /** API key from the UseSense dashboard. */
  apiKey: string;
  /** Target environment. Defaults to `'sandbox'`. */
  environment?: UseSenseEnvironment;
  /** Your organization ID (optional, inferred from API key). */
  organizationId?: string;
  /** Default session type. Defaults to `'enrollment'`. */
  sessionType?: SessionType;
  /** Identity ID for authentication sessions. */
  identityId?: string;
  /** Challenge difficulty policy. Defaults to `'standard'`. */
  challengePolicy?: ChallengePolicy;
  /** Enable audio capture for voice deepfake detection. Defaults to `false`. */
  enableAudio?: boolean;
  /** Maximum session duration in milliseconds. Defaults to `60000`. */
  timeout?: number;
  /** Custom key-value pairs attached to the session. */
  metadata?: Record<string, string>;
}

/**
 * Result returned when a verification session completes.
 *
 * **Important:** This result is for UI feedback only.
 * The definitive verdict arrives at your backend via HMAC-signed webhook.
 */
export interface UseSenseResult {
  /** Unique session identifier. */
  sessionId: string;
  /** Verification decision. */
  decision: UseSenseDecision;
  /** DeepSense channel trust score (0-100). */
  channelTrustScore: number;
  /** LiveSense liveness score (0-100). */
  livenessScore: number;
  /** MatchSense risk score (0-100). Lower is better. */
  matchSenseRiskScore: number;
  /** Fused presence confidence score (0-100). */
  presenceConfidence: number;
  /** Reasons contributing to the decision. */
  reasons: string[];
  /** Rule that triggered the decision, if any. */
  ruleTriggered?: string;
  /** Recommended action for the integrator. */
  recommendedAction?: string;
  /** Cryptographic signature for result verification. */
  sessionSignature: string;
}

/**
 * Error returned when a verification session fails.
 */
export interface UseSenseError {
  /** Machine-readable error code. */
  code: string;
  /** Human-readable error message. */
  message: string;
  /** Additional error details. */
  details?: Record<string, any>;
}

/**
 * Events emitted during the verification session lifecycle.
 */
export type UseSenseEvent =
  | { type: 'session_started'; sessionId: string }
  | { type: 'challenge_presented'; challengeType: string }
  | { type: 'challenge_completed'; challengeType: string }
  | { type: 'processing'; stage: ProcessingStage }
  | { type: 'session_completed'; result: UseSenseResult }
  | { type: 'session_error'; error: UseSenseError };

/** Options for starting a verification session. */
export interface StartSessionOptions {
  /** Session type. Overrides the value set in {@link UseSenseConfig}. */
  sessionType?: SessionType;
  /** Identity ID for authentication sessions. */
  identityId?: string;
}

/** Status of a verification session. */
export interface SessionStatus {
  /** Current session status. */
  status: string;
  /** Result, if the session has completed. */
  result?: UseSenseResult;
}

/** Subscription handle returned by {@link UseSense.addListener}. */
export interface UseSenseSubscription {
  /** Remove the event listener. */
  remove: () => void;
}

// ─── Implementation ──────────────────────────────────────────────────

const eventEmitter = new NativeEventEmitter(UseSenseModule);

/**
 * UseSense React Native plugin.
 *
 * Provides human presence verification by wrapping the native UseSense
 * iOS and Android SDKs into a single cross-platform API.
 *
 * @example
 * ```ts
 * import { UseSense } from 'react-native-usesense';
 *
 * await UseSense.initialize({ apiKey: 'your_key', environment: 'sandbox' });
 * const result = await UseSense.startSession({ sessionType: 'enrollment' });
 * console.log(result.decision);
 * ```
 */
export class UseSense {
  /**
   * Initialize the UseSense plugin. Must be called once before any other method.
   *
   * @param config - Plugin configuration including API key and environment.
   * @throws {UseSenseError} If the API key is invalid or configuration is malformed.
   */
  static async initialize(config: UseSenseConfig): Promise<void> {
    if (!config.apiKey) {
      throw { code: 'invalid_config', message: 'apiKey is required' } as UseSenseError;
    }
    return UseSenseModule.initialize({
      apiKey: config.apiKey,
      environment: config.environment ?? 'sandbox',
      organizationId: config.organizationId,
      sessionType: config.sessionType ?? 'enrollment',
      identityId: config.identityId,
      challengePolicy: config.challengePolicy ?? 'standard',
      enableAudio: config.enableAudio ?? false,
      timeout: config.timeout ?? 60000,
      metadata: config.metadata,
    });
  }

  /**
   * Start a verification session. Presents a full-screen native camera UI.
   *
   * The returned promise resolves when the session completes and the modal
   * dismisses, or rejects if an error occurs.
   *
   * @param options - Optional overrides for session type and identity ID.
   * @returns The verification result (for UI feedback only).
   * @throws {UseSenseError} On failure or cancellation.
   */
  static async startSession(options?: StartSessionOptions): Promise<UseSenseResult> {
    return UseSenseModule.startSession(options ?? {});
  }

  /**
   * Cancel an in-progress verification session.
   *
   * The camera UI is dismissed and the `startSession` promise rejects
   * with a `session_cancelled` error.
   */
  static async cancelSession(): Promise<void> {
    return UseSenseModule.cancelSession();
  }

  /**
   * Get the status of a verification session by ID.
   *
   * @param sessionId - The session ID to query.
   * @returns The current status and optional result.
   */
  static async getSessionStatus(sessionId: string): Promise<SessionStatus> {
    return UseSenseModule.getSessionStatus(sessionId);
  }

  /**
   * Subscribe to real-time events during the verification lifecycle.
   *
   * Call this before `startSession()` to receive all events.
   *
   * @param callback - Function invoked for each event.
   * @returns A subscription handle with a `remove()` method.
   *
   * @example
   * ```ts
   * const listener = UseSense.addListener((event) => {
   *   console.log(event.type);
   * });
   * // Later:
   * listener.remove();
   * ```
   */
  static addListener(callback: (event: UseSenseEvent) => void): UseSenseSubscription {
    UseSenseModule.subscribeToEvents();
    const subscription = eventEmitter.addListener('UseSenseEvent', callback);
    return {
      remove: () => {
        subscription.remove();
        UseSenseModule.unsubscribeFromEvents();
      },
    };
  }

  /**
   * Get the native SDK version string.
   *
   * @returns Version string in semver format (e.g. `"1.0.0"`).
   */
  static getSdkVersion(): string {
    return UseSenseModule.getSdkVersion();
  }
}

export default UseSense;
