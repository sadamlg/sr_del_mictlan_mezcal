import assert from 'node:assert/strict';
import test from 'node:test';
import { createPurchaseDocuments } from './purchase-documents.js';

const order = {
  id: 'order-123',
  status: 'PAID',
  recipientName: 'Lucía Álvarez',
  recipientEmail: 'lucia@example.com',
  shippingAddress: {
    street: 'Calle del Sol',
    number: '12',
    neighborhood: 'Centro',
    locality: 'Morelia',
    state: 'Michoacán',
    postalCode: '58000',
  },
  currency: 'MXN',
  subtotalCents: 24690,
  totalCents: 24690,
  createdAt: new Date('2026-10-28T18:01:00.000Z'),
  paidAt: new Date('2026-10-28T18:02:00.000Z'),
  items: [{
    slug: 'mezcal-reposado',
    name: 'Mezcal Reposado',
    quantity: 2,
    unitPriceCents: 12345,
    lineTotalCents: 24690,
  }],
};

function extractPdfText(buffer) {
  return [...buffer.toString('ascii').matchAll(/\(((?:\\[0-7]{3}|\\[()\\]|[^)])*)\) Tj/g)]
    .map(([, literal]) => literal.replace(/\\([0-7]{3}|[()\\])/g, (match, escaped) => {
      if (/^[0-7]{3}$/.test(escaped)) return String.fromCharCode(Number.parseInt(escaped, 8));
      return escaped;
    }))
    .join('\n');
}

test('paid order produces one detailed order PDF with the matching snapshot data', () => {
  const documents = createPurchaseDocuments(order);

  assert.deepEqual(documents.map(({ filename, contentType }) => [filename, contentType]), [
    ['detalle-pedido-order-123.pdf', 'application/pdf'],
  ]);
  assert.ok(documents.every(({ content }) => Buffer.isBuffer(content)));
  assert.ok(documents.every(({ content }) => content.subarray(0, 8).toString('ascii') === '%PDF-1.4'));
  assert.ok(documents.every(({ content }) => content.toString('ascii').includes('%%EOF')));

  const orderText = extractPdfText(documents[0].content);
  assert.match(orderText, /Detalle del pedido/);
  assert.match(orderText, /Lucía Álvarez/);
  assert.match(orderText, /Calle del Sol/);
  assert.match(orderText, /Mezcal Reposado/);
  assert.match(orderText, /Pago confirmado/);
  assert.match(orderText, /TOTAL PAGADO/);
});

test('purchase PDF refuses orders that are not paid or have invalid money snapshots', () => {
  assert.throws(() => createPurchaseDocuments({ ...order, status: 'PENDING' }), { code: 'PURCHASE_ORDER_INVALID' });
  assert.throws(() => createPurchaseDocuments({ ...order, totalCents: Number.NaN }), { code: 'PURCHASE_ORDER_INVALID' });
});
