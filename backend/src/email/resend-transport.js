const RESEND_EMAILS_URL = 'https://api.resend.com/emails';
const RESEND_REQUEST_TIMEOUT_MS = 15_000;

export function createResendTransport({
  apiKey = process.env.RESEND_API_KEY,
  fetchImpl = globalThis.fetch,
  timeoutMs = RESEND_REQUEST_TIMEOUT_MS,
} = {}) {
  return {
    async sendMail({ from, to, subject, text, html, attachments = [], idempotencyKey }) {
      if (!apiKey) {
        throw Object.assign(new Error('Resend no está configurado.'), { code: 'RESEND_NOT_CONFIGURED' });
      }
      if (typeof fetchImpl !== 'function') {
        throw Object.assign(new Error('No hay cliente HTTP disponible para Resend.'), { code: 'RESEND_FETCH_UNAVAILABLE' });
      }

      const headers = {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };
      if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

      const response = await fetchImpl(RESEND_EMAILS_URL, {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({
          from,
          to,
          subject,
          text,
          html,
          ...(attachments.length ? {
            attachments: attachments.map(({ filename, content }) => ({
              filename,
              content: Buffer.isBuffer(content) ? content.toString('base64') : Buffer.from(content).toString('base64'),
            })),
          } : {}),
        }),
      });

      if (!response.ok) {
        throw Object.assign(new Error(`Resend respondió HTTP ${response.status}.`), {
          code: `RESEND_HTTP_${response.status}`,
        });
      }

      return response.json();
    },
  };
}
