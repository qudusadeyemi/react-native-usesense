import React from 'react';
import {
  requireNativeComponent,
  View,
  type HostComponent,
  type NativeSyntheticEvent,
  type ViewProps,
} from 'react-native';
import type {
  SessionType,
  UseSenseError,
  UseSenseResult,
  VerificationRequest,
} from './index';
import { invalidConfig, validateClientToken, validateRequest } from './validation';
import { normaliseError } from './errors';

/** The error delivered to `onError`. Same shape the start methods reject with. */
export type UseSenseViewErrorEvent = UseSenseError;

interface CommonProps extends ViewProps {
  /**
   * The session ended with a decision, when the person leaves the result
   * screen. Unmount the view here and show your own next screen.
   */
  onComplete?: (result: UseSenseResult) => void;
  /** The session failed (or the props were invalid). Unmount the view here. */
  onError?: (error: UseSenseViewErrorEvent) => void;
  /** The person backed out of the capture. Unmount the view here. */
  onCancel?: () => void;
}

interface RequestProps extends CommonProps {
  /** A session the SDK creates with the API key from `initialize`. */
  request: VerificationRequest;
  clientToken?: undefined;
  sessionType?: undefined;
}

interface TokenProps extends CommonProps {
  request?: undefined;
  /** A single-use `client_token` from `POST /v1/sessions/create-token`; no API key needed. */
  clientToken: string;
  /** The session type your server passed to `create-token`. */
  sessionType: SessionType;
}

/** Props for `<UseSenseView />`: either `request`, or `clientToken` + `sessionType`. */
export type UseSenseViewProps = RequestProps | TokenProps;

/** What the native view starts from. Sent once, as one prop. */
type NativeLaunch =
  | {
      kind: 'request';
      sessionType: SessionType;
      externalUserId?: string;
      identityId?: string;
      metadata?: Record<string, string | number | boolean>;
    }
  | { kind: 'token'; clientToken: string; sessionType: SessionType };

interface NativeProps extends ViewProps {
  launch: NativeLaunch;
  onUseSenseComplete?: (event: NativeSyntheticEvent<UseSenseResult>) => void;
  onUseSenseError?: (event: NativeSyntheticEvent<UseSenseError>) => void;
  onUseSenseCancel?: (event: NativeSyntheticEvent<Record<string, never>>) => void;
}

export const NATIVE_VIEW_NAME = 'RNUseSenseView';

const WRAPPER_PROPS = [
  'request',
  'clientToken',
  'sessionType',
  'onComplete',
  'onError',
  'onCancel',
] as const;

let nativeView: HostComponent<NativeProps> | null = null;

// Resolved on first render, not at import, so importing the package never
// requires the view manager (tests, or apps that only use the module).
function getNativeView(): HostComponent<NativeProps> {
  if (!nativeView) nativeView = requireNativeComponent<NativeProps>(NATIVE_VIEW_NAME);
  return nativeView;
}

/** The launch the native view runs, or the error that stops it starting. */
export function resolveLaunch(props: UseSenseViewProps): NativeLaunch | UseSenseError {
  const hasRequest = props.request != null;
  const hasToken = props.clientToken != null;
  if (hasRequest === hasToken) {
    return invalidConfig('UseSenseView needs exactly one of `request` or `clientToken`');
  }
  if (props.request) {
    const invalid = validateRequest(props.request);
    if (invalid) return invalid;
    const { sessionType, externalUserId, identityId, metadata } = props.request;
    return { kind: 'request', sessionType, externalUserId, identityId, metadata };
  }
  const invalid = validateClientToken(props.clientToken);
  if (invalid) return invalid;
  if (!props.sessionType) return invalidConfig('sessionType is required with clientToken');
  return { kind: 'token', clientToken: props.clientToken!.trim(), sessionType: props.sessionType };
}

/** React Native adds the view tag (`target`) to native event payloads; callers get the plain shape. */
function withoutTarget<T extends object>(payload: T): T {
  const copy = { ...payload } as Record<string, unknown>;
  delete copy.target;
  return copy as T;
}

/**
 * Client tokens a `<UseSenseView>` has finished with (a callback fired). A
 * token is single-use: once its session has ended, the server answers 409
 * `token_already_used`, and the SDK would show that as an error page inside
 * the view. A view remounted with such a token (navigating back to the
 * screen that held it, a parent re-rendering it under a new key) reports
 * `TOKEN_ALREADY_USED` at once instead and starts nothing. Bounded: only the
 * most recent tokens are kept.
 */
const spentTokens = new Set<string>();
const SPENT_TOKENS_KEPT = 50;

function markSpent(token: string): void {
  spentTokens.delete(token);
  spentTokens.add(token);
  if (spentTokens.size > SPENT_TOKENS_KEPT) {
    const oldest = spentTokens.values().next().value;
    if (oldest !== undefined) spentTokens.delete(oldest);
  }
}

function spentTokenError(): UseSenseError {
  return {
    code: 'TOKEN_ALREADY_USED',
    message:
      'This client token was already used by a UseSenseView. Client tokens are single-use: get a new one from your server.',
    isRetryable: false,
  };
}

function isError(value: NativeLaunch | UseSenseError): value is UseSenseError {
  return (value as UseSenseError).code !== undefined;
}

/**
 * The capture, embedded in your own screen: the same session, screens,
 * branding (code wins over the dashboard), copy and result as
 * `startVerification` / `startVerificationWithToken`, drawn inside this
 * view instead of a full-screen screen. Hosts the native Android
 * `UseSenseFragment` and the iOS `UseSenseViewController`.
 *
 * ```tsx
 * <UseSenseView
 *   style={{ flex: 1 }}
 *   clientToken={tokenFromYourServer}
 *   sessionType="enrollment"
 *   onComplete={(result) => navigation.replace('Done', { result })}
 *   onError={(error) => showError(error)}
 *   onCancel={() => navigation.goBack()}
 * />
 * ```
 *
 * - The session starts when the view mounts and runs once. Props changed
 *   later are ignored; to start another session remount the view (for
 *   example with a new `key`).
 * - Exactly one of `onComplete`, `onError` or `onCancel` fires. Unmount the
 *   view in it, and do not leave a screen holding the same token where the
 *   person can navigate back to it: a client token is single-use, so a view
 *   mounted again with a token whose session already ended reports
 *   `TOKEN_ALREADY_USED` at once and starts nothing. Unmounting mid-capture
 *   ends the capture without a callback.
 * - The SDK asks for camera (and microphone) permission itself.
 * - Give the view the space the camera should fill; full screen works best.
 * - Lifecycle events still arrive through `UseSense.addListener`.
 */
export class UseSenseView extends React.Component<UseSenseViewProps> {
  // Fixed at mount: the native capture starts from these and runs once.
  private readonly launch: NativeLaunch | UseSenseError;

  constructor(props: UseSenseViewProps) {
    super(props);
    const launch = resolveLaunch(props);
    this.launch =
      !isError(launch) && launch.kind === 'token' && spentTokens.has(launch.clientToken)
        ? spentTokenError()
        : launch;
  }

  /** The session behind this view ended: its token can never start another. */
  private settle(): void {
    if (!isError(this.launch) && this.launch.kind === 'token') markSpent(this.launch.clientToken);
  }

  componentDidMount(): void {
    if (isError(this.launch)) this.props.onError?.(this.launch);
  }

  private handleComplete = (event: NativeSyntheticEvent<UseSenseResult>) => {
    this.settle();
    this.props.onComplete?.(withoutTarget(event.nativeEvent));
  };

  private handleError = (event: NativeSyntheticEvent<UseSenseError>) => {
    this.settle();
    this.props.onError?.(normaliseError(withoutTarget(event.nativeEvent)));
  };

  private handleCancel = () => {
    this.settle();
    this.props.onCancel?.();
  };

  render(): React.ReactNode {
    // Strip the wrapper's own props so they are not forwarded to the native view.
    const viewProps: Record<string, unknown> = { ...this.props };
    for (const key of WRAPPER_PROPS) delete viewProps[key];
    if (isError(this.launch)) return <View {...viewProps} />;
    const Native = getNativeView();
    return (
      <Native
        {...viewProps}
        launch={this.launch}
        onUseSenseComplete={this.handleComplete}
        onUseSenseError={this.handleError}
        onUseSenseCancel={this.handleCancel}
      />
    );
  }
}
