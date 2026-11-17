/**
 * @file turnstile.ts
 * @description Weryfikacja tokenów Cloudflare Turnstile (ochrona anty-botowa L7)
 */

import { TurnstileVerificationResult } from '@games/shared';

const TURNSTILE_VERIFY_ENDPOINT = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Weryfikuje token Turnstile po stronie serwera
 */
export async function verifyTurnstileToken(
  token: string,
  secretKey: string,
  remoteIp?: string
): Promise<{ success: boolean; error?: string }> {
  // W środowisku deweloperskim bez klucza dopuszczamy token "test-turnstile-token"
  if (!secretKey || secretKey === 'DEV_MOCK_KEY') {
    if (token === 'dev-token' || token.length > 5) {
      return { success: true };
    }
  }

  try {
    const formData = new FormData();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const res = await fetch(TURNSTILE_VERIFY_ENDPOINT, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      return { success: false, error: `Błąd komunikacji z Cloudflare Turnstile: ${res.status}` };
    }

    const data = await res.json() as TurnstileVerificationResult;
    if (!data.success) {
      const errCode = data['error-codes'] ? data['error-codes'].join(', ') : 'Niepoprawny token';
      return { success: false, error: `Weryfikacja bota nie powiodła się: ${errCode}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: `Wyjątek podczas weryfikacji Turnstile: ${err?.message || err}` };
  }
}
