import { createOpaqueToken, hashPassword, hashToken, verifyPassword } from './crypto.js';
import { normalizeEmail, validateProfileInput, validateRegistrationInput } from './validation.js';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_PATTERN = /^.{12,128}$/s;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DUMMY_PASSWORD_HASH = ['scrypt', '16384', '8', '1', '0'.repeat(32), '0'.repeat(128)].join('$');

export class AccountError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.name = 'AccountError';
    this.status = status;
    this.code = code;
    if (fields) this.fields = fields;
  }
}

export function toPublicAccount(account) {
  return {
    id: account.id,
    firstName: account.firstName,
    lastName: account.lastName,
    email: account.email,
    pendingEmail: account.pendingEmail ?? null,
    emailVerified: Boolean(account.emailVerifiedAt),
    dateOfBirth: dateOnly(account.dateOfBirth),
    address: {
      street: account.street,
      number: account.number,
      neighborhood: account.neighborhood,
      locality: account.locality,
      state: account.state,
      postalCode: account.postalCode,
    },
  };
}

function toPublicOrder(order) {
  const money = (amount) => ({ amount, currency: order.currency });
  return {
    id: order.id,
    status: order.status,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    subtotal: money(order.subtotalCents),
    total: money(order.totalCents),
    items: order.items.map((item) => ({
      slug: item.slug,
      name: item.name,
      quantity: item.quantity,
      unitPrice: money(item.unitPriceCents),
      lineTotal: money(item.lineTotalCents),
    })),
  };
}

function dateOnly(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value;
}

function ensureInput(condition, fields, message = 'Revisa los datos e inténtalo de nuevo.') {
  if (!condition) throw new AccountError(422, 'VALIDATION_ERROR', message, fields);
}

function ensureSessionToken(token) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{40,}$/.test(token)) {
    throw new AccountError(401, 'AUTHENTICATION_REQUIRED', 'Inicia sesión para continuar.');
  }
}

export function createAccountService({
  repository,
  orderRepository = repository,
  now = () => new Date(),
  tokenFactory = createOpaqueToken,
  hashTokenValue = hashToken,
  hashPasswordValue = hashPassword,
  verifyPasswordValue = verifyPassword,
  sessionDurationMs = SESSION_DURATION_MS,
}) {
  async function createSession(accountId) {
    const sessionToken = tokenFactory();
    const expiresAt = new Date(now().getTime() + sessionDurationMs);
    await repository.createSession({
      accountId,
      tokenHash: hashTokenValue(sessionToken),
      expiresAt,
    });
    return { sessionToken, expiresAt };
  }

  return {
    async register(input) {
      const validated = validateRegistrationInput(input, now());
      ensureInput(validated.success, validated.errors);
      const { password, dateOfBirth, address, ...accountData } = validated.data;
      let created;

      try {
        created = await repository.createAccount({
          account: {
            ...accountData,
            ...address,
            dateOfBirth: new Date(`${dateOfBirth}T00:00:00.000Z`),
          },
          passwordHash: await hashPasswordValue(password),
          emailJobType: 'ACCOUNT_CONFIRMATION',
        });
      } catch (error) {
        if (error?.code === 'P2002' || error?.code === 'EMAIL_IN_USE') {
          throw new AccountError(409, 'EMAIL_IN_USE', 'Ese correo ya está registrado.');
        }
        throw error;
      }

      return {
        message: 'Revisa tu correo para activar la cuenta. Confirma la dirección antes de iniciar sesión.',
        email: created.email,
      };
    },

    async login(input) {
      if (!input || typeof input !== 'object' || Array.isArray(input)) {
        throw new AccountError(422, 'VALIDATION_ERROR', 'Escribe tu correo y contraseña.');
      }
      const email = normalizeEmail(input.email);
      const password = typeof input.password === 'string' ? input.password : '';
      if (!EMAIL_PATTERN.test(email) || password.length === 0 || password.length > 128 || Object.keys(input).some((key) => !['email', 'password'].includes(key))) {
        throw new AccountError(422, 'VALIDATION_ERROR', 'Escribe un correo y contraseña válidos.');
      }

      const found = await repository.findAccountByEmail(email);
      const validPassword = await verifyPasswordValue(password, found?.passwordHash ?? DUMMY_PASSWORD_HASH);
      if (!found || !validPassword) {
        throw new AccountError(401, 'INVALID_CREDENTIALS', 'El correo o la contraseña no son correctos.');
      }
      if (!found.emailVerifiedAt) {
        throw new AccountError(403, 'EMAIL_NOT_VERIFIED', 'Confirma tu correo antes de iniciar sesión. Usa el enlace que te enviamos al registrarte.');
      }

      const session = await createSession(found.id);
      return { account: toPublicAccount(found), ...session };
    },

    async logout(sessionToken) {
      if (typeof sessionToken === 'string' && /^[A-Za-z0-9_-]{40,}$/.test(sessionToken)) {
        await repository.revokeSession(hashTokenValue(sessionToken), now());
      }
    },

    async getSession(sessionToken) {
      ensureSessionToken(sessionToken);
      const tokenHash = hashTokenValue(sessionToken);
      const timestamp = now();
      const session = await repository.findSessionByTokenHash(tokenHash, timestamp);
      if (!session) throw new AccountError(401, 'AUTHENTICATION_REQUIRED', 'Inicia sesión para continuar.');
      if (!session.account?.emailVerifiedAt) {
        await repository.revokeSession(tokenHash, timestamp);
        throw new AccountError(401, 'AUTHENTICATION_REQUIRED', 'Confirma tu correo para activar la cuenta; después inicia sesión.');
      }
      return toPublicAccount(session.account);
    },

    async getProfile(accountId) {
      const account = await repository.findAccountById(accountId);
      if (!account) throw new AccountError(401, 'AUTHENTICATION_REQUIRED', 'Inicia sesión para continuar.');
      return toPublicAccount(account);
    },

    async requestPasswordReset(input) {
      const email = normalizeEmail(input?.email);
      if (!EMAIL_PATTERN.test(email) || Object.keys(input ?? {}).some((key) => key !== 'email')) {
        throw new AccountError(422, 'VALIDATION_ERROR', 'Escribe un correo electrónico válido.');
      }
      await repository.enqueuePasswordReset(email);
      return { message: 'Si el correo tiene una cuenta, recibirás instrucciones para cambiar la contraseña.' };
    },

    async resetPassword(input) {
      const token = input?.token;
      const password = input?.password;
      if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{40,}$/.test(token) || !PASSWORD_PATTERN.test(password ?? '')) {
        throw new AccountError(422, 'VALIDATION_ERROR', 'El enlace o la nueva contraseña no son válidos.', {
          password: 'La contraseña debe tener al menos 12 caracteres.',
        });
      }
      const updated = await repository.resetPassword({
        tokenHash: hashTokenValue(token),
        passwordHash: await hashPasswordValue(password),
        now: now(),
      });
      if (!updated) throw new AccountError(400, 'RESET_LINK_INVALID', 'El enlace venció o ya se utilizó. Solicita uno nuevo.');
      return { message: 'Tu contraseña se actualizó. Ya puedes iniciar sesión.' };
    },

    async confirmEmail(input) {
      const token = input?.token;
      if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{40,}$/.test(token)) {
        throw new AccountError(400, 'EMAIL_CONFIRMATION_INVALID', 'El enlace de confirmación no es válido.');
      }
      let confirmation;
      try {
        confirmation = await repository.confirmEmail(hashTokenValue(token), now());
      } catch (error) {
        if (error?.code === 'P2002') {
          throw new AccountError(409, 'EMAIL_IN_USE', 'Ese correo ya pertenece a otra cuenta.');
        }
        throw error;
      }
      if (!confirmation) throw new AccountError(400, 'EMAIL_CONFIRMATION_INVALID', 'El enlace venció o ya se utilizó.');
      const accountActivated = confirmation.purpose === 'ACCOUNT_CONFIRMATION';
      const session = accountActivated ? await createSession(confirmation.accountId) : {};
      return {
        message: accountActivated ? 'Tu cuenta está activa.' : 'Tu correo quedó actualizado.',
        accountActivated,
        ...session,
      };
    },

    async updateProfile(accountId, input) {
      const validated = validateProfileInput(input, now());
      ensureInput(validated.success, validated.errors);
      const current = await repository.findAccountById(accountId);
      if (!current) throw new AccountError(401, 'AUTHENTICATION_REQUIRED', 'Inicia sesión para continuar.');

      const updates = { ...validated.data };
      const currentPassword = updates.currentPassword;
      delete updates.currentPassword;
      let pendingEmail;
      let emailJobType;

      if (updates.email === current.email) {
        delete updates.email;
      } else if (updates.email) {
        if (!currentPassword) {
          throw new AccountError(422, 'VALIDATION_ERROR', 'Confirma tu contraseña para cambiar el correo.', {
            currentPassword: 'Escribe tu contraseña actual.',
          });
        }
        if (!(await verifyPasswordValue(currentPassword, current.passwordHash))) {
          throw new AccountError(401, 'INVALID_CREDENTIALS', 'La contraseña actual no es correcta.');
        }
        const existing = await repository.findAccountByEmailForUpdate(updates.email);
        if (existing && existing.id !== accountId) {
          throw new AccountError(409, 'EMAIL_IN_USE', 'Ese correo ya está registrado.');
        }
        pendingEmail = updates.email;
        emailJobType = 'EMAIL_CHANGE_CONFIRMATION';
        delete updates.email;
      }

      if (updates.dateOfBirth) updates.dateOfBirth = new Date(`${updates.dateOfBirth}T00:00:00.000Z`);
      if (updates.address) {
        for (const [field, value] of Object.entries(updates.address)) updates[field] = value;
        delete updates.address;
      }

      if (Object.keys(updates).length === 0 && !pendingEmail) return toPublicAccount(current);
      try {
        const changed = await repository.updateProfile({ accountId, updates, pendingEmail, emailJobType });
        return toPublicAccount(changed);
      } catch (error) {
        if (error?.code === 'P2002') {
          throw new AccountError(409, 'EMAIL_IN_USE', 'Ese correo ya está registrado.');
        }
        throw error;
      }
    },

    async listOrders(accountId) {
      const orders = await orderRepository.listPaidOrders(accountId);
      return orders.map(toPublicOrder);
    },
  };
}
