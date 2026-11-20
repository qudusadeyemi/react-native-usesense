/**
 * Client-token starts (J1), remote flows by ID (A4) and the optional API
 * key: what reaches the native module, and what is rejected before it.
 */

const native = {
  initialize: jest.fn(),
  startVerification: jest.fn(),
  startVerificationWithToken: jest.fn(),
  startRemoteEnrollment: jest.fn(),
  startRemoteVerification: jest.fn(),
};

jest.mock('react-native', () => ({
  NativeModules: { UseSenseModule: native },
  NativeEventEmitter: jest.fn().mockImplementation(() => ({ addListener: jest.fn() })),
  Platform: { select: (obj: { default?: string }) => obj.default ?? '' },
}));

import { UseSense } from '../index';
import type { RemoteFlowResult, UseSenseResult } from '../index';

const result: UseSenseResult = {
  sessionId: 'ses_1',
  sessionType: 'enrollment',
  identityId: 'idn_1',
  decision: 'APPROVE',
  timestamp: '2026-11-20T00:00:00Z',
  isApproved: true,
  isRejected: false,
  isPendingReview: false,
};

beforeEach(() => {
  Object.values(native).forEach((fn) => fn.mockReset());
});

describe('UseSense.initialize without an API key', () => {
  it('forwards an empty key instead of throwing (token-only apps)', async () => {
    await UseSense.initialize({ environment: 'sandbox' });
    expect(native.initialize).toHaveBeenCalledTimes(1);
    expect(native.initialize.mock.calls[0][0]).toMatchObject({ apiKey: '', environment: 'sandbox' });
  });

  it('trims a key that is passed', async () => {
    await UseSense.initialize({ apiKey: '  sk_sandbox_x ' });
    expect(native.initialize.mock.calls[0][0].apiKey).toBe('sk_sandbox_x');
  });
});

describe('UseSense.startVerificationWithToken', () => {
  it('sends the trimmed token and the session type, and returns the native result', async () => {
    native.startVerificationWithToken.mockResolvedValue(result);
    await expect(
      UseSense.startVerificationWithToken({ clientToken: ' cli_tok_abc ', sessionType: 'enrollment' }),
    ).resolves.toEqual(result);
    expect(native.startVerificationWithToken).toHaveBeenCalledWith({
      clientToken: 'cli_tok_abc',
      sessionType: 'enrollment',
    });
  });

  it('passes every session type through', async () => {
    native.startVerificationWithToken.mockResolvedValue(result);
    for (const sessionType of ['enrollment', 'authentication', 'liveness'] as const) {
      await UseSense.startVerificationWithToken({ clientToken: 'cli_tok_abc', sessionType });
    }
    expect(native.startVerificationWithToken.mock.calls.map((c) => c[0].sessionType)).toEqual([
      'enrollment',
      'authentication',
      'liveness',
    ]);
  });

  it.each(['', '   '])('rejects a blank token (%p) before the bridge', async (clientToken) => {
    await expect(
      UseSense.startVerificationWithToken({ clientToken, sessionType: 'enrollment' }),
    ).rejects.toMatchObject({ code: 'INVALID_CONFIG', isRetryable: false });
    expect(native.startVerificationWithToken).not.toHaveBeenCalled();
  });

  it('passes native errors (token_expired etc.) through unchanged', async () => {
    const error = { code: 'TOKEN_EXPIRED', message: 'expired', serverCode: 'token_expired' };
    native.startVerificationWithToken.mockRejectedValue(error);
    await expect(
      UseSense.startVerificationWithToken({ clientToken: 'cli_tok_abc', sessionType: 'enrollment' }),
    ).rejects.toBe(error);
  });
});

describe('remote flows by ID', () => {
  it('startRemoteEnrollment sends the trimmed ID and resolves the decision', async () => {
    const remote: RemoteFlowResult = { decision: 'APPROVE' };
    native.startRemoteEnrollment.mockResolvedValue(remote);
    await expect(UseSense.startRemoteEnrollment(' enr_1 ')).resolves.toEqual(remote);
    expect(native.startRemoteEnrollment).toHaveBeenCalledWith('enr_1');
  });

  it('startRemoteVerification resolves DISPUTED', async () => {
    native.startRemoteVerification.mockResolvedValue({ decision: 'DISPUTED' });
    await expect(UseSense.startRemoteVerification('rsess_1')).resolves.toEqual({ decision: 'DISPUTED' });
    expect(native.startRemoteVerification).toHaveBeenCalledWith('rsess_1');
  });

  it('rejects blank IDs before the bridge', async () => {
    await expect(UseSense.startRemoteEnrollment(' ')).rejects.toMatchObject({ code: 'INVALID_CONFIG' });
    await expect(UseSense.startRemoteVerification('')).rejects.toMatchObject({ code: 'INVALID_CONFIG' });
    expect(native.startRemoteEnrollment).not.toHaveBeenCalled();
    expect(native.startRemoteVerification).not.toHaveBeenCalled();
  });
});
