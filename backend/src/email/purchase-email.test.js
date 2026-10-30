import assert from 'node:assert/strict';
import test from 'node:test';
import { createPurchaseEmail } from './purchase-email.js';

test('purchase email confirms the paid order, uses the order recipient, and escapes HTML values', () => {
  const email = createPurchaseEmail({
    order: {
      id: 'order-123',
      status: 'PAID',
      recipientName: '<Lucía & Ana>',
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
      items: [{ name: 'Mezcal Reposado', quantity: 2, unitPriceCents: 12345, lineTotalCents: 24690 }],
    },
  });

  assert.equal(email.subject, 'Tu compra está confirmada | Señor del Mictlán');
  assert.match(email.text, /Hola <Lucía & Ana>/);
  assert.match(email.text, /order-123/);
  assert.match(email.text, /\$246\.90/);
  assert.match(email.text, /detalle de tu pedido en PDF/);
  assert.match(email.html, /&lt;Lucía &amp; Ana&gt;/);
  assert.doesNotMatch(email.html, /<Lucía & Ana>/);
  assert.match(email.html, /detalle de tu pedido/);
  assert.doesNotMatch(email.html, /comprobante de pago y la copia de la orden/);
});

test('purchase email refuses to describe an unpaid order as confirmed', () => {
  assert.throws(() => createPurchaseEmail({ order: { id: 'order-123', status: 'PENDING' } }), {
    code: 'PURCHASE_ORDER_INVALID',
  });
});
