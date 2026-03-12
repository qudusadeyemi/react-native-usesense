import {
  NativeModules,
  NativeEventEmitter,
  Platform,
} from 'react-native';

// ---------------------------------------------------------------------------
// Dual-architecture module resolution
// ---------------------------------------------------------------------------

// Try TurboModule first (New Architecture), fall back to Bridge module.
const isTurboModuleEnabled =
  // @ts-expect-error — global.__turboModuleProxy is injected at runtime
  global.__turboModuleProxy != null;

const UseSenseModule: import('./NativeUseSense').Spec = isTurboModuleEnabled
  ? require('./NativeUseSense').default
  : NativeModules.UseSenseModule;

if (!UseSenseModule) {
  throw new Error(
    '[react-native-usesense] NativeModule not found. ' +
      'Make sure the library is linked correctly:\n' +
      '  - iOS: run `cd ios && pod install`\n' +
      '  - Android: rebuild with `npx react-native run-android`',
  );
}

// ---------------------------------------------------------------------------
// Public Types
// ---------------------------------------------------------------------------

export type UseSenseEnvironment = 'sandbox' | 'production' | 'auto';

export type SessionType = 'enrollment' | 'authentication';

export interface BrandingConfig {
  logoUrl?: string;
  primaryColor?: string;
  buttonRadius?: number;
  fontFamily?: string;
}

export interface UseSenseConfig {
  apiKey: string;
  environment?: UseSenseEnvironment;
  baseUrl?: string;
  gatewayKey?: string;
  branding?: BrandingConfig;
  googleCloudProjectNumber?: number;
}

export interface VerificationRequest {
  sessionType: SessionType;
  externalUserId?: string;
  identityId?: string;
  metadata?: Record<string, unknown>;
}

export interface UseSenseResult {
  sessionId: string;
  sessionType: string | null;
  identityId: string | null;
  decision: string;
  timestamp: string;
  isApproved: boolean;
  isRejected: boolean;
  isPendingReview: boolean;
}

export interface UseSenseError {
  code: number;
  serverCode: string | null;
  message: string;
  isRetryable: boolean;
}

export type EventType =
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
  | 'ERROR';

export interface UseSenseEvent {
  type: EventType;
  timestamp: number;
  data?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const eventEmitter = new NativeEventEmitter(UseSenseModule as any);

/**
 * Flatten the nested BrandingConfig into top-level keys expected by the
 * native codegen spec (codegen does not support nested optional objects).
 */
function flattenConfig(config: UseSenseConfig) {
  const { branding, ...rest } = config;
  return {
    ...rest,
    primaryColor: branding?.primaryColor,
    buttonRadius: branding?.buttonRadius,
    logoUrl: branding?.logoUrl,
    fontFamily: branding?.fontFamily,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize the UseSense SDK. Must be called once before startVerification().
 */
export function initialize(config: UseSenseConfig): void {
  UseSenseModule.initialize(flattenConfig(config));
}

/**
 * Launch the native verification flow.
 *
 * Returns a promise that resolves with the verification result, or rejects
 * with a {@link UseSenseError}-shaped object on failure/cancellation.
 */
export async function startVerification(
  request: VerificationRequest,
): Promise<UseSenseResult> {
  const nativeRequest: Parameters<typeof UseSenseModule.startVerification>[0] = {
    sessionType: request.sessionType,
    externalUserId: request.externalUserId,
    identityId: request.identityId,
    metadata: request.metadata ? JSON.stringify(request.metadata) : undefined,
  };

  const result = await UseSenseModule.startVerification(nativeRequest);

  return {
    sessionId: result.sessionId,
    sessionType: result.sessionType ?? null,
    identityId: result.identityId ?? null,
    decision: result.decision,
    timestamp: result.timestamp,
    isApproved: result.isApproved,
    isRejected: result.isRejected,
    isPendingReview: result.isPendingReview,
  };
}

/**
 * Subscribe to SDK lifecycle events (session created, capture started, etc.).
 * Returns an unsubscribe function.
 */
export function onEvent(
  callback: (event: UseSenseEvent) => void,
): () => void {
  UseSenseModule.subscribeToEvents();
  const subscription = eventEmitter.addListener('UseSenseEvent', callback);
  return () => {
    subscription.remove();
    UseSenseModule.unsubscribeFromEvents();
  };
}

/**
 * Check if the SDK has been initialized.
 */
export function isInitialized(): Promise<boolean> {
  return UseSenseModule.isInitialized();
}

/**
 * Reset the SDK state. Call this when you want to reinitialize with a
 * different config or when the user logs out.
 */
export function reset(): void {
  UseSenseModule.reset();
}

/**
 * Convenience constant exposing the current platform.
 */
export const platform: 'ios' | 'android' =
  Platform.OS === 'ios' ? 'ios' : 'android';

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

const UseSense = {
  initialize,
  startVerification,
  onEvent,
  isInitialized,
  reset,
  platform,
};

export default UseSense;
