/**
 * Session types reach the native module as their wire strings, and a
 * liveness session with an identityId is rejected before the bridge, as the
 * native SDKs and the server (400) do.
 */

const startVerificationMock = jest.fn();

jest.mock('react-native', () => ({
  NativeModules: {
    UseSenseModule: { startVerification: startVerificationMock },
  },
  NativeEventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(),
  })),
  Platform: {
    select: (obj: { default?: string }) => obj.default ?? '',
  },
}));

import { UseSense } from '../index';
import type { SessionType } from '../index';

describe('UseSense.startVerification session types', () => {
  beforeEach(() => {
    startVerificationMock.mockReset();
    startVerificationMock.mockResolvedValue({ sessionId: 's' });
  });

  it('passes liveness through without an identityId', async () => {
    const sessionType: SessionType = 'liveness';
    await UseSense.startVerification({ sessionType, externalUserId: 'user-1' });
    expect(startVerificationMock).toHaveBeenCalledTimes(1);
    const sent = startVerificationMock.mock.calls[0][0];
    expect(sent.sessionType).toBe('liveness');
    expect(sent.externalUserId).toBe('user-1');
    expect(sent.identityId).toBeUndefined();
  });

  it('rejects liveness with an identityId before calling native', async () => {
    await expect(
      UseSense.startVerification({ sessionType: 'liveness', identityId: 'idn_1' }),
    ).rejects.toMatchObject({ code: 'INVALID_CONFIG' });
    expect(startVerificationMock).not.toHaveBeenCalled();
  });

  it('leaves authentication with an identityId unchanged', async () => {
    await UseSense.startVerification({ sessionType: 'authentication', identityId: 'idn_1' });
    expect(startVerificationMock.mock.calls[0][0]).toMatchObject({
      sessionType: 'authentication',
      identityId: 'idn_1',
    });
  });
});
