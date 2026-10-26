import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeEmail,
  validateProfileInput,
  validateRegistrationInput,
} from './validation.js';

const today = new Date('2026-10-26T12:00:00.000Z');

function validRegistration(overrides = {}) {
  return {
    name: '  Ana   Martínez  ',
    email: ' ANA@example.com ',
    password: 'mezcalSeguro2026',
    dateOfBirth: '2000-04-12',
    address: {
      street: 'Calle del Mezcal',
      number: '123',
      neighborhood: 'Centro',
      locality: 'Morelia',
      state: 'Michoacán',
      postalCode: '58000',
    },
    ...overrides,
  };
}

test('normalizes account emails before uniqueness checks', () => {
  assert.equal(normalizeEmail('  ANA.ME ZCAL@Example.COM  '), 'ana.me zcal@example.com');
});

test('accepts a complete account whose 18th birthday is today', () => {
  const result = validateRegistrationInput(validRegistration({ dateOfBirth: '2008-10-26' }), today);

  assert.equal(result.success, true);
  assert.equal(result.data.name, 'Ana Martínez');
  assert.equal(result.data.email, 'ana@example.com');
  assert.equal(result.data.address.state, 'Michoacán');
});

test('rejects an account younger than 18', () => {
  const result = validateRegistrationInput(validRegistration({ dateOfBirth: '2008-10-27' }), today);

  assert.equal(result.success, false);
  assert.equal(result.errors.dateOfBirth, 'Debes tener al menos 18 años.');
});

test('rejects malformed and future birth dates', () => {
  for (const dateOfBirth of ['2000-02-30', '2026-10-27', '12/04/2000']) {
    const result = validateRegistrationInput(validRegistration({ dateOfBirth }), today);
    assert.equal(result.success, false, dateOfBirth);
    assert.equal(typeof result.errors.dateOfBirth, 'string');
  }
});

test('requires all Mexico address fields and a five-digit postal code', () => {
  const missing = validateRegistrationInput(validRegistration({
    address: { ...validRegistration().address, neighborhood: ' ' },
  }), today);
  const postal = validateRegistrationInput(validRegistration({
    address: { ...validRegistration().address, postalCode: '5800A' },
  }), today);

  assert.equal(missing.success, false);
  assert.equal(missing.errors['address.neighborhood'], 'Escribe la colonia.');
  assert.equal(postal.success, false);
  assert.equal(postal.errors['address.postalCode'], 'Escribe un código postal de cinco dígitos.');
});

test('rejects short passwords and unexpected registration fields', () => {
  const password = validateRegistrationInput(validRegistration({ password: 'short' }), today);
  const extra = validateRegistrationInput({ ...validRegistration(), role: 'admin' }, today);

  assert.equal(password.success, false);
  assert.equal(password.errors.password, 'La contraseña debe tener al menos 12 caracteres.');
  assert.equal(extra.success, false);
  assert.equal(extra.errors.input, 'La solicitud contiene campos no permitidos.');
});

test('accepts a partial profile update and rejects empty or unknown fields', () => {
  assert.deepEqual(validateProfileInput({ name: ' Ana María ' }, today), {
    success: true,
    data: { name: 'Ana María' },
  });
  assert.equal(validateProfileInput({}, today).success, false);
  assert.equal(validateProfileInput({ isAdmin: true }, today).success, false);
});

test('profile birth dates use the same adulthood validation as registration', () => {
  const result = validateProfileInput({ dateOfBirth: '2009-01-01' }, today);

  assert.equal(result.success, false);
  assert.equal(result.errors.dateOfBirth, 'Debes tener al menos 18 años.');
});
