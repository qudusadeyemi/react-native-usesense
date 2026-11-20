/**
 * The body the example sends to POST /v1/sessions/create-token when it mints
 * a demo client token (standing in for the integrator's server).
 *
 * `platform` is the device the token will be used on, and the server accepts
 * only `web`, `android` or `ios` (anything else is a 400). The example passes
 * React Native's `Platform.OS`; there is no `react-native` platform.
 */
import type { SessionType } from 'react-native-usesense';

export type TokenPlatform = 'ios' | 'android';

export function tokenPlatform(os: string): TokenPlatform {
  if (os === 'ios' || os === 'android') return os;
  throw new Error(`Client tokens are minted for ios or android, not ${os}`);
}

export function createTokenBody(
  sessionType: SessionType,
  os: string,
  identityId?: string,
): { session_type: SessionType; platform: TokenPlatform; identity_id?: string } {
  const body: { session_type: SessionType; platform: TokenPlatform; identity_id?: string } = {
    session_type: sessionType,
    platform: tokenPlatform(os),
  };
  const id = identityId?.trim();
  if (sessionType === 'authentication' && id) body.identity_id = id;
  return body;
}
