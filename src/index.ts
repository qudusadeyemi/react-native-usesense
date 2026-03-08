import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { UseSenseModule } = NativeModules;

if (!UseSenseModule) {
  throw new Error(
    'react-native-usesense: NativeModule not found. Make sure you have linked the library correctly.',
  );
}

// ─── Types ───────────────────────────────────────────────────────────

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

// ─── API ─────────────────────────────────────────────────────────────

const eventEmitter = new NativeEventEmitter(UseSenseModule);

/**
 * Initialize the UseSense SDK. Must be called before startVerification().
 */
export function initialize(config: UseSenseConfig): void {
  if (Platform.OS !== 'android') {
    console.warn('react-native-usesense: Only Android is supported currently.');
    return;
  }
  UseSenseModule.initialize(config);
}

/**
 * Launch the verification flow. Returns a promise that resolves with
 * the verification result or rejects with an error/cancellation.
 */
export function startVerification(
  request: VerificationRequest,
): Promise<UseSenseResult> {
  return UseSenseModule.startVerification(request);
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

const UseSense = {
  initialize,
  startVerification,
  onEvent,
  isInitialized,
  reset,
};

export default UseSense;
