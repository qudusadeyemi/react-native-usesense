/**
 * Error normalisation: Android's numeric codes become the iOS names, so JS
 * sees one code set on both platforms; the raw value stays in nativeCode.
 */

import { codeForHttp, namedCode, normaliseError } from '../errors';

describe('namedCode: Android client codes', () => {
  it.each([
    [1001, 'CAMERA_UNAVAILABLE'],
    [1002, 'CAMERA_PERMISSION_DENIED'],
    [1003, 'MIC_PERMISSION_DENIED'],
    [2001, 'NETWORK_ERROR'],
    [2002, 'NETWORK_TIMEOUT'],
    [3001, 'SESSION_EXPIRED'],
    [3002, 'UPLOAD_FAILED'],
    [4001, 'CAPTURE_FAILED'],
    [4002, 'ENCODING_FAILED'],
    [5001, 'INVALID_CONFIG'],
    [6001, 'QUOTA_EXCEEDED'],
    [7001, 'TIMEOUT'],
    [7002, 'CAPTURE_TIMEOUT'],
    [7003, 'UPLOAD_TIMEOUT'],
  ])('%p -> %s (number and numeric string)', (raw, name) => {
    expect(namedCode(raw)).toBe(name);
    expect(namedCode(String(raw))).toBe(name);
  });

  it('maps a capture with no frames to NO_FRAMES_CAPTURED', () => {
    expect(namedCode('4001', 'NO_FRAMES_CAPTURED')).toBe('NO_FRAMES_CAPTURED');
  });

  it('maps an unknown non-HTTP number to UNKNOWN_ERROR', () => {
    expect(namedCode(9999)).toBe('UNKNOWN_ERROR');
  });
});

describe('codeForHttp: the iOS fromHTTP table', () => {
  it.each([
    [400, undefined, 'INVALID_REQUEST'],
    [401, 'session_expired', 'SESSION_EXPIRED'],
    [401, 'invalid_token', 'INVALID_TOKEN'],
    [401, 'nonce_mismatch', 'NONCE_MISMATCH'],
    [401, undefined, 'UNAUTHORIZED'],
    [402, undefined, 'INSUFFICIENT_CREDITS'],
    [403, undefined, 'UNAUTHORIZED'],
    [404, 'identity_not_found', 'IDENTITY_NOT_FOUND'],
    [404, 'token_not_found', 'SESSION_NOT_FOUND'],
    [409, 'token_already_used', 'TOKEN_ALREADY_USED'],
    [410, 'token_expired', 'TOKEN_EXPIRED'],
    [410, undefined, 'SESSION_EXPIRED'],
    [429, undefined, 'QUOTA_EXCEEDED'],
    [500, undefined, 'SERVER_ERROR'],
    [502, undefined, 'SERVER_ERROR'],
    [503, undefined, 'SERVICE_UNAVAILABLE'],
    [418, undefined, 'UNKNOWN_ERROR'],
  ])('%p (%p) -> %s', (status, serverCode, name) => {
    expect(codeForHttp(status, serverCode)).toBe(name);
    expect(namedCode(String(status), serverCode)).toBe(name);
  });
});

describe('namedCode: bridge codes and iOS names', () => {
  it.each([
    ['CANCELLED', 'USER_CANCELLED'],
    ['session_cancelled', 'USER_CANCELLED'],
    ['sdk_not_initialized', 'SDK_NOT_INITIALIZED'],
    ['NO_ACTIVITY', 'NO_HOST_SCREEN'],
    ['no_activity', 'NO_HOST_SCREEN'],
    ['no_view_controller', 'NO_HOST_SCREEN'],
    ['unsupported_container', 'UNSUPPORTED_CONTAINER'],
    ['SESSION_NOT_FOUND', 'SESSION_NOT_FOUND'],
    ['TOKEN_EXPIRED', 'TOKEN_EXPIRED'],
    ['V4_FAILED', 'V4_FAILED'],
  ])('%s -> %s', (raw, name) => {
    expect(namedCode(raw)).toBe(name);
  });

  it('falls back to UNKNOWN_ERROR without a code', () => {
    expect(namedCode(undefined)).toBe('UNKNOWN_ERROR');
  });
});

describe('normaliseError', () => {
  it('reads an Android promise rejection (numeric code in userInfo)', () => {
    expect(
      normaliseError({
        code: '1002',
        message: 'We need camera access',
        userInfo: { code: 1002, serverCode: null, isRetryable: false },
      }),
    ).toEqual({ code: 'CAMERA_PERMISSION_DENIED', message: 'We need camera access', isRetryable: false, nativeCode: '1002' });
  });

  it('defaults isRetryable from the code when the platform did not say', () => {
    expect(normaliseError({ code: 'NETWORK_ERROR', message: 'offline' }).isRetryable).toBe(true);
    expect(normaliseError({ code: 'SESSION_NOT_FOUND', message: 'gone' }).isRetryable).toBe(false);
  });

  it('leaves an already normalised error alone', () => {
    const done = { code: 'TOKEN_EXPIRED', message: 'x', isRetryable: false, nativeCode: '410' };
    expect(normaliseError(done)).toBe(done);
  });

  it('copes with a missing error', () => {
    expect(normaliseError(undefined)).toMatchObject({ code: 'UNKNOWN_ERROR' });
  });
});
