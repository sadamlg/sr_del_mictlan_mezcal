function nextInsight(current, action) {
  const [event, insight] = action.split(':');
  if (['profile', 'alcohol', 'volume'].includes(insight)) {
    if (event === 'hover' || event === 'focus') return insight;
    if (event === 'touch' || event === 'keyboard') return current === insight ? null : insight;
  }
  if (['leave', 'blur', 'escape', 'outside'].includes(action)) return null;
  return current;
}

function formatAlcohol(alcohol) {
  if (!alcohol) return '';
  const format = (value) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 }).format(value);
  return alcohol.minPercent === alcohol.maxPercent
    ? `${format(alcohol.minPercent)}%`
    : `${format(alcohol.minPercent)}–${format(alcohol.maxPercent)}%`;
}

module.exports = { nextInsight, formatAlcohol };
