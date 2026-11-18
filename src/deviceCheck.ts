/**
 * Headless silent device check for "Your KYC".
 *
 * Keep your own KYC provider's SDK and run this next to it. No UI, no camera
 * and no permission prompt. Sense scores the device and links the result to
 * your provider's result when it reaches your Your KYC connection.
 *
 * ```ts
 * import { deviceCheck } from 'react-native-usesense';
 *
 * // Your server: POST /v1/device-checks with your API key (never ship the key)
 * // and "platform": "android" or "ios"; pass the three values to the app.
 * const check = deviceCheck({ deviceCheckId, token, nonce });
 * const started = await check.start(); // before your provider's SDK opens
 * if (!started.ok) console.warn('device check start:', started.error.code);
 * await provider.start({ metadata: { device_check_id: deviceCheckId } });
 * await check.finish(); // after it closes
 * check.dispose();
 * ```
 *
 * `start()` and `finish()` never reject. The device is never told the score;
 * read it on your server with `GET /v1/device-checks/:id`.
 */

import { NativeModules } from 'react-native';

export type DeviceCheckPhase = 'start' | 'finish';

/**
 * One error taxonomy on both platforms (and the web SDK's names). The native
 * SDKs name a few codes differently (iOS `token_invalid`, Android
 * `service_unavailable`); they are normalised here.
 */
export type DeviceCheckErrorCode =
  | 'invalid_token'
  | 'token_expired'
  | 'nonce_mismatch'
  | 'invalid_input'
  | 'out_of_order'
  | 'not_found'
  | 'unavailable'
  | 'network_error'
  | 'timeout'
  | 'invalid_config'
  | 'cancelled'
  | 'unknown';

export interface DeviceCheckError {
  code: DeviceCheckErrorCode;
  message: string;
  /** True when calling again may succeed (unavailable, network, timeout). */
  retryable: boolean;
  /** The server's own `code`, when the server answered. */
  serverCode?: string;
  httpStatus?: number;
}

export type DeviceCheckResult =
  | { ok: true; phase: DeviceCheckPhase }
  | { ok: false; phase: DeviceCheckPhase; error: DeviceCheckError };

export interface DeviceCheckOptions {
  /** From `POST /v1/device-checks`. */
  deviceCheckId: string;
  token: string;
  nonce: string;
  /** Defaults to https://api.usesense.ai. */
  apiBaseUrl?: string;
  /** Per-request timeout in milliseconds. Defaults to the native SDK's own. */
  timeoutMs?: number;
}

export interface DeviceCheck {
  /** Send the integrity signals. Call before your provider's SDK opens. */
  start(): Promise<DeviceCheckResult>;
  /** Send the closing signals. Call after your provider's SDK closes. */
  finish(): Promise<DeviceCheckResult>;
  /** Release the native check. Later calls resolve as `cancelled`. */
  dispose(): void;
}

interface NativeDeviceCheckModule {
  start(handle: string, config: NativeConfig): Promise<NativeResult>;
  finish(handle: string, config: NativeConfig): Promise<NativeResult>;
  dispose(handle: string): void;
}

interface NativeConfig {
  deviceCheckId: string;
  token: string;
  nonce: string;
  apiBaseUrl: string | null;
  timeoutMs: number | null;
}

interface NativeResult {
  ok?: boolean;
  phase?: string;
  error?: {
    code?: string;
    message?: string;
    retryable?: boolean;
    serverCode?: string | null;
    httpStatus?: number | null;
  } | null;
}

const RETRYABLE: DeviceCheckErrorCode[] = ['unavailable', 'network_error', 'timeout'];

/** Map iOS, Android and server spellings onto one set. */
export function normaliseDeviceCheckCode(wire: string | null | undefined): DeviceCheckErrorCode {
  switch (wire) {
    case 'invalid_token':
    case 'token_invalid':
      return 'invalid_token';
    case 'token_expired':
      return 'token_expired';
    case 'nonce_mismatch':
      return 'nonce_mismatch';
    case 'invalid_input':
    case 'invalid_request':
    case 'invalid_phase':
      return 'invalid_input';
    case 'out_of_order':
    case 'already_started':
    case 'not_started':
    case 'already_finished':
      return 'out_of_order';
    case 'not_found':
      return 'not_found';
    case 'unavailable':
    case 'service_unavailable':
    case 'scoring_failed':
      return 'unavailable';
    case 'network_error':
    case 'network_unavailable':
      return 'network_error';
    case 'timeout':
      return 'timeout';
    case 'invalid_config':
      return 'invalid_config';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'unknown';
  }
}

function failed(phase: DeviceCheckPhase, code: DeviceCheckErrorCode, message: string): DeviceCheckResult {
  return { ok: false, phase, error: { code, message, retryable: RETRYABLE.includes(code) } };
}

function fromNative(raw: NativeResult | null | undefined, called: DeviceCheckPhase): DeviceCheckResult {
  const phase: DeviceCheckPhase = raw?.phase === 'start' || raw?.phase === 'finish' ? raw.phase : called;
  if (raw?.ok === true) return { ok: true, phase };
  const e = raw?.error;
  if (!e) return failed(phase, 'unknown', 'Device check failed');
  const code = normaliseDeviceCheckCode(e.code);
  return {
    ok: false,
    phase,
    error: {
      code,
      message: e.message ?? 'Device check failed',
      retryable: typeof e.retryable === 'boolean' ? e.retryable : RETRYABLE.includes(code),
      ...(e.serverCode ? { serverCode: e.serverCode } : {}),
      ...(typeof e.httpStatus === 'number' ? { httpStatus: e.httpStatus } : {}),
    },
  };
}

let counter = 0;

/** Create a headless silent device check. One per `POST /v1/device-checks`. */
export function deviceCheck(options: DeviceCheckOptions): DeviceCheck {
  const handle = `dc${Date.now()}_${counter++}`;
  const config: NativeConfig = {
    deviceCheckId: options.deviceCheckId,
    token: options.token,
    nonce: options.nonce,
    apiBaseUrl: options.apiBaseUrl ?? null,
    timeoutMs: options.timeoutMs ?? null,
  };
  let disposed = false;

  const call = async (phase: DeviceCheckPhase): Promise<DeviceCheckResult> => {
    if (disposed) return failed(phase, 'cancelled', 'This device check was disposed');
    const native = NativeModules.UseSenseDeviceCheckModule as NativeDeviceCheckModule | undefined;
    if (!native) {
      return failed(phase, 'unknown', 'react-native-usesense: the device check native module is not linked; rebuild the app');
    }
    try {
      return fromNative(await native[phase](handle, config), phase);
    } catch (e) {
      const err = e as { code?: string; message?: string };
      return failed(phase, normaliseDeviceCheckCode(err?.code), err?.message ?? 'Device check failed');
    }
  };

  return {
    start: () => call('start'),
    finish: () => call('finish'),
    dispose: () => {
      if (disposed) return;
      disposed = true;
      try {
        (NativeModules.UseSenseDeviceCheckModule as NativeDeviceCheckModule | undefined)?.dispose(handle);
      } catch {
        // Nothing to release.
      }
    },
  };
}
