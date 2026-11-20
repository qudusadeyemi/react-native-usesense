import { createTokenBody, tokenPlatform } from '../demoToken';

describe('create-token body', () => {
  it('sends the device platform, never "react-native"', () => {
    expect(createTokenBody('enrollment', 'ios')).toEqual({ session_type: 'enrollment', platform: 'ios' });
    expect(createTokenBody('liveness', 'android')).toEqual({ session_type: 'liveness', platform: 'android' });
  });

  it('rejects a platform the server does not accept', () => {
    expect(() => tokenPlatform('react-native')).toThrow();
    expect(() => tokenPlatform('web')).toThrow();
  });

  it('adds identity_id only for authentication', () => {
    expect(createTokenBody('authentication', 'ios', ' idn_1 ')).toEqual({
      session_type: 'authentication',
      platform: 'ios',
      identity_id: 'idn_1',
    });
    expect(createTokenBody('enrollment', 'ios', 'idn_1')).not.toHaveProperty('identity_id');
  });
});
