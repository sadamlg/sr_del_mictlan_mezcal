import { prisma } from './database/prisma-client.js';
import { createAccountRepository } from './accounts/account-repository.js';
import { createSmtpTransport } from './email/smtp-transport.js';
import { createResendTransport } from './email/resend-transport.js';
import { createPurchaseEmailDelivery } from './email/purchase-email-delivery.js';
import { createEmailWorker } from './email/email-worker.js';

const smtpTransport = createSmtpTransport();
const mailFrom = process.env.MAIL_FROM || 'noreply@senordelmictlan.local';
const purchaseEmailDelivery = createPurchaseEmailDelivery({
  nodeEnv: process.env.NODE_ENV,
  smtpTransport,
  resendTransport: createResendTransport(),
  mailFrom,
  resendFrom: process.env.RESEND_FROM,
});

const emailWorker = createEmailWorker({
  repository: createAccountRepository(prisma),
  transport: smtpTransport,
  purchaseTransport: purchaseEmailDelivery.transport,
  from: mailFrom,
  purchaseFrom: purchaseEmailDelivery.from,
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
});

let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => { stopping = true; });
}

function logError(label, error) {
  console.error(label, {
    name: error instanceof Error ? error.name : 'UnknownError',
    code: error && typeof error === 'object' && 'code' in error ? error.code : undefined,
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

console.log('Worker de correo iniciado.');
while (!stopping) {
  let processed = false;
  try {
    processed = await emailWorker.processNext();
  } catch (error) {
    logError('[email-worker] database or queue check failed', error);
    await delay(5000);
  }
  if (!stopping && !processed) await delay(3000);
}

await prisma.$disconnect();
