// One error shape for both platforms. The iOS SDK reports named codes
// (`SESSION_NOT_FOUND`); the Android SDK reports numbers (client codes such as
// 1002, or the HTTP status with the server's code in `serverCode`). Every
// error the session API rejects with, and every `<UseSenseView onError>`,
// goes through `normaliseError`, so JS sees the iOS names on both platforms
// and the platform's own value in `nativeCode`.

import type { UseSenseError } from './index';

/** The named codes a session error can carry, on both platforms. */
export type UseSenseErrorCode =
  | 'CAMERA_UNAVAILABLE'
  | 'CAMERA_PERMISSION_DENIED'
  | 'MIC_PERMISSION_DENIED'
  | 'NETWORK_ERROR'
  | 'NETWORK_TIMEOUT'
  | 'SESSION_EXPIRED'
  | 'UNAUTHORIZED'
  | 'INVALID_TOKEN'
  | 'SESSION_NOT_FOUND'
  | 'IDENTITY_NOT_FOUND'
  | 'INVALID_REQUEST'
  | 'INVALID_CONFIG'
  | 'QUOTA_EXCEEDED'
  | 'USER_CANCELLED'
  | 'CAPTURE_FAILED'
  | 'ENCODING_FAILED'
  | 'UPLOAD_FAILED'
  | 'FACE_NOT_DETECTED'
  | 'LOW_LIGHT'
  | 'TIMEOUT'
  | 'CAPTURE_TIMEOUT'
  | 'UPLOAD_TIMEOUT'
  | 'NO_FRAMES_CAPTURED'
  | 'RESPONSE_INVALID'
  | 'SERVER_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_ALREADY_USED'
  | 'INSUFFICIENT_CREDITS'
  | 'NONCE_MISMATCH'
  | 'SDK_NOT_INITIALIZED'
  | 'NO_HOST_SCREEN'
  | 'UNSUPPORTED_CONTAINER'
  | 'UNKNOWN_ERROR';

/** Android `UseSenseError` client codes (the non-HTTP ones). */
const ANDROID_CLIENT_CODES: Record<number, UseSenseErrorCode> = {
  1001: 'CAMERA_UNAVAILABLE',
  1002: 'CAMERA_PERMISSION_DENIED',
  1003: 'MIC_PERMISSION_DENIED',
  2001: 'NETWORK_ERROR',
  2002: 'NETWORK_TIMEOUT',
  3001: 'SESSION_EXPIRED',
  3002: 'UPLOAD_FAILED',
  4001: 'CAPTURE_FAILED',
  4002: 'ENCODING_FAILED',
  5001: 'INVALID_CONFIG',
  6001: 'QUOTA_EXCEEDED',
  7001: 'TIMEOUT', // finalization timeout
  7002: 'CAPTURE_TIMEOUT',
  7003: 'UPLOAD_TIMEOUT',
};

/** Codes the bridges themselves use (not the SDKs). */
const BRIDGE_CODES: Record<string, UseSenseErrorCode> = {
  CANCELLED: 'USER_CANCELLED', // Android onCancelled
  session_cancelled: 'USER_CANCELLED', // iOS userCancelled
  sdk_not_initialized: 'SDK_NOT_INITIALIZED',
  NO_ACTIVITY: 'NO_HOST_SCREEN',
  no_activity: 'NO_HOST_SCREEN',
  no_view_controller: 'NO_HOST_SCREEN',
  unsupported_container: 'UNSUPPORTED_CONTAINER',
  invalid_config: 'INVALID_CONFIG',
  INVALID_REQUEST: 'INVALID_REQUEST',
};

/** The iOS SDK's `UseSenseError.fromHTTP`, applied to Android's HTTP errors. */
export function codeForHttp(status: number, serverCode?: string | null): UseSenseErrorCode {
  switch (status) {
    case 400:
      return 'INVALID_REQUEST';
    case 401:
      if (serverCode === 'session_expired') return 'SESSION_EXPIRED';
      if (serverCode === 'invalid_token') return 'INVALID_TOKEN';
      if (serverCode === 'nonce_mismatch') return 'NONCE_MISMATCH';
      return 'UNAUTHORIZED';
    case 402:
      return 'INSUFFICIENT_CREDITS';
    case 403:
      return 'UNAUTHORIZED';
    case 404:
      return serverCode === 'identity_not_found' ? 'IDENTITY_NOT_FOUND' : 'SESSION_NOT_FOUND';
    case 409:
      return 'TOKEN_ALREADY_USED';
    case 410:
      return serverCode === 'token_expired' ? 'TOKEN_EXPIRED' : 'SESSION_EXPIRED';
    case 429:
      return 'QUOTA_EXCEEDED';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    default:
      return status >= 500 ? 'SERVER_ERROR' : 'UNKNOWN_ERROR';
  }
}

/** The named code for a raw native code (a number, a numeric string or a name). */
export function namedCode(raw: string | number | undefined | null, serverCode?: string | null): string {
  if (raw === undefined || raw === null || raw === '') return 'UNKNOWN_ERROR';
  const numeric = typeof raw === 'number' ? raw : /^\d+$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isNaN(numeric)) {
    // Android: a capture that produced no frames is CAPTURE_FAILED with this serverCode.
    if (numeric === 4001 && serverCode === 'NO_FRAMES_CAPTURED') return 'NO_FRAMES_CAPTURED';
    return ANDROID_CLIENT_CODES[numeric] ?? (numeric >= 100 && numeric < 600 ? codeForHttp(numeric, serverCode) : 'UNKNOWN_ERROR');
  }
  const text = String(raw);
  return BRIDGE_CODES[text] ?? text;
}

/** HTTP statuses the SDKs retry or let the person retry (as iOS `fromHTTP`). */
function retryableByDefault(code: string): boolean {
  return ['NETWORK_ERROR', 'NETWORK_TIMEOUT', 'UPLOAD_FAILED', 'SERVER_ERROR', 'SERVICE_UNAVAILABLE'].includes(code);
}

type RawError = {
  code?: string | number;
  message?: string;
  isRetryable?: boolean;
  serverCode?: string | null;
  nativeCode?: string;
  userInfo?: { code?: string | number; serverCode?: string | null; isRetryable?: boolean; message?: string } | null;
};

/**
 * Turns whatever a bridge rejected with (a React Native promise error with
 * `userInfo`, or a plain event payload) into a `UseSenseError` with a named
 * `code`, the platform's raw value in `nativeCode`, and `serverCode` when the
 * server sent one. An error already normalised is returned unchanged.
 */
export function normaliseError(error: unknown): UseSenseError {
  const raw = (error ?? {}) as RawError;
  if (raw.nativeCode !== undefined) return raw as UseSenseError;
  const info = raw.userInfo ?? {};
  // Android promise rejections carry the numeric code in userInfo as well.
  const rawCode = info.code ?? raw.code;
  const serverCode = raw.serverCode ?? info.serverCode ?? undefined;
  const code = namedCode(rawCode, serverCode);
  const isRetryable = raw.isRetryable ?? info.isRetryable ?? retryableByDefault(code);
  const normalised: UseSenseError = {
    code,
    message: raw.message ?? info.message ?? 'Something went wrong',
    isRetryable,
    nativeCode: rawCode === undefined || rawCode === null ? undefined : String(rawCode),
  };
  if (serverCode) normalised.serverCode = serverCode;
  return normalised;
}

/** Runs a native call and rejects with a normalised error. */
export async function bridged<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    throw normaliseError(error);
  }
}
