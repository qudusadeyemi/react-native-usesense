/**
 * Tests for the Flows JS wrapper. Mirrors the Flutter widget-test contract
 * suite (test/flows_test.dart). Two load-bearing concerns:
 *
 *   1. Success path: the native Map is passed through to the host app
 *      unchanged (typed FlowRunResult), and the custom apiBaseUrl reaches
 *      the native side verbatim.
 *   2. Error path: a native reject(code, message, null) is translated into
 *      a typed FlowError with the correct FlowErrorCode, including the
 *      fallback to 'unknown' for unrecognised codes.
 *
 * The runtime under test never touches a real React Native runtime — we stub
 * `NativeModules.UseSenseFlowsModule.runFlow` via `jest.mock('react-native')`
 * before importing the module so the lazy `NativeModules` lookup hits the
 * stub.
 */

const runFlowMock = jest.fn();

jest.mock('react-native', () => ({
  NativeModules: {
    UseSenseFlowsModule: { runFlow: runFlowMock },
  },
  Platform: {
    select: (obj: { default?: string }) => obj.default ?? '',
  },
}));

import { FlowError, UseSenseFlows } from '../flows';
import type { FlowErrorCode } from '../flows';

describe('UseSenseFlows.runFlow', () => {
  beforeEach(() => {
    runFlowMock.mockReset();
  });

  it('resolves with the typed FlowRunResult', async () => {
    runFlowMock.mockResolvedValue({
      flowRunId: 'fr_1',
      state: 'completed',
      outcome: 'APPROVE',
    });

    const result = await UseSenseFlows.runFlow({
      flowRunId: 'fr_1',
      sdkToken: 'tok_a',
    });

    expect(result).toEqual({
      flowRunId: 'fr_1',
      state: 'completed',
      outcome: 'APPROVE',
    });
    expect(runFlowMock).toHaveBeenCalledWith('fr_1', 'tok_a', null);
  });

  it('surfaces a cancelled run as outcome null', async () => {
    runFlowMock.mockResolvedValue({
      flowRunId: 'fr_2',
      state: 'cancelled',
      outcome: null,
    });

    const result = await UseSenseFlows.runFlow({
      flowRunId: 'fr_2',
      sdkToken: 'tok_b',
    });

    expect(result.state).toBe('cancelled');
    expect(result.outcome).toBeNull();
  });

  it('passes a custom apiBaseUrl through to the native side', async () => {
    runFlowMock.mockResolvedValue({
      flowRunId: 'fr_3',
      state: 'completed',
      outcome: 'APPROVE',
    });

    await UseSenseFlows.runFlow({
      flowRunId: 'fr_3',
      sdkToken: 'tok_c',
      apiBaseUrl: 'https://staging.example.com',
    });

    expect(runFlowMock).toHaveBeenCalledWith(
      'fr_3',
      'tok_c',
      'https://staging.example.com',
    );
  });

  it('translates a native reject into a typed FlowError', async () => {
    runFlowMock.mockRejectedValue(
      Object.assign(new Error('SDK token has expired'), {
        code: 'token_expired',
      }),
    );

    await expect(
      UseSenseFlows.runFlow({ flowRunId: 'fr', sdkToken: 't' }),
    ).rejects.toMatchObject({
      name: 'FlowError',
      code: 'token_expired',
      message: 'SDK token has expired',
    });
  });

  it('maps every documented error code', async () => {
    const cases: ReadonlyArray<readonly [string, FlowErrorCode]> = [
      ['token_expired', 'token_expired'],
      ['token_invalid', 'token_invalid'],
      ['network_unavailable', 'network_unavailable'],
      ['permission_denied', 'permission_denied'],
      ['provider_unavailable', 'provider_unavailable'],
      ['cancelled', 'cancelled'],
      ['unsupported_action', 'unsupported_action'],
      // Server form validation: the native runner handles this inline, but
      // host apps driving advance() outside the runner still see it.
      ['invalid_input', 'invalid_input'],
      // Anything unknown collapses to FlowErrorCode 'unknown'.
      ['lol_what', 'unknown'],
    ];

    for (const [wire, expected] of cases) {
      runFlowMock.mockRejectedValue(
        Object.assign(new Error('m'), { code: wire }),
      );
      let thrown: unknown;
      try {
        await UseSenseFlows.runFlow({ flowRunId: 'fr', sdkToken: 't' });
      } catch (e) {
        thrown = e;
      }
      expect(thrown).toBeInstanceOf(FlowError);
      expect((thrown as FlowError).code).toBe(expected);
    }
  });
});
