const assert = require('node:assert/strict');
const test = require('node:test');
const { nextInsight, formatAlcohol } = require('../src/components/landing/mezcal-showcase/insight-behavior');

test('hover and keyboard focus reveal one detail at a time', () => {
  assert.equal(nextInsight(null, 'hover:profile'), 'profile');
  assert.equal(nextInsight('profile', 'hover:alcohol'), 'alcohol');
  assert.equal(nextInsight(null, 'focus:volume'), 'volume');
});

test('touch toggles a detail while leaving the control or pressing Escape dismisses it', () => {
  assert.equal(nextInsight(null, 'touch:profile'), 'profile');
  assert.equal(nextInsight('profile', 'touch:profile'), null);
  assert.equal(nextInsight('profile', 'leave'), null);
  assert.equal(nextInsight('profile', 'escape'), null);
  assert.equal(nextInsight('alcohol', 'outside'), null);
});

test('keyboard activation can reopen a detail after Escape', () => {
  assert.equal(nextInsight(null, 'keyboard:profile'), 'profile');
  assert.equal(nextInsight('profile', 'escape'), null);
  assert.equal(nextInsight(null, 'keyboard:profile'), 'profile');
});

test('distinguishes an exact alcohol percentage from a documented range', () => {
  assert.equal(formatAlcohol({ minPercent: 45, maxPercent: 45 }), '45%');
  assert.equal(formatAlcohol({ minPercent: 36, maxPercent: 42 }), '36–42%');
});
