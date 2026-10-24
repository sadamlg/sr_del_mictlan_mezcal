const assert = require('node:assert/strict');
const test = require('node:test');
const {
  getMenuToggleProps,
  getMobileNavigationProps,
  shouldDisplayHeader,
  lockBodyScroll,
  nextMenuState,
  shouldHideHeaderOnScroll,
} = require('../src/components/header/behavior');

test('el header se oculta al bajar por encima de 80 px y reaparece al subir', () => {
  assert.equal(shouldHideHeaderOnScroll(0, 0), false);
  assert.equal(shouldHideHeaderOnScroll(80, 79), false);
  assert.equal(shouldHideHeaderOnScroll(81, 80), true);
  assert.equal(shouldHideHeaderOnScroll(80, 81), false);
});

test('el header permanece visible mientras el menú móvil está abierto', () => {
  assert.equal(shouldDisplayHeader(false, true), true);
  assert.equal(shouldDisplayHeader(false, false), false);
  assert.equal(shouldDisplayHeader(true, false), true);
});

test('el menú alterna y se cierra al navegar o cambiar a escritorio', () => {
  assert.equal(nextMenuState(false, 'toggle'), true);
  assert.equal(nextMenuState(true, 'toggle'), false);
  assert.equal(nextMenuState(true, 'navigate'), false);
  assert.equal(nextMenuState(true, 'desktop'), false);
  assert.equal(nextMenuState(true, 'unknown'), true);
});

test('el botón de menú anuncia su estado y su acción', () => {
  assert.deepEqual(getMenuToggleProps(false), {
    'aria-expanded': false,
    'aria-label': 'Abrir menú',
  });
  assert.deepEqual(getMenuToggleProps(true), {
    'aria-expanded': true,
    'aria-label': 'Cerrar menú',
  });
});

test('la navegación móvil sólo entra en el árbol accesible cuando está abierta', () => {
  assert.deepEqual(getMobileNavigationProps(false), {
    'aria-hidden': true,
    inert: true,
  });
  assert.deepEqual(getMobileNavigationProps(true), {
    'aria-hidden': false,
    inert: false,
  });
});

test('el menú bloquea el scroll del documento y restaura los estilos previos al cerrarse', () => {
  const body = { style: { overflow: 'auto', touchAction: 'pan-y' } };

  const restoreScroll = lockBodyScroll(body);

  assert.equal(body.style.overflow, 'hidden');
  assert.equal(body.style.touchAction, 'none');

  restoreScroll();

  assert.equal(body.style.overflow, 'auto');
  assert.equal(body.style.touchAction, 'pan-y');
});
