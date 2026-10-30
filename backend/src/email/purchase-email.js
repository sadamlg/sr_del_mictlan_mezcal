import { formatOrderMoney, validatePurchaseOrder } from './purchase-documents.js';
import { EMAIL_COLORS, emailBrandImageUrl, escapeHtml, renderBrandedEmail } from './email-layout.js';

export function createPurchaseEmail({ order: input, appBaseUrl }) {
  const order = validatePurchaseOrder(input);
  const total = formatOrderMoney(order.totalCents, order.currency);
  const paidAt = order.paidAt.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
  const subject = 'Tu compra está confirmada | Señor del Mictlán';
  const text = [
    `Hola ${order.recipientName},`,
    '',
    'Confirmamos el pago de tu pedido.',
    `Pedido: ${order.id}`,
    `Total pagado: ${total}`,
    `Fecha de pago: ${paidAt}`,
    '',
    'Adjuntamos el detalle de tu pedido en PDF.',
    '',
    'Señor del Mictlán · Etúcuaro, Michoacán',
  ].join('\n');
  const html = renderBrandedEmail(`
                <h1 style="margin:0 0 24px;color:${EMAIL_COLORS.ivory};font-family:Georgia,'Times New Roman',serif;font-size:25px;font-weight:400;letter-spacing:0.01em;line-height:1.4">Tu compra está confirmada</h1>
                <p style="margin:0 0 16px;color:${EMAIL_COLORS.ivory};font-size:16px;line-height:1.65">Hola ${escapeHtml(order.recipientName)},</p>
                <p style="margin:0;color:${EMAIL_COLORS.sageMuted};font-size:15px;line-height:1.75">Confirmamos el pago de tu pedido. Conserva estos datos como referencia:</p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;margin:24px 0;border-collapse:collapse;border-top:1px solid rgba(224,205,184,0.16);border-bottom:1px solid rgba(224,205,184,0.16)">
                  <tr>
                    <td style="padding:12px 0 4px;color:${EMAIL_COLORS.earthMuted};font-size:12px;line-height:1.5">Pedido</td>
                  </tr>
                  <tr>
                    <td style="padding:0 0 12px;color:${EMAIL_COLORS.bone};font-size:13px;line-height:1.65;word-break:break-word">${escapeHtml(order.id)}</td>
                  </tr>
                  <tr>
                    <td style="border-top:1px solid rgba(224,205,184,0.16);padding:12px 0 4px;color:${EMAIL_COLORS.earthMuted};font-size:12px;line-height:1.5">Total pagado</td>
                  </tr>
                  <tr>
                    <td style="padding:0 0 12px;color:${EMAIL_COLORS.teal};font-family:Georgia,'Times New Roman',serif;font-size:21px;line-height:1.4">${escapeHtml(total)}</td>
                  </tr>
                  <tr>
                    <td style="border-top:1px solid rgba(224,205,184,0.16);padding:12px 0 4px;color:${EMAIL_COLORS.earthMuted};font-size:12px;line-height:1.5">Fecha de pago</td>
                  </tr>
                  <tr>
                    <td style="padding:0 0 12px;color:${EMAIL_COLORS.sageMuted};font-size:13px;line-height:1.65">${escapeHtml(paidAt)}</td>
                  </tr>
                </table>
                <p style="margin:0;color:${EMAIL_COLORS.sageMuted};font-size:13px;line-height:1.65">Adjuntamos el detalle de tu pedido en PDF.</p>`, {
    brandImageUrl: emailBrandImageUrl(appBaseUrl),
  });

  return { subject, text, html };
}
