import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * Codegen spec for the UseSense TurboModule.
 *
 * This file is consumed by React Native Codegen to produce C++/ObjC++/Java
 * bridge code. Keep types simple (no unions, no generics) — use string
 * literals on the JS side and map in the native layer.
 */

export interface Spec extends TurboModule {
  /**
   * Initialize the SDK with the provided configuration.
   * Must be called before startVerification().
   */
  initialize(config: {
    apiKey: string;
    environment?: string;
    baseUrl?: string;
    gatewayKey?: string;
    primaryColor?: string;
    buttonRadius?: number;
    logoUrl?: string;
    fontFamily?: string;
    googleCloudProjectNumber?: number;
  }): void;

  /**
   * Launch the native verification flow.
   * Resolves with the session result or rejects on error/cancellation.
   */
  startVerification(request: {
    sessionType: string;
    externalUserId?: string;
    identityId?: string;
    metadata?: string; // JSON-encoded metadata
  }): Promise<{
    sessionId: string;
    sessionType: string;
    identityId: string;
    decision: string;
    timestamp: string;
    isApproved: boolean;
    isRejected: boolean;
    isPendingReview: boolean;
  }>;

  /**
   * Check whether the SDK has been initialized.
   */
  isInitialized(): Promise<boolean>;

  /**
   * Reset SDK state. Call when you want to reinitialize or on user logout.
   */
  reset(): void;

  /**
   * Begin forwarding native SDK lifecycle events to JS via NativeEventEmitter.
   */
  subscribeToEvents(): void;

  /**
   * Stop forwarding native SDK lifecycle events.
   */
  unsubscribeFromEvents(): void;

  // Required by RCTEventEmitter on iOS / TurboModule event support
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('UseSenseModule');
