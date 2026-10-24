const assert = require('node:assert/strict');
const test = require('node:test');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const footer = readFileSync(
  path.join(__dirname, '../src/components/landing/landing-footer.js'),
  'utf8',
);

test('the footer CTA uses native fragment navigation so it works when #coleccion is already active', () => {
  const cta = footer.match(/<(Link|a)\b[\s\S]*?href="#coleccion"[\s\S]*?<span>Explorar la colección<\/span>/);

  assert.ok(cta, 'the collection CTA should link to #coleccion');
  assert.equal(cta[1], 'a');
});
