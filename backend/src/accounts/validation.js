const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const POSTAL_CODE_PATTERN = /^\d{5}$/;
const PROFILE_FIELDS = new Set(['name', 'email', 'dateOfBirth', 'address', 'currentPassword']);
const REGISTRATION_FIELDS = new Set([
  'name',
  'email',
  'password',
  'dateOfBirth',
  'address',
]);
const ADDRESS_FIELDS = ['street', 'number', 'neighborhood', 'locality', 'state', 'postalCode'];

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

export function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function ageOnDate(dateOfBirth, today) {
  const [birthYear, birthMonth, birthDay] = dateOfBirth.split('-').map(Number);
  const currentYear = today.getUTCFullYear();
  const currentMonth = today.getUTCMonth() + 1;
  const currentDay = today.getUTCDate();
  let age = currentYear - birthYear;

  if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) age -= 1;
  return age;
}

function validateDateOfBirth(value, errors, today) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    errors.dateOfBirth = 'Escribe una fecha de nacimiento válida.';
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    errors.dateOfBirth = 'Escribe una fecha de nacimiento válida.';
    return false;
  }

  if (value > today.toISOString().slice(0, 10)) {
    errors.dateOfBirth = 'La fecha de nacimiento no puede estar en el futuro.';
    return false;
  }

  if (ageOnDate(value, today) < 18) {
    errors.dateOfBirth = 'Debes tener al menos 18 años.';
    return false;
  }

  return true;
}

function validateAddress(input, errors, { requireAll }) {
  if (!isRecord(input)) {
    errors.address = 'Completa tu dirección.';
    return undefined;
  }

  const address = {};
  for (const field of ADDRESS_FIELDS) {
    const value = normalizeText(input[field]);
    if (!value) {
      if (requireAll) errors[`address.${field}`] = addressFieldMessage(field);
      continue;
    }
    if (value.length > 120) {
      errors[`address.${field}`] = 'El campo no puede superar 120 caracteres.';
      continue;
    }
    if (field === 'postalCode' && !POSTAL_CODE_PATTERN.test(value)) {
      errors['address.postalCode'] = 'Escribe un código postal de cinco dígitos.';
      continue;
    }
    address[field] = value;
  }

  if (Object.keys(input).some((field) => !ADDRESS_FIELDS.includes(field))) {
    errors['address.input'] = 'La dirección contiene campos no permitidos.';
  }
  if (!requireAll && Object.keys(address).length === 0 && Object.keys(input).length === 0) {
    errors['address.input'] = 'Actualiza al menos un campo de dirección.';
  }

  return address;
}

function addressFieldMessage(field) {
  const labels = {
    street: 'Escribe la calle.',
    number: 'Escribe el número.',
    neighborhood: 'Escribe la colonia.',
    locality: 'Escribe la ciudad o delegación.',
    state: 'Escribe el estado.',
    postalCode: 'Escribe el código postal.',
  };
  return labels[field];
}

function validateName(value, errors) {
  const name = normalizeText(value);
  if (name.length < 2) errors.name = 'Escribe tu nombre.';
  else if (name.length > 120) errors.name = 'El nombre no puede superar 120 caracteres.';
  return name;
}

function validateEmail(value, errors) {
  const email = normalizeEmail(value);
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) errors.email = 'Escribe un correo electrónico válido.';
  return email;
}

function hasUnexpectedFields(input, allowedFields) {
  return Object.keys(input).some((field) => !allowedFields.has(field));
}

export function validateRegistrationInput(input, today = new Date()) {
  if (!isRecord(input)) return { success: false, errors: { input: 'La solicitud no es válida.' } };
  const errors = {};
  if (hasUnexpectedFields(input, REGISTRATION_FIELDS)) {
    errors.input = 'La solicitud contiene campos no permitidos.';
  }

  const name = validateName(input.name, errors);
  const email = validateEmail(input.email, errors);
  const password = typeof input.password === 'string' ? input.password : '';
  if (password.length < 12) errors.password = 'La contraseña debe tener al menos 12 caracteres.';
  else if (password.length > 128) errors.password = 'La contraseña no puede superar 128 caracteres.';

  validateDateOfBirth(input.dateOfBirth, errors, today);
  const address = validateAddress(input.address, errors, { requireAll: true });

  if (Object.keys(errors).length > 0) return { success: false, errors };
  return {
    success: true,
    data: { name, email, password, dateOfBirth: input.dateOfBirth, address },
  };
}

export function validateProfileInput(input, today = new Date()) {
  if (!isRecord(input)) return { success: false, errors: { input: 'La solicitud no es válida.' } };
  const errors = {};
  if (hasUnexpectedFields(input, PROFILE_FIELDS)) {
    errors.input = 'La solicitud contiene campos no permitidos.';
  }
  if (Object.keys(input).length === 0) errors.input = 'Actualiza al menos un campo.';

  const data = {};
  if ('name' in input) data.name = validateName(input.name, errors);
  if ('email' in input) data.email = validateEmail(input.email, errors);
  if ('dateOfBirth' in input) {
    validateDateOfBirth(input.dateOfBirth, errors, today);
    data.dateOfBirth = input.dateOfBirth;
  }
  if ('address' in input) data.address = validateAddress(input.address, errors, { requireAll: false });
  if ('currentPassword' in input) {
    if (typeof input.currentPassword !== 'string' || input.currentPassword.length === 0) {
      errors.currentPassword = 'Confirma tu contraseña actual.';
    } else if (input.currentPassword.length > 128) {
      errors.currentPassword = 'La contraseña actual no es válida.';
    } else {
      data.currentPassword = input.currentPassword;
    }
  }

  if (Object.keys(errors).length > 0) return { success: false, errors };
  return { success: true, data };
}
