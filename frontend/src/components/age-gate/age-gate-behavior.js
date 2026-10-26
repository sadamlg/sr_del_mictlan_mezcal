const AGE_GATE_PHASES = Object.freeze({
  CHECKING: 'checking',
  ARMED: 'armed',
  VISIBLE: 'visible',
  VERIFIED: 'verified',
});

function nextAgeGatePhase(phase, action) {
  if (phase === AGE_GATE_PHASES.ARMED && action === 'showcase-entered') {
    return AGE_GATE_PHASES.VISIBLE;
  }

  if (phase === AGE_GATE_PHASES.VISIBLE && action === 'confirm') {
    return AGE_GATE_PHASES.VERIFIED;
  }

  return phase;
}

function getShowcaseObserverOptions() {
  return {
    root: null,
    rootMargin: '0px 0px -8% 0px',
    threshold: 0.08,
  };
}

module.exports = {
  AGE_GATE_PHASES,
  getShowcaseObserverOptions,
  nextAgeGatePhase,
};
