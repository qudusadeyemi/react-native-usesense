/**
 * React Native wrapper for the UseSense Flows runner.
 *
 * Coexists with the existing Sessions API (`UseSense.startSession`, etc.);
 * this is a parallel surface, not a replacement. See `guides/flows/sessions-vs-flows`
 * in the API docs for when to use which.
 *
 * Usage:
 *
 *   import { UseSenseFlows, FlowError } from 'react-native-usesense';
 *
 *   try {
 *     const result = await UseSenseFlows.runFlow({ flowRunId, sdkToken });
 *     console.log(result.outcome); // 'APPROVE' | 'REJECT' | 'MANUAL_REVIEW' | null
 *   } catch (e) {
 *     if (e instanceof FlowError) {
 *       // e.code: 'token_expired' | 'token_invalid' | ...
 *     }
 *   }
 */

import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `react-native-usesense (flows): the native module could not be found.\n\n` +
  Platform.select({
    ios: `iOS: run \`cd ios && pod install\` and rebuild the app.`,
    android: `Android: rebuild the app after installing the package.`,
    default: '',
  });

// Lazy lookup so this module doesn't throw at import time on platforms that
// haven't been re-linked yet. The Sessions module mirrors this pattern.
function nativeModule() {
  const m = NativeModules.UseSenseFlowsModule;
  if (!m) throw new Error(LINKING_ERROR);
  return m as { runFlow: (flowRunId: string, sdkToken: string, apiBaseUrl: string | null) => Promise<NativeFlowRunResult> };
}

/**
 * Server-driven flow run state. Host apps see only the terminal ones via
 * `FlowRunResult`; intermediate states drive the runner internally.
 */
export type FlowRunState =
  | 'pending'
  | 'in_progress'
  | 'stalled'
  | 'awaiting_review'
  | 'completed'
  | 'errored'
  | 'abandoned'
  | 'cancelled';

/** Terminal outcome of a flow run. */
export type FlowOutcome = 'APPROVE' | 'REJECT' | 'MANUAL_REVIEW';

/**
 * Uniform error taxonomy across every SDK. See `guides/flows/errors` in the
 * API docs for per-code recovery patterns.
 */
export type FlowErrorCode =
  | 'token_expired'
  | 'token_invalid'
  | 'network_unavailable'
  | 'permission_denied'
  | 'provider_unavailable'
  | 'cancelled'
  | 'unsupported_action'
  /** Server form validation failed. The native runner handles this inline
   *  (per-field highlights) and never reports terminal — but if a host app
   *  drives advance() outside the runner, the 422 surfaces with this code. */
  | 'invalid_input'
  | 'unknown';

const FLOW_ERROR_CODES: readonly FlowErrorCode[] = [
  'token_expired',
  'token_invalid',
  'network_unavailable',
  'permission_denied',
  'provider_unavailable',
  'cancelled',
  'unsupported_action',
  'invalid_input',
  'unknown',
] as const;

function normaliseCode(code: unknown): FlowErrorCode {
  return typeof code === 'string' && (FLOW_ERROR_CODES as readonly string[]).includes(code)
    ? (code as FlowErrorCode)
    : 'unknown';
}

/** Result returned to the host app's `runFlow` promise on terminal state. */
export interface FlowRunResult {
  flowRunId: string;
  state: FlowRunState;
  outcome: FlowOutcome | null;
}

interface NativeFlowRunResult {
  flowRunId: string;
  state: FlowRunState;
  outcome: FlowOutcome | null;
}

/**
 * Typed error thrown by `runFlow` when the native runner reports a failure.
 * Mirrors the web / iOS / Android / Flutter SDKs so host apps catch one
 * taxonomy regardless of platform.
 */
export class FlowError extends Error {
  readonly code: FlowErrorCode;
  constructor(code: FlowErrorCode, message: string) {
    super(message);
    this.name = 'FlowError';
    this.code = code;
  }
}

/** Options for `UseSenseFlows.runFlow`. */
export interface RunFlowOptions {
  flowRunId: string;
  sdkToken: string;
  /** Defaults to `https://api.usesense.ai`. */
  apiBaseUrl?: string;
}

/**
 * Public entry point for the Flows runner. Sessions APIs are untouched;
 * this is a parallel namespace.
 */
export const UseSenseFlows = {
  /**
   * Run an operator-authored Flow inside the host app. Resolves with a
   * [FlowRunResult] when the run reaches a terminal state (completed,
   * cancelled, errored, abandoned). Rejects with a [FlowError] on transport
   * / token / unsupported-action faults.
   */
  async runFlow(options: RunFlowOptions): Promise<FlowRunResult> {
    try {
      const native = await nativeModule().runFlow(
        options.flowRunId,
        options.sdkToken,
        options.apiBaseUrl ?? null,
      );
      return {
        flowRunId: native.flowRunId,
        state: native.state,
        outcome: native.outcome,
      };
    } catch (e) {
      // RN bridge errors are surfaced as `Error` with `.code` and `.message`
      // properties when the native side calls `reject(code, message, null)`.
      const code = normaliseCode((e as { code?: string }).code);
      const message = (e as { message?: string }).message ?? 'Flow failed';
      throw new FlowError(code, message);
    }
  },
};
