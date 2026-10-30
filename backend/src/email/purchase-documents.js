import { readFileSync } from 'node:fs';

const CP1252_EXTRA = new Map([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84], [0x2026, 0x85],
  [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88], [0x2030, 0x89], [0x0160, 0x8a],
  [0x2039, 0x8b], [0x0152, 0x8c], [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92],
  [0x201c, 0x93], [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b], [0x0153, 0x9c],
  [0x017e, 0x9e], [0x0178, 0x9f],
]);

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LEFT = 48;
const RIGHT = 547;
const CONTENT_WIDTH = RIGHT - LEFT;
const FOOTER_LIMIT = 62;
const BRAND_MARK_PATH = new URL('./assets/senor-del-mictlan-brand.jpg', import.meta.url);
const BRAND_MARK_WIDTH = 700;
const BRAND_MARK_HEIGHT = 346;

const COLORS = {
  paper: '#f4ede3',
  page: '#fffdf8',
  ink: '#100e0b',
  forest: '#0f5047',
  water: '#97d2c6',
  ivory: '#f1e7d6',
  earth: '#4d4635',
  gold: '#e9bd82',
  line: '#d7d0c4',
};

let brandMark;

const DATE_FORMATTER = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
});

function invalidOrder() {
  return Object.assign(new TypeError('El pedido no contiene una instantánea válida para generar el detalle.'), {
    code: 'PURCHASE_ORDER_INVALID',
  });
}

function isMoney(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

export function validatePurchaseOrder(order) {
  const createdAt = order?.createdAt instanceof Date ? order.createdAt : new Date(order?.createdAt);
  const paidAt = order?.paidAt instanceof Date ? order.paidAt : new Date(order?.paidAt);
  const address = order?.shippingAddress;
  if (
    !order || order.status !== 'PAID' || typeof order.id !== 'string' || !order.id.trim() ||
    !Number.isFinite(createdAt.getTime()) || !Number.isFinite(paidAt.getTime()) || !/^[A-Z]{3}$/.test(order.currency || '') ||
    !isMoney(order.subtotalCents) || !isMoney(order.totalCents) ||
    typeof order.recipientName !== 'string' || !order.recipientName.trim() ||
    typeof order.recipientEmail !== 'string' || !order.recipientEmail.trim() ||
    !address || typeof address !== 'object' ||
    !['street', 'number', 'neighborhood', 'locality', 'state', 'postalCode'].every((key) => typeof address[key] === 'string') ||
    !Array.isArray(order.items) || order.items.length === 0 || order.items.some((item) => (
      !item || typeof item.name !== 'string' || !item.name.trim() ||
      !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 99 ||
      !isMoney(item.unitPriceCents) || !isMoney(item.lineTotalCents)
    ))
  ) throw invalidOrder();

  return { ...order, createdAt, paidAt };
}

export function formatOrderMoney(amountCents, currency) {
  if (!isMoney(amountCents) || !/^[A-Z]{3}$/.test(currency || '')) throw invalidOrder();
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amountCents / 100);
}

function formatDocumentMoney(amountCents, currency) {
  return `${currency} ${formatOrderMoney(amountCents, currency)}`;
}

function normalizePdfText(value) {
  return String(value)
    .replace(/[‐‑‒–—−]/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function formatTimestamp(value) {
  return `${DATE_FORMATTER.format(value)} UTC`;
}

function safeOrderLabel(orderId) {
  return orderId.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80) || 'pedido';
}

function pdfLiteral(value) {
  return [...normalizePdfText(value)].map((character) => {
    const codePoint = character.codePointAt(0);
    const winAnsi = codePoint <= 0xff ? codePoint : CP1252_EXTRA.get(codePoint) ?? 0x3f;
    if (winAnsi >= 0x20 && winAnsi <= 0x7e && ![0x28, 0x29, 0x5c].includes(winAnsi)) {
      return String.fromCharCode(winAnsi);
    }
    if ([0x28, 0x29, 0x5c].includes(winAnsi)) return `\\${String.fromCharCode(winAnsi)}`;
    return `\\${winAnsi.toString(8).padStart(3, '0')}`;
  }).join('');
}

function point(value) {
  return Number(value.toFixed(2)).toString();
}

function colorValue(hex) {
  return hex.match(/[a-f\d]{2}/gi).map((part) => point(Number.parseInt(part, 16) / 255)).join(' ');
}

function fillRect(page, x, y, width, height, color) {
  page.push(`q ${colorValue(color)} rg ${point(x)} ${point(y)} ${point(width)} ${point(height)} re f Q`);
}

function drawImage(page, name, x, y, width, height) {
  page.push(`q ${point(width)} 0 0 ${point(height)} ${point(x)} ${point(y)} cm /${name} Do Q`);
}

function drawLine(page, x1, y1, x2, y2, color, width = 0.7) {
  page.push(`q ${colorValue(color)} RG ${point(width)} w ${point(x1)} ${point(y1)} m ${point(x2)} ${point(y2)} l S Q`);
}

function isSerif(font) {
  return font === 'F1' || font === 'F2';
}

function approximateTextWidth(text, size, font) {
  const serif = isSerif(font);
  let units = 0;
  for (const character of normalizePdfText(text)) {
    if (/\s/.test(character)) units += serif ? 0.25 : 0.28;
    else if (/[ilI!|.,:;'`]/.test(character)) units += serif ? 0.27 : 0.25;
    else if (/[mwMW@%&]/.test(character)) units += serif ? 0.83 : 0.86;
    else if (/[A-Z0-9]/.test(character)) units += serif ? 0.62 : 0.61;
    else units += serif ? 0.49 : 0.51;
  }
  return units * size;
}

function drawText(page, value, x, y, size, font, color = COLORS.ink, align = 'left') {
  const text = normalizePdfText(value);
  const width = approximateTextWidth(text, size, font);
  const adjustedX = align === 'right' ? x - width : align === 'center' ? x - width / 2 : x;
  page.push(`BT /${font} ${point(size)} Tf ${colorValue(color)} rg 1 0 0 1 ${point(adjustedX)} ${point(y)} Tm (${pdfLiteral(text)}) Tj ET`);
}

function wrapText(value, maxWidth, size, font) {
  const text = normalizePdfText(value);
  if (!text) return [''];
  const lines = [];
  let line = '';

  for (const word of text.split(' ')) {
    if (approximateTextWidth(word, size, font) > maxWidth) {
      if (line) lines.push(line);
      line = '';
      let chunk = '';
      for (const character of word) {
        if (chunk && approximateTextWidth(chunk + character, size, font) > maxWidth) {
          lines.push(chunk);
          chunk = character;
        } else {
          chunk += character;
        }
      }
      line = chunk;
      continue;
    }

    const candidate = line ? `${line} ${word}` : word;
    if (line && approximateTextWidth(candidate, size, font) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }

  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function addPage(layout) {
  const page = [];
  layout.pages.push(page);
  layout.page = page;
  layout.y = 671;

  fillRect(page, 0, 0, PAGE_WIDTH, PAGE_HEIGHT, COLORS.page);
  fillRect(page, 0, 714, PAGE_WIDTH, PAGE_HEIGHT - 714, COLORS.ink);
  fillRect(page, 0, PAGE_HEIGHT - 7, 104, 7, COLORS.gold);
  fillRect(page, 104, PAGE_HEIGHT - 7, PAGE_WIDTH - 104, 7, COLORS.forest);
  drawImage(page, 'BrandMark', LEFT, 735, 148, 73);
  const pageTitle = layout.pages.length > 1 ? `${layout.documentTitle} · CONTINUACIÓN` : layout.documentTitle;
  drawText(page, pageTitle, RIGHT, 790, 10, 'F4', COLORS.ivory, 'right');
  drawLine(page, RIGHT - Math.min(approximateTextWidth(pageTitle, 10, 'F4'), 212), 779, RIGHT, 779, COLORS.gold, 0.8);
  drawText(page, 'ETÚCUARO, MICHOACÁN', RIGHT, 762, 7.5, 'F4', COLORS.water, 'right');
  fillRect(page, 0, 714, PAGE_WIDTH, 1.3, COLORS.forest);
}

function createLayout(documentTitle) {
  const layout = { documentTitle, pages: [], page: null, y: 0 };
  addPage(layout);
  return layout;
}

function ensureSpace(layout, height) {
  if (layout.y - height < FOOTER_LIMIT) addPage(layout);
}

function drawSectionTitle(layout, title) {
  ensureSpace(layout, 24);
  drawText(layout.page, title, LEFT, layout.y, 13, 'F2', COLORS.forest);
  layout.y -= 19;
}

function drawDocumentHeading(layout, title, order) {
  drawText(layout.page, title, LEFT, layout.y, 23, 'F2');
  layout.y -= 25;
  drawText(layout.page, `PEDIDO  ${order.id}`, LEFT, layout.y, 8, 'F4', COLORS.forest);
  layout.y -= 20;
}

function drawDeliveryBlock(layout, order) {
  const address = order.shippingAddress;
  const leftFields = [
    { text: order.recipientName, size: 9, font: 'F4', color: COLORS.ink },
    { text: `Correo: ${order.recipientEmail}`, size: 8, font: 'F3', color: COLORS.earth },
  ].flatMap((field) => wrapText(field.text, 216, field.size, field.font).map((text) => ({ ...field, text })));
  const rightFields = [
    `Calle: ${address.street} ${address.number}`,
    `Colonia: ${address.neighborhood}`,
    `Localidad: ${address.locality}, ${address.state}`,
    `Código postal: ${address.postalCode}`,
  ].flatMap((text) => wrapText(text, 216, 8, 'F3').map((line) => ({ text: line, size: 8, font: 'F3', color: COLORS.earth })));
  const rowCount = Math.max(leftFields.length, rightFields.length);
  const blockHeight = 28 + rowCount * 11 + 12;
  ensureSpace(layout, blockHeight + 42);
  drawSectionTitle(layout, 'Datos de entrega');

  const top = layout.y;
  const bottom = top - blockHeight;
  fillRect(layout.page, LEFT, bottom, CONTENT_WIDTH, blockHeight, COLORS.paper);
  fillRect(layout.page, LEFT, bottom, 1, blockHeight, COLORS.water);
  drawLine(layout.page, 300, bottom + 10, 300, top - 10, COLORS.line, 0.7);
  drawText(layout.page, 'Destinatario', LEFT + 15, top - 16, 8, 'F4', COLORS.forest);
  drawText(layout.page, 'Dirección de entrega', 316, top - 16, 8, 'F4', COLORS.forest);

  const firstBaseline = top - 33;
  leftFields.forEach((field, index) => {
    drawText(layout.page, field.text, LEFT + 15, firstBaseline - index * 11, field.size, field.font, field.color);
  });
  rightFields.forEach((field, index) => {
    drawText(layout.page, field.text, 316, firstBaseline - index * 11, field.size, field.font, field.color);
  });
  layout.y = bottom - 17;
}

function drawItemsTableHeader(layout) {
  const top = layout.y;
  const height = 22;
  fillRect(layout.page, LEFT, top - height, CONTENT_WIDTH, height, COLORS.forest);
  drawText(layout.page, 'PRODUCTO', LEFT + 8, top - 14, 7, 'F4', COLORS.ivory);
  drawText(layout.page, 'CANT.', 340, top - 14, 7, 'F4', COLORS.ivory, 'right');
  drawText(layout.page, 'PRECIO UNITARIO', 445, top - 14, 7, 'F4', COLORS.ivory, 'right');
  drawText(layout.page, 'IMPORTE', RIGHT - 8, top - 14, 7, 'F4', COLORS.ivory, 'right');
  drawLine(layout.page, LEFT, top - height, RIGHT, top - height, COLORS.gold, 0.8);
  layout.y = top - height - 8;
}

function drawItemsTable(layout, order) {
  drawSectionTitle(layout, 'Productos');
  drawItemsTableHeader(layout);

  for (const item of order.items) {
    const nameLines = wrapText(item.name, 235, 9, 'F3');
    const rowHeight = Math.max(26, nameLines.length * 11 + 12);
    if (layout.y - rowHeight < FOOTER_LIMIT + 9) {
      addPage(layout);
      drawItemsTableHeader(layout);
    }

    const baseline = layout.y - 10;
    nameLines.forEach((line, index) => {
      drawText(layout.page, line, LEFT + 8, baseline - index * 11, 9, 'F3');
    });
    drawText(layout.page, String(item.quantity), 340, baseline, 9, 'F3', COLORS.ink, 'right');
    drawText(layout.page, formatDocumentMoney(item.unitPriceCents, order.currency), 445, baseline, 9, 'F3', COLORS.ink, 'right');
    drawText(layout.page, formatDocumentMoney(item.lineTotalCents, order.currency), RIGHT - 8, baseline, 9, 'F4', COLORS.ink, 'right');
    layout.y -= rowHeight;
    drawLine(layout.page, LEFT, layout.y, RIGHT, layout.y, COLORS.line, 0.4);
  }
  layout.y -= 16;
}

function drawTotals(layout, order) {
  ensureSpace(layout, 77);
  const top = layout.y;
  const summaryLeft = 322;
  const summaryWidth = RIGHT - summaryLeft;
  drawLine(layout.page, summaryLeft, top, RIGHT, top, COLORS.forest, 0.8);
  drawText(layout.page, 'Subtotal', summaryLeft + 10, top - 17, 9, 'F3', COLORS.earth);
  drawText(layout.page, formatDocumentMoney(order.subtotalCents, order.currency), RIGHT - 10, top - 17, 9, 'F3', COLORS.ink, 'right');
  fillRect(layout.page, summaryLeft, top - 55, summaryWidth, 29, COLORS.forest);
  drawText(layout.page, 'TOTAL PAGADO', summaryLeft + 10, top - 44, 8, 'F4', COLORS.ivory);
  drawText(layout.page, formatDocumentMoney(order.totalCents, order.currency), RIGHT - 10, top - 44, 11, 'F4', COLORS.gold, 'right');
  layout.y = top - 69;
}

function finishPdf(layout) {
  const pageCount = layout.pages.length;
  for (const [index, page] of layout.pages.entries()) {
    drawLine(page, LEFT, 47, RIGHT, 47, COLORS.forest, 0.6);
    drawText(page, 'SEÑOR DEL MICTLÁN  ·  ETÚCUARO, MICHOACÁN', LEFT, 31, 7, 'F4', COLORS.earth);
    drawText(page, `PÁGINA ${index + 1} DE ${pageCount}`, RIGHT, 31, 7, 'F4', COLORS.forest, 'right');
  }
  return createPdf(layout.pages);
}

function createPdf(pages) {
  const logo = getBrandMark();
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ];
  const brandImageObjectId = objects.length + 1;
  objects.push(Buffer.concat([
    Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.bytes.length} >>\nstream\n`, 'ascii'),
    logo.bytes,
    Buffer.from('\nendstream', 'ascii'),
  ]));

  const firstPageObjectId = objects.length + 1;
  objects[1] = `<< /Type /Pages /Kids [${pages.map((_, index) => `${firstPageObjectId + index * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`;

  for (const page of pages) {
    const content = page.join('\n');
    const pageObjectId = objects.length + 1;
    const contentObjectId = pageObjectId + 1;
    objects.push(
      Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R /F4 6 0 R >> /XObject << /BrandMark ${brandImageObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`, 'ascii'),
      Buffer.from(`<< /Length ${Buffer.byteLength(content, 'ascii')} >>\nstream\n${content}\nendstream`, 'ascii'),
    );
  }

  const parts = [Buffer.from('%PDF-1.4\n', 'ascii')];
  let documentLength = parts[0].length;
  const offsets = [0];
  for (const [index, entry] of objects.entries()) {
    const body = Buffer.isBuffer(entry) ? entry : Buffer.from(entry, 'ascii');
    const prefix = Buffer.from(`${index + 1} 0 obj\n`, 'ascii');
    const suffix = Buffer.from('\nendobj\n', 'ascii');
    offsets.push(documentLength);
    parts.push(prefix, body, suffix);
    documentLength += prefix.length + body.length + suffix.length;
  }
  const xref = [
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`,
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`),
  ].join('');
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${documentLength}\n%%EOF`;
  parts.push(Buffer.from(xref + trailer, 'ascii'));
  return Buffer.concat(parts);
}

function getBrandMark() {
  if (!brandMark) {
    const bytes = readFileSync(BRAND_MARK_PATH);
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
      throw new TypeError('No se pudo cargar el emblema de Señor del Mictlán.');
    }
    brandMark = { width: BRAND_MARK_WIDTH, height: BRAND_MARK_HEIGHT, bytes };
  }
  return brandMark;
}

function createOrderCopy(order) {
  const layout = createLayout('DETALLE DEL PEDIDO');
  drawDocumentHeading(layout, 'Detalle del pedido', order);
  drawText(layout.page, `Fecha del pedido: ${formatTimestamp(order.createdAt)}`, LEFT, layout.y, 8, 'F3', COLORS.earth);
  layout.y -= 14;
  drawText(layout.page, `Pago confirmado: ${formatTimestamp(order.paidAt)}`, LEFT, layout.y, 8, 'F3', COLORS.forest);
  layout.y -= 18;
  drawDeliveryBlock(layout, order);
  drawItemsTable(layout, order);
  drawTotals(layout, order);
  return finishPdf(layout);
}

export function createPurchaseDocuments(input) {
  const order = validatePurchaseOrder(input);
  const orderLabel = safeOrderLabel(order.id);

  return [
    {
      filename: `detalle-pedido-${orderLabel}.pdf`,
      contentType: 'application/pdf',
      content: createOrderCopy(order),
    },
  ];
}
