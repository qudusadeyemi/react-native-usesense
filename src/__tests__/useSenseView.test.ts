/**
 * <UseSenseView />: the launch it hands the native view, the props it keeps
 * to itself, and the native events it turns into callbacks. Rendered without
 * a renderer: the class is instantiated and its render() output inspected.
 */

const requireNativeComponent = jest.fn((name: string) => name);

jest.mock('react-native', () => ({
  NativeModules: { UseSenseModule: {} },
  NativeEventEmitter: jest.fn().mockImplementation(() => ({ addListener: jest.fn() })),
  Platform: { select: (obj: { default?: string }) => obj.default ?? '' },
  requireNativeComponent: (name: string) => requireNativeComponent(name),
  View: 'View',
}));

import type React from 'react';
import { UseSenseView } from '../index';
import type { UseSenseResult, UseSenseViewProps } from '../index';

type Element = React.ReactElement<Record<string, any>>;

function mount(props: UseSenseViewProps): { view: UseSenseView; element: Element } {
  const view = new UseSenseView(props);
  view.componentDidMount();
  return { view, element: view.render() as Element };
}

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

describe('UseSenseView launch', () => {
  it('renders the native view with a token launch', () => {
    const { element } = mount({ clientToken: ' cli_tok_1 ', sessionType: 'liveness', style: { flex: 1 } });
    expect(element.type).toBe('RNUseSenseView');
    expect(requireNativeComponent).toHaveBeenCalledWith('RNUseSenseView');
    expect(element.props.launch).toEqual({ kind: 'token', clientToken: 'cli_tok_1', sessionType: 'liveness' });
    expect(element.props.style).toEqual({ flex: 1 });
  });

  it('renders a request launch with the request fields', () => {
    const { element } = mount({
      request: {
        sessionType: 'authentication',
        identityId: 'idn_1',
        externalUserId: 'u1',
        metadata: { plan: 'gold', tier: 2 },
      },
    });
    expect(element.props.launch).toEqual({
      kind: 'request',
      sessionType: 'authentication',
      identityId: 'idn_1',
      externalUserId: 'u1',
      metadata: { plan: 'gold', tier: 2 },
    });
  });

  it('keeps its own props off the native view', () => {
    const { element } = mount({
      clientToken: 'cli_tok_1',
      sessionType: 'enrollment',
      onComplete: jest.fn(),
      onError: jest.fn(),
      onCancel: jest.fn(),
      testID: 'capture',
    });
    for (const key of ['request', 'clientToken', 'sessionType', 'onComplete', 'onError', 'onCancel']) {
      expect(element.props).not.toHaveProperty(key);
    }
    expect(element.props.testID).toBe('capture');
  });

  it('fixes the launch at mount: later props do not restart it', () => {
    const view = new UseSenseView({ clientToken: 'cli_tok_1', sessionType: 'enrollment' });
    (view as unknown as { props: UseSenseViewProps }).props = {
      clientToken: 'cli_tok_2',
      sessionType: 'enrollment',
    };
    expect((view.render() as Element).props.launch.clientToken).toBe('cli_tok_1');
  });
});

describe('UseSenseView invalid props', () => {
  const cases: [string, UseSenseViewProps][] = [
    ['neither request nor token', {} as UseSenseViewProps],
    [
      'both request and token',
      { request: { sessionType: 'enrollment' }, clientToken: 'cli_tok_1', sessionType: 'enrollment' } as never,
    ],
    ['a blank token', { clientToken: '  ', sessionType: 'enrollment' }],
    ['a token without a session type', { clientToken: 'cli_tok_1' } as never],
    ['liveness with an identityId', { request: { sessionType: 'liveness', identityId: 'idn_1' } }],
  ];

  it.each(cases)('%s: reports INVALID_CONFIG on mount and renders no capture', (_name, props) => {
    const onError = jest.fn();
    const { element } = mount({ ...props, onError } as UseSenseViewProps);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toMatchObject({ code: 'INVALID_CONFIG', isRetryable: false });
    expect(element.type).toBe('View');
  });
});

describe('UseSenseView events', () => {
  it('maps the native events to onComplete, onError and onCancel', () => {
    const onComplete = jest.fn();
    const onError = jest.fn();
    const onCancel = jest.fn();
    const { element } = mount({ clientToken: 'cli_tok_1', sessionType: 'enrollment', onComplete, onError, onCancel });

    // React Native adds `target` (the view tag) to the payload; it is dropped.
    element.props.onUseSenseComplete({ nativeEvent: { ...result, target: 12 } });
    expect(onComplete).toHaveBeenCalledWith(result);

    const error = { code: 'TOKEN_ALREADY_USED', message: 'used', isRetryable: false };
    element.props.onUseSenseError({ nativeEvent: { ...error, target: 12 } });
    expect(onError).toHaveBeenCalledWith(error);

    element.props.onUseSenseCancel({ nativeEvent: {} });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('tolerates missing callbacks', () => {
    const { element } = mount({ request: { sessionType: 'enrollment' } });
    expect(() => {
      element.props.onUseSenseComplete({ nativeEvent: result });
      element.props.onUseSenseError({ nativeEvent: { code: 'x', message: 'y' } });
      element.props.onUseSenseCancel({ nativeEvent: {} });
    }).not.toThrow();
  });
});
