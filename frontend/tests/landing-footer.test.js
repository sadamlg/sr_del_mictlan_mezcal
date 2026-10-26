const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = (file) => readFileSync(path.join(__dirname, file), 'utf8');

test('the footer CTA invites visitors back to the mezcal collection', () => {
  const footer = source('../src/components/landing/landing-footer.js');

  assert.equal([...footer.matchAll(/href:\s*'#coleccion'/g)].length, 1);
  assert.match(footer, /href="#coleccion"/);
  assert.match(footer, /<span>Explorar la colección<\/span>/);
});

test('every footer fragment link points to an existing landing section or footer anchor', () => {
  const footer = source('../src/components/landing/landing-footer.js');
  const page = source('../src/app/page.js');
  const landing = [
    source('../src/components/landing/landing-hero.js'),
    source('../src/components/landing/mezcal-showcase/mezcal-showcase.js'),
    source('../src/components/landing/landing-ritual.js'),
    source('../src/components/landing/faq/landing-faq.js'),
    source('../src/components/landing/faq/landing-faq-content.js'),
    footer,
    page,
  ].join('\n');
  const ids = new Set([
    ...[...landing.matchAll(/id="([^"]+)"/g)].map(([, id]) => id),
    ...[...landing.matchAll(/id: '([^']+)'/g)].map(([, id]) => id),
  ]);
  const links = [...footer.matchAll(/(?:href:\s*'|href=")(#[^'"]+)/g)].map(([, href]) => href.slice(1));

  assert.ok(links.length > 0);
  assert.deepEqual(links.filter((id) => !ids.has(id)), []);
});
