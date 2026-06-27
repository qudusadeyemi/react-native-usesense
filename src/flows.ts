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
  return m as {
    runFlow: (
      flowRunId: string,
      sdkToken: string,
      apiBaseUrl: string | null,
      appearance: FlowAppearance | null,
      copy: FlowCopy | null,
    ) => Promise<NativeFlowRunResult>;
  };
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

// ─── White-label contract (mirrors the web SDK) ───────────────────────────
//
// FlowAppearance + FlowCopy are the shared customization schemas (Phase 1 +
// Phase 2 of the white-label initiative). They mirror the web SDK contract
// (packages/sdk/src/flows/theme.ts + copy.ts) one-to-one with camelCase keys.
// The RN bridge forwards the raw object across to the native iOS/Android
// runner, which decodes it (FlowAppearance/FlowCopy.decodeFromJSONObject).
// Everything is optional; an omitted key falls back to the hosted-page tokens.

/** A palette layer. `dark` overrides apply only in dark mode. */
export interface AppearanceColors {
  primary?: string;
  primaryForeground?: string;
  background?: string;
  surface?: string;
  foreground?: string;
  muted?: string;
  border?: string;
  success?: string;
  error?: string;
  warning?: string;
  /** Overrides applied on top of the dark base (e.g. a darker background). */
  dark?: Omit<AppearanceColors, 'dark'>;
}

export interface AppearanceTypography {
  /** Body font-family name (e.g. "DM Sans"). */
  fontFamily?: string;
  /** Heading/display font-family; defaults to fontFamily when omitted. */
  displayFamily?: string;
  /** A stylesheet URL or @font-face block to load custom fonts (web only;
   *  ignored by the native runners, which load fonts from app resources). */
  fontCss?: string;
}

export interface AppearanceShape {
  /** Base corner radius (cards, inputs). */
  radius?: number;
  /** Button corner radius; defaults to radius. */
  buttonRadius?: number;
  buttonStyle?: 'filled' | 'outline';
}

/** Custom illustration/icon overrides (image URLs replacing built-in glyphs). */
export interface AppearanceIcons {
  /** Success result screen. */ success?: string;
  /** Under-review result screen. */ review?: string;
  /** Not-verified result screen. */ notVerified?: string;
  /** Any other named slot by URL. */
  [slot: string]: string | undefined;
}

/** Loading animation: a built-in preset or a custom asset. */
export interface AppearanceLoader {
  /** Built-in preset. Default 'spinner'. */
  style?: 'spinner' | 'dots' | 'bar';
  /** Custom loader asset URL; overrides style. */
  imageUrl?: string;
}

/**
 * White-label appearance overrides for the Flow runner. Supplied at SDK init
 * (this option) and merged over the operator's server-delivered branding by
 * the native runner. Mirrors `FlowAppearance` in the web SDK.
 */
export interface FlowAppearance {
  colors?: AppearanceColors;
  typography?: AppearanceTypography;
  shape?: AppearanceShape;
  logo?: { url?: string; placement?: 'header' | 'center' | 'none'; height?: number };
  background?: { color?: string; imageUrl?: string };
  /** Custom illustrations for result screens / icon slots. */
  icons?: AppearanceIcons;
  /** Loading-animation preset or custom asset. */
  loader?: AppearanceLoader;
  /** Force a palette or follow the OS (default 'auto'). */
  mode?: 'light' | 'dark' | 'auto';
}

/**
 * White-label copy overrides for the Flow runner. Every subject-facing string
 * can be overridden; an omitted key keeps the built-in copy. Supplied at SDK
 * init and merged over the operator's server-delivered copy by the native
 * runner. Mirrors `FlowCopy` in the web SDK.
 */
export interface FlowCopy {
  /** Optional welcome/intro shown before the first step (when set). */
  welcome?: { title?: string; body?: string };
  /** Shared button labels. */
  buttons?: {
    continue?: string;
    cancel?: string;
    tryAgain?: string;
    retake?: string;
    useThisPhoto?: string;
    uploadInstead?: string;
    scan?: string;
    upload?: string;
    submitting?: string;
  };
  /** Titles shown under the loader for each transient state. */
  loading?: { default?: string; verifying?: string; submittingDocument?: string; checkingQuality?: string };
  /** Face capture primer. */
  face?: { title?: string; body?: string; start?: string };
  /** Document capture surfaces. */
  document?: {
    selectTitle?: string; selectBody?: string;
    primerTitle?: string; primerBody?: string;
    uploadTitle?: string; uploadBody?: string;
    scanTitle?: string; scanBody?: string;
    confirmTitle?: string; confirmBody?: string;
  };
  /** Form + ID-number surfaces. */
  form?: { title?: string };
  idNumber?: { title?: string; body?: string };
  /** Terminal result screens. */
  result?: {
    successTitle?: string; successBody?: string;
    reviewTitle?: string; reviewBody?: string;
    notVerifiedTitle?: string; notVerifiedBody?: string;
    cancelledTitle?: string;
  };
  /** Error copy (provider failure vs unreadable capture vs generic). */
  errors?: { generic?: string; providerUnavailable?: string; documentUnreadable?: string };
  /** Privacy / consent disclosures shown to the subject. */
  privacy?: { disclosure?: string; consentTitle?: string; consentBody?: string };
  /** Free-form help text / tooltips keyed by an SDK-defined slot id. */
  help?: Record<string, string>;
}

/** Options for `UseSenseFlows.runFlow`. */
export interface RunFlowOptions {
  flowRunId: string;
  sdkToken: string;
  /** Defaults to `https://api.usesense.ai`. */
  apiBaseUrl?: string;
  /**
   * SDK-init white-label appearance. Forwarded to the native runner, which
   * decodes it and merges it over the operator's server-delivered branding
   * (SDK-init takes precedence). Omit to use the hosted-page tokens.
   */
  appearance?: FlowAppearance;
  /**
   * SDK-init white-label copy. Forwarded to the native runner, which decodes
   * it and merges it over the operator's server-delivered copy (SDK-init takes
   * precedence). Omit to keep the built-in subject-facing strings.
   */
  copy?: FlowCopy;
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
        options.appearance ?? null,
        options.copy ?? null,
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
