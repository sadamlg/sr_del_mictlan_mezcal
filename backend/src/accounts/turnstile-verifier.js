const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const MAX_TOKEN_LENGTH = 2048;
const SITEVERIFY_TIMEOUT_MS = 5000;

export class TurnstileUnavailableError extends Error {
  constructor() {
    super('Turnstile verification is unavailable.');
    this.name = 'TurnstileUnavailableError';
  }
}

export function createTurnstileVerifier({
  secretKey = process.env.TURNSTILE_SECRET_KEY,
  expectedHostname,
  enforceContext = false,
  fetcher = fetch,
} = {}) {
  return async function verifyTurnstileToken(token, action) {
    if (!secretKey) throw new TurnstileUnavailableError();
    if (typeof token !== 'string' || token.length === 0 || token.length > MAX_TOKEN_LENGTH) return false;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SITEVERIFY_TIMEOUT_MS);
    let result;
    try {
      const response = await fetcher(SITEVERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: secretKey, response: token }),
        signal: controller.signal,
      });
      if (!response?.ok) throw new TurnstileUnavailableError();
      result = await response.json();
    } catch {
      throw new TurnstileUnavailableError();
    } finally {
      clearTimeout(timeout);
    }

    if (!result || typeof result.success !== 'boolean' || !result.success) return false;
    if (enforceContext && (
      result.hostname !== expectedHostname
      || result.action !== action
    )) return false;

    return true;
  };
}
