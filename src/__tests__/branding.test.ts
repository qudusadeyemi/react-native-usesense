/**
 * Session-mode branding reaches the native module unchanged (BRAND-v1
 * section 6: wrappers pass `appearance` and `copy` in session mode too).
 *
 * The native side decodes `branding.appearance` / `branding.copy` into
 * `BrandingConfig.appearance` / `copy`; this suite pins the JS half: the maps
 * are forwarded as given, and unset legacy fields stay unset (2.6.0: the
 * wrapper must not fill `primaryColor` / `buttonRadius`, or code would beat
 * the dashboard).
 */

const initializeMock = jest.fn();

jest.mock('react-native', () => ({
  NativeModules: {
    UseSenseModule: { initialize: initializeMock },
  },
  NativeEventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(),
  })),
  Platform: {
    select: (obj: { default?: string }) => obj.default ?? '',
  },
}));

import { UseSense } from '../index';
import type { BrandingConfig } from '../index';

describe('UseSense.initialize branding', () => {
  beforeEach(() => {
    initializeMock.mockReset();
    initializeMock.mockResolvedValue(undefined);
  });

  it('forwards appearance and copy in session mode', async () => {
    const branding: BrandingConfig = {
      appearance: {
        mode: 'light',
        colors: { primary: '#1F7A4D', dark: { background: '#0B0B12' } },
        shape: { buttonRadius: 8, buttonStyle: 'outline' },
        capture: { ring: '#248E5A', challenge: '#A878FC' },
      },
      copy: {
        capture: {
          primer: { selfieTitle: 'Quick selfie', selfieTips: ['Good light'] },
          extraCheck: { headTurnNext: 'Now to the {side}' },
        },
      },
    };

    await UseSense.initialize({ apiKey: 'sk_sandbox_x', branding });

    const sent = initializeMock.mock.calls[0][0];
    expect(sent.branding).toEqual(branding);
    expect(sent.branding.primaryColor).toBeUndefined();
    expect(sent.branding.buttonRadius).toBeUndefined();
  });

  it('keeps the legacy fields working', async () => {
    await UseSense.initialize({
      apiKey: 'sk_sandbox_x',
      branding: { primaryColor: '#123456', buttonRadius: 4, logoUrl: 'https://x/l.png' },
    });

    expect(initializeMock.mock.calls[0][0].branding).toEqual({
      primaryColor: '#123456',
      buttonRadius: 4,
      logoUrl: 'https://x/l.png',
    });
  });
});
