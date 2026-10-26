const assert = require('node:assert/strict');
const test = require('node:test');
const {
  AGE_GATE_PHASES,
  getShowcaseObserverOptions,
  nextAgeGatePhase,
} = require('../src/components/age-gate-behavior');

test('the age gate remains armed until the mezcal showcase enters the viewport', () => {
  assert.equal(
    nextAgeGatePhase(AGE_GATE_PHASES.ARMED, 'showcase-entered'),
    AGE_GATE_PHASES.VISIBLE,
  );
  assert.equal(
    nextAgeGatePhase(AGE_GATE_PHASES.ARMED, 'showcase-left'),
    AGE_GATE_PHASES.ARMED,
  );
});

test('confirming age permanently clears the gate for the current render', () => {
  assert.equal(
    nextAgeGatePhase(AGE_GATE_PHASES.VISIBLE, 'confirm'),
    AGE_GATE_PHASES.VERIFIED,
  );
  assert.equal(
    nextAgeGatePhase(AGE_GATE_PHASES.VERIFIED, 'showcase-entered'),
    AGE_GATE_PHASES.VERIFIED,
  );
});

test('the showcase observer opens the gate shortly after the section starts appearing', () => {
  assert.deepEqual(getShowcaseObserverOptions(), {
    root: null,
    rootMargin: '0px 0px -8% 0px',
    threshold: 0.08,
  });
});
