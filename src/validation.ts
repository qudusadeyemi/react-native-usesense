// Local request checks shared by the full-screen API and <UseSenseView />.
// They mirror the native SDKs and the server, so a bad request fails before
// it crosses the bridge.

import type { UseSenseError, VerificationRequest } from './index';

export function invalidConfig(message: string): UseSenseError {
  return { code: 'INVALID_CONFIG', message, isRetryable: false };
}

/** Liveness must not carry an identityId (the server returns 400). */
export function validateRequest(request: VerificationRequest): UseSenseError | null {
  if (request.sessionType === 'liveness' && request.identityId?.trim()) {
    return invalidConfig('identityId must not be set for liveness sessions');
  }
  return null;
}

export function validateClientToken(clientToken: string | undefined): UseSenseError | null {
  if (typeof clientToken !== 'string' || !clientToken.trim()) {
    return invalidConfig('clientToken must not be blank');
  }
  return null;
}
