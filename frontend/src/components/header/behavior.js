function shouldHideHeaderOnScroll(scrollY, previousScrollY) {
  return scrollY > previousScrollY && scrollY > 80;
}

function shouldDisplayHeader(headerVisible, menuOpen) {
  return headerVisible || menuOpen;
}

function nextMenuState(open, action) {
  if (action === 'toggle') return !open;
  if (action === 'navigate' || action === 'desktop') return false;
  return open;
}

function getMenuToggleProps(isOpen) {
  return {
    'aria-expanded': isOpen,
    'aria-label': isOpen ? 'Cerrar menú' : 'Abrir menú',
  };
}

function getMobileNavigationProps(isOpen) {
  return {
    'aria-hidden': !isOpen,
    inert: !isOpen,
  };
}

function lockBodyScroll(body) {
  const previousOverflow = body.style.overflow;
  const previousTouchAction = body.style.touchAction;

  body.style.overflow = 'hidden';
  body.style.touchAction = 'none';

  return () => {
    body.style.overflow = previousOverflow;
    body.style.touchAction = previousTouchAction;
  };
}

module.exports = {
  getMenuToggleProps,
  getMobileNavigationProps,
  lockBodyScroll,
  nextMenuState,
  shouldDisplayHeader,
  shouldHideHeaderOnScroll,
};
