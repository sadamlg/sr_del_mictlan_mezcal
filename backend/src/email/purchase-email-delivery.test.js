import assert from 'node:assert/strict';
import test from 'node:test';
import { createPurchaseEmailDelivery } from './purchase-email-delivery.js';

test('routes purchase email to Mailpit and uses the local sender in development', () => {
  const smtpTransport = { name: 'mailpit' };
  const resendTransport = { name: 'resend' };

  const delivery = createPurchaseEmailDelivery({
    nodeEnv: 'development',
    smtpTransport,
    resendTransport,
    mailFrom: 'noreply@senordelmictlan.local',
    resendFrom: 'pedidos@senordelmictlan.com',
  });

  assert.equal(delivery.transport, smtpTransport);
  assert.equal(delivery.from, 'noreply@senordelmictlan.local');
});

test('routes purchase email to Resend outside development and falls back to MAIL_FROM', () => {
  const smtpTransport = { name: 'mailpit' };
  const resendTransport = { name: 'resend' };

  const delivery = createPurchaseEmailDelivery({
    nodeEnv: 'production',
    smtpTransport,
    resendTransport,
    mailFrom: 'pedidos@senordelmictlan.com',
    resendFrom: 'recibos@senordelmictlan.com',
  });

  assert.equal(delivery.transport, resendTransport);
  assert.equal(delivery.from, 'recibos@senordelmictlan.com');
});

test('uses MAIL_FROM for Resend when RESEND_FROM is empty', () => {
  const delivery = createPurchaseEmailDelivery({
    nodeEnv: 'production',
    smtpTransport: {},
    resendTransport: {},
    mailFrom: 'pedidos@senordelmictlan.com',
    resendFrom: '',
  });

  assert.equal(delivery.from, 'pedidos@senordelmictlan.com');
});
