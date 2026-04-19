import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const LINKING_ERROR =
  `react-native-usesense: the native module could not be found.\n\n` +
  Platform.select({
    ios: `iOS: run \`cd ios && pod install\` and rebuild the app.`,
    android: `Android: rebuild the app after installing the package.`,
    default: '',
  }) +
  `\n\nIf you're using Expo, the plugin must be consumed through a development build; it does not support Expo Go because it wraps a native camera SDK.`;

const UseSenseModule = NativeModules.UseSenseModule;

if (!UseSenseModule) {
  throw new Error(LINKING_ERROR);
}

// ─── Types ───────────────────────────────────────────────────────────────

/**
 * Target environment for the UseSense API. `auto` asks the native SDK
 * to detect from the API key prefix (`sk_sandbox_*` → sandbox,
 * `sk_prod_*` → production).
 */
export type UseSenseEnvironment = 'sandbox' | 'production' | 'auto';

/** Type of verification session. */
export type SessionType = 'enrollment' | 'authentication';

/**
 * Decision returned by the native SDK.
 *
 * These values come straight from the server's verdict and are
 * exposed to the integrator for UI feedback only. The definitive
 * verdict arrives at your backend via an HMAC-signed webhook; never
 * trust the client-side decision for access-control.
 */
export type Decision = 'APPROVE' | 'REJECT' | 'MANUAL_REVIEW';

/**
 * Branding overrides applied to the native camera UI.
 *
 * - `logoUrl`, `primaryColor`, `buttonRadius`, `fontFamily` are
 *   honoured on both iOS and Android.
 * - `displayName`, `redirectUrl` are Android-only fields. They're
 *   accepted on iOS for cross-platform API parity but ignored.
 */
export interface BrandingConfig {
  logoUrl?: string;
  primaryColor?: string;
  buttonRadius?: number;
  fontFamily?: string;
  displayName?: string;
  redirectUrl?: string;
}

/**
 * Configuration for `UseSense.initialize`. The minimum required
 * field is the API key; every other field has a sensible default.
 */
export interface UseSenseConfig {
  /** API key from watchtower.usesense.ai. */
  apiKey: string;
  /** Target environment. Defaults to `auto` (detected from key prefix). */
  environment?: UseSenseEnvironment;
  /**
   * Override the API endpoint. Defaults to `https://api.usesense.ai/v1`.
   * Only set this if you're pointing at a staging or self-hosted
   * proxy. Maps to `apiEndpoint` on iOS and `baseUrl` on Android
   * under the hood.
   */
  apiEndpoint?: string;
  /** SDK-level branding overrides. */
  branding?: BrandingConfig;
}

/**
 * Request to start a verification session.
 */
export interface VerificationRequest {
  sessionType: SessionType;
  /** Your internal user identifier (optional, stored in session metadata). */
  externalUserId?: string;
  /**
   * Required for `authentication` sessions. The previously-enrolled
   * identity you're verifying against.
   */
  identityId?: string;
  /** Custom key-value pairs attached to the session. */
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Redacted decision object returned when a session completes.
 *
 * This is the ONLY shape the plugin exposes to React Native. Pillar
 * scores (channel trust, liveness, matchsense risk) are intentionally
 * not included — the native SDKs strip those fields before returning
 * across the bridge to prevent reverse-engineering of the server-side
 * scoring logic. If you need full scoring details, consume the signed
 * webhook delivered to your backend.
 */
export interface UseSenseResult {
  sessionId: string;
  sessionType: string | null;
  identityId: string | null;
  decision: Decision;
  timestamp: string;
  /** Convenience: `decision === 'APPROVE'`. */
  isApproved: boolean;
  /** Convenience: `decision === 'REJECT'`. */
  isRejected: boolean;
  /** Convenience: `decision === 'MANUAL_REVIEW'`. */
  isPendingReview: boolean;
}

/**
 * Error thrown when a verification session fails.
 *
 * Matches the native SDKs' error shape: machine-readable code,
 * human-readable message, retry hint.
 */
export interface UseSenseError {
  /**
   * Machine-readable error code. One of
   * `CAMERA_UNAVAILABLE`, `CAMERA_PERMISSION_DENIED`,
   * `MIC_PERMISSION_DENIED`, `NETWORK_ERROR`, `NETWORK_TIMEOUT`,
   * `SESSION_EXPIRED`, `UNAUTHORIZED`, `INVALID_TOKEN`,
   * `SESSION_NOT_FOUND`, `IDENTITY_NOT_FOUND`, `INVALID_REQUEST`,
   * `INVALID_CONFIG`, `QUOTA_EXCEEDED`, `USER_CANCELLED`,
   * `session_cancelled`, `sdk_not_initialized`, `no_view_controller`,
   * `CAPTURE_FAILED`, `ENCODING_FAILED`, `UPLOAD_FAILED`,
   * `FACE_NOT_DETECTED`, `LOW_LIGHT`, `TIMEOUT`, `SERVER_ERROR`,
   * `SERVICE_UNAVAILABLE`, `TOKEN_EXPIRED`, `TOKEN_ALREADY_USED`,
   * `INSUFFICIENT_CREDITS`, `NONCE_MISMATCH`, `UNKNOWN_ERROR`.
   */
  code: string;
  /** Human-readable error message. */
  message: string;
  /** Whether the operation can be retried. */
  isRetryable?: boolean;
  /** Server-specific error code, if any. */
  serverCode?: string;
}

/**
 * Lifecycle event types emitted by the native SDK during a
 * verification session.
 */
export type UseSenseEventType =
  | 'SESSION_CREATED'
  | 'PERMISSIONS_REQUESTED'
  | 'PERMISSIONS_GRANTED'
  | 'PERMISSIONS_DENIED'
  | 'CAPTURE_STARTED'
  | 'FRAME_CAPTURED'
  | 'CAPTURE_COMPLETED'
  | 'AUDIO_RECORD_STARTED'
  | 'AUDIO_RECORD_COMPLETED'
  | 'CHALLENGE_STARTED'
  | 'CHALLENGE_COMPLETED'
  | 'UPLOAD_STARTED'
  | 'UPLOAD_PROGRESS'
  | 'UPLOAD_COMPLETED'
  | 'COMPLETE_STARTED'
  | 'DECISION_RECEIVED'
  | 'IMAGE_QUALITY_CHECK'
  | 'ERROR'
  | 'UNKNOWN';

/** Single event emitted during a session. */
export interface UseSenseEvent {
  type: UseSenseEventType;
  /** Unix epoch milliseconds. */
  timestamp: number;
  /** Event-specific payload. Opaque strings; never contains scoring data. */
  data?: Record<string, string>;
}

/** Handle returned by `UseSense.addListener`. */
export interface UseSenseSubscription {
  remove(): void;
}

// ─── Implementation ──────────────────────────────────────────────────────

const eventEmitter = new NativeEventEmitter(UseSenseModule);

/**
 * UseSense React Native plugin.
 *
 * Human presence verification wrapping the native iOS and Android
 * UseSense SDKs. Every session runs inside a full-screen native
 * camera activity; the plugin is a thin bridge that forwards
 * initialization, verification requests, and lifecycle events to
 * the platform SDK and returns a redacted decision object.
 *
 * @example
 * ```ts
 * import { UseSense } from 'react-native-usesense';
 *
 * await UseSense.initialize({
 *   apiKey: 'sk_sandbox_...',
 *   environment: 'sandbox',
 * });
 *
 * const unsubscribe = UseSense.addListener((event) => {
 *   console.log(event.type, event.data);
 * });
 *
 * try {
 *   const result = await UseSense.startVerification({
 *     sessionType: 'enrollment',
 *   });
 *   console.log(result.decision); // 'APPROVE' | 'REJECT' | 'MANUAL_REVIEW'
 * } finally {
 *   unsubscribe.remove();
 * }
 * ```
 */
export class UseSense {
  /**
   * Initialize the UseSense plugin. Must be called before any other
   * method. Calling again with a different API key or environment
   * replaces the previous configuration.
   *
   * @throws {UseSenseError} If the API key is empty or initialization
   * fails on the native side.
   */
  static async initialize(config: UseSenseConfig): Promise<void> {
    if (!config.apiKey) {
      const err: UseSenseError = {
        code: 'invalid_config',
        message: 'apiKey is required',
        isRetryable: false,
      };
      throw err;
    }
    return UseSenseModule.initialize({
      apiKey: config.apiKey,
      environment: config.environment ?? 'auto',
      apiEndpoint: config.apiEndpoint,
      branding: config.branding,
    });
  }

  /**
   * Start a verification session. Presents a full-screen native
   * camera activity. The returned promise resolves when the session
   * completes or rejects with a `UseSenseError` (including the
   * `USER_CANCELLED` / `session_cancelled` cases when the user
   * dismisses the camera screen).
   */
  static async startVerification(
    request: VerificationRequest,
  ): Promise<UseSenseResult> {
    return UseSenseModule.startVerification({
      sessionType: request.sessionType,
      externalUserId: request.externalUserId,
      identityId: request.identityId,
      metadata: request.metadata,
    });
  }

  /**
   * Subscribe to real-time lifecycle events emitted by the native
   * SDK during a verification session. Call this **before**
   * `startVerification` so the subscription captures the earliest
   * events (`SESSION_CREATED`, `PERMISSIONS_REQUESTED`).
   *
   * Returns a subscription handle; call `.remove()` to stop
   * receiving events.
   */
  static addListener(
    callback: (event: UseSenseEvent) => void,
  ): UseSenseSubscription {
    const subscription = eventEmitter.addListener(
      'UseSenseEvent',
      (raw: UseSenseEvent) => {
        callback(raw);
      },
    );
    return {
      remove: () => subscription.remove(),
    };
  }

  /**
   * Clear all event listeners and release native resources. Does not
   * need to be called explicitly during normal usage; the plugin
   * cleans up on process teardown. Useful when you want to re-
   * initialize against a different API key or during test teardown.
   */
  static async reset(): Promise<void> {
    return UseSenseModule.reset();
  }

  /**
   * Whether the native plugin has an active `UseSense` client. Set
   * to `true` after a successful `initialize` and `false` after
   * `reset`. Useful for feature-flagging UI that should only show
   * when the SDK is ready.
   */
  static async isInitialized(): Promise<boolean> {
    return UseSenseModule.isInitialized();
  }

  // ─── LiveSense v4 ─────────────────────────────────────────────────────
  // Phase 1 ticket R-1.
  //
  // v4 runs the perspective-distortion zoom-motion capture. Passthrough
  // to the native SDK's startV4Session (iOS) / startV4Verification
  // (Android). The returned promise resolves with the opaque verdict;
  // sub-scores and pillar verdicts are never exposed.

  /**
   * Start a LiveSense v4 session.
   *
   * The session must already have been created on your backend and the
   * session_token + nonce forwarded to the client. The native SDK drives
   * the camera, signs the frame hash chain with the platform-attested
   * key, uploads, and returns the opaque verdict.
   */
  static async startV4Verification(
    request: V4VerificationRequest,
  ): Promise<V4Verdict> {
    return UseSenseModule.startV4Verification({
      sessionId: request.sessionId,
      sessionToken: request.sessionToken,
      nonce: request.nonce,
      apiBaseUrl: request.apiBaseUrl,
      environment: request.environment ?? 'production',
      displayName: request.displayName,
      brandPrimaryColor: request.brandPrimaryColor,
    });
  }
}

// ─── LiveSense v4 types (R-1) ─────────────────────────────────────────────

export interface V4VerificationRequest {
  sessionId: string;
  sessionToken: string;
  nonce: string;
  apiBaseUrl: string;
  environment?: UseSenseEnvironment;
  displayName?: string;
  brandPrimaryColor?: string;
}

export type V4Decision = 'pass' | 'fail' | 'review';
export type V4Confidence = 'high' | 'medium' | 'low';
export type V4AssuranceLevel = 'mobile_hardware' | 'web_attested' | 'web_unattested';
export type V4CaptureChannel = 'ios' | 'android' | 'rn' | 'flutter' | 'web';

/**
 * Opaque verdict from POST /v1/sessions/:id/result. Matches the server
 * contract exactly; no sub-scores leak through.
 */
export interface V4Verdict {
  session_id: string;
  verdict: V4Decision;
  confidence: V4Confidence;
  assurance_level_achieved: V4AssuranceLevel;
  capture_channel: V4CaptureChannel;
  match_sense_embedding_id: string | null;
  timestamp: string;
}

export default UseSense;
