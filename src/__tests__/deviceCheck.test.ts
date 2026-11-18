/**
 * Tests for the deviceCheck() JS wrapper: one native instance per handle, the
 * config reaches the native module verbatim, native error codes are
 * normalised across iOS and Android, and nothing ever rejects.
 */

const startMock = jest.fn();
const finishMock = jest.fn();
const disposeMock = jest.fn();

jest.mock('react-native', () => ({
  NativeModules: {
    UseSenseDeviceCheckModule: { start: startMock, finish: finishMock, dispose: disposeMock },
  },
  Platform: { select: (obj: { default?: string }) => obj.default ?? '' },
}));

import { deviceCheck, normaliseDeviceCheckCode } from '../deviceCheck';

const opts = {
  deviceCheckId: 'dc_0123456789abcdef',
  token: 'dct_token',
  nonce: 'dn_nonce',
  apiBaseUrl: 'https://staging.api.usesense.ai',
  timeoutMs: 12000,
};

beforeEach(() => {
  startMock.mockReset();
  finishMock.mockReset();
  disposeMock.mockReset();
});

test('start and finish run on one handle with the config and resolve ok', async () => {
  startMock.mockResolvedValue({ ok: true, phase: 'start' });
  finishMock.mockResolvedValue({ ok: true, phase: 'finish' });
  const check = deviceCheck(opts);
  await expect(check.start()).resolves.toEqual({ ok: true, phase: 'start' });
  await expect(check.finish()).resolves.toEqual({ ok: true, phase: 'finish' });
  const [h1, c1] = startMock.mock.calls[0];
  const [h2] = finishMock.mock.calls[0];
  expect(h1).toBe(h2);
  expect(c1).toEqual({
    deviceCheckId: 'dc_0123456789abcdef',
    token: 'dct_token',
    nonce: 'dn_nonce',
    apiBaseUrl: 'https://staging.api.usesense.ai',
    timeoutMs: 12000,
  });
});

test('two checks get different handles', async () => {
  startMock.mockResolvedValue({ ok: true, phase: 'start' });
  await deviceCheck(opts).start();
  await deviceCheck(opts).start();
  expect(startMock.mock.calls[0][0]).not.toBe(startMock.mock.calls[1][0]);
});

test.each([
  ['token_invalid', 'invalid_token'],
  ['invalid_token', 'invalid_token'],
  ['network_unavailable', 'network_error'],
  ['network_error', 'network_error'],
  ['service_unavailable', 'unavailable'],
  ['unavailable', 'unavailable'],
  ['invalid_request', 'invalid_input'],
  ['out_of_order', 'out_of_order'],
  ['something_new', 'unknown'],
])('native code %s is normalised to %s', async (wire, expected) => {
  expect(normaliseDeviceCheckCode(wire)).toBe(expected);
  startMock.mockResolvedValue({
    ok: false,
    phase: 'start',
    error: { code: wire, message: 'm', retryable: true, serverCode: 'x', httpStatus: 503 },
  });
  const r = await deviceCheck(opts).start();
  expect(r).toEqual({
    ok: false,
    phase: 'start',
    error: { code: expected, message: 'm', retryable: true, serverCode: 'x', httpStatus: 503 },
  });
});

test('never rejects: a native rejection resolves as a failure', async () => {
  startMock.mockRejectedValue(Object.assign(new Error('slow'), { code: 'timeout' }));
  const r = await deviceCheck(opts).start();
  expect(r.ok).toBe(false);
  if (!r.ok) {
    expect(r.error.code).toBe('timeout');
    expect(r.error.retryable).toBe(true);
  }
});

test('dispose releases the native check and later calls are cancelled', async () => {
  startMock.mockResolvedValue({ ok: true, phase: 'start' });
  const check = deviceCheck(opts);
  await check.start();
  check.dispose();
  check.dispose();
  const r = await check.finish();
  expect(disposeMock).toHaveBeenCalledTimes(1);
  expect(finishMock).not.toHaveBeenCalled();
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.error.code).toBe('cancelled');
});
