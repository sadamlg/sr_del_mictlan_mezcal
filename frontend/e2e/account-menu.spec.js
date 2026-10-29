const { test, expect } = require('./fixtures');

async function acceptAgeForAccountFlow(page) {
  await page.addInitScript(() => window.sessionStorage.setItem('mictlan-age-confirmed-v1', 'yes'));
}

test('age verification is limited to the landing page', async ({ page }) => {
  await page.goto('/cuenta/iniciar-sesion');
  await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible();
  await page.waitForTimeout(1800);
  await expect(page.getByRole('dialog', { name: '¿Eres mayor de edad?' })).toHaveCount(0);
});

test('successful login returns to the landing page and exposes account actions', async ({ page }) => {
  await acceptAgeForAccountFlow(page);
  const account = {
    id: 'account-id',
    firstName: 'Ana María',
    lastName: 'Martínez López',
    email: 'ana@example.com',
    pendingEmail: null,
    emailVerified: true,
    dateOfBirth: '2000-04-12',
    address: {
      street: 'Calle del Mezcal',
      number: '123',
      neighborhood: 'Centro',
      locality: 'Morelia',
      state: 'Michoacán',
      postalCode: '58000',
    },
  };
  let currentAccount = null;
  let initialSessionCompleted = false;
  let sessionCalls = 0;
  await page.route('**/api/auth/session', async (route) => {
    sessionCalls += 1;
    if (sessionCalls === 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      initialSessionCompleted = true;
      return route.fulfill({ status: 401, json: { error: { message: 'Inicia sesión.' } } });
    }
    if (currentAccount) return route.fulfill({ status: 200, json: { account: currentAccount } });
    return route.fulfill({ status: 401, json: { error: { message: 'Inicia sesión.' } } });
  });
  await page.route('**/api/auth/login', async (route) => {
    currentAccount = account;
    await route.fulfill({ status: 200, json: { account } });
  });
  await page.route('**/api/profile', async (route) => {
    if (route.request().method() === 'PATCH') {
      const { firstName, lastName } = route.request().postDataJSON();
      currentAccount = { ...currentAccount, firstName, lastName };
    }
    await route.fulfill({ status: 200, json: { account: currentAccount } });
  });
  await page.route('**/api/auth/logout', async (route) => {
    currentAccount = null;
    await route.fulfill({ status: 204, body: '' });
  });

  await page.goto('/cuenta/iniciar-sesion');
  await expect(page.getByRole('link', { name: 'Iniciar sesión' })).toBeVisible();
  await page.getByLabel('Correo electrónico').fill(account.email);
  await page.getByLabel('Contraseña', { exact: true }).fill('mezcalSeguro2026');
  await page.getByRole('button', { name: 'Entrar a mi cuenta' }).click();

  const accountButton = page.getByRole('button', { name: 'Hola, Ana María' });
  await expect(accountButton).toBeVisible();
  await expect(page).toHaveURL('/');
  await expect.poll(() => initialSessionCompleted).toBe(true);
  await expect(accountButton).toBeVisible();

  await accountButton.click();
  const accountOptions = page.getByRole('navigation', { name: 'Opciones de cuenta' });
  await accountOptions.getByRole('link', { name: 'Cuenta' }).click();
  await expect(page).toHaveURL('/cuenta');
  await expect(page.getByLabel('Nombre(s)')).toHaveValue('Ana María');
  await expect(page.getByLabel('Apellidos')).toHaveValue('Martínez López');
  await page.getByLabel('Nombre(s)').fill('Ana');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByRole('button', { name: 'Hola, Ana' })).toBeVisible();
  await expect(page.getByText('Guardamos tus cambios.', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Hola, Ana' }).click();
  const options = page.getByRole('navigation', { name: 'Opciones de cuenta' });
  await expect(options.getByRole('link', { name: 'Mis pedidos' })).toBeVisible();
  await expect(options.getByRole('link', { name: 'Cuenta' })).toBeVisible();
  await expect(options.getByRole('link', { name: 'Mis pedidos' })).toHaveAttribute('href', '/cuenta/pedidos');
  await options.getByRole('link', { name: 'Mis pedidos' }).click();
  await expect(page).toHaveURL('/cuenta/pedidos');
  await page.getByRole('button', { name: 'Hola, Ana' }).click();
  await page.getByRole('navigation', { name: 'Opciones de cuenta' }).getByRole('link', { name: 'Cuenta' }).click();
  await expect(page).toHaveURL('/cuenta');
  await expect(page.getByText('Guardamos tus cambios.', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Correo confirmado: ana@example.com', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Hola, Ana' }).click();
  const reopenedOptions = page.getByRole('navigation', { name: 'Opciones de cuenta' });
  await expect(reopenedOptions.getByRole('link', { name: 'Mis pedidos' })).toBeVisible();
  await reopenedOptions.getByRole('button', { name: 'Cerrar sesión' }).click();

  await expect(page.getByRole('link', { name: 'Iniciar sesión' })).toBeVisible();
});

test('registration separates first names and surnames', async ({ page }) => {
  await acceptAgeForAccountFlow(page);
  await page.goto('/cuenta/registro');

  await expect(page.getByLabel('Nombre(s)')).toBeVisible();
  await expect(page.getByLabel('Apellidos')).toBeVisible();
  await expect(page.getByLabel('Nombre(s)')).toHaveAttribute('required', '');
  await expect(page.getByLabel('Apellidos')).toHaveAttribute('required', '');
  const birthDateButton = page.getByLabel('Fecha de nacimiento');
  await birthDateButton.click();
  const datePicker = page.getByRole('dialog', { name: 'Calendario de fecha de nacimiento' });
  await expect(datePicker.getByLabel('Año de nacimiento')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(datePicker).not.toBeVisible();
  await expect(birthDateButton).toBeFocused();
  await expect(page.getByRole('button', { name: 'Crear mi cuenta' })).toHaveCSS('background-color', 'rgb(15, 80, 71)');
});

test('registration submits the complete profile and shows the email confirmation state', async ({ page }) => {
  await acceptAgeForAccountFlow(page);
  let registration;
  await page.route('**/api/auth/register', async (route) => {
    registration = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Te enviamos un enlace para confirmar tu correo.' }),
    });
  });
  await page.goto('/cuenta/registro');

  await page.getByLabel('Nombre(s)').fill('Ana María');
  await page.getByLabel('Apellidos').fill('Martínez López');
  await page.getByLabel('Correo electrónico').fill('ana@example.com');
  await page.getByLabel('Contraseña · mínimo 12 caracteres').fill('mezcalSeguro2026');
  await page.getByLabel('Fecha de nacimiento').click();
  await page.getByRole('dialog', { name: 'Calendario de fecha de nacimiento' }).locator('button[tabindex="0"]').click();
  await page.getByLabel('Calle').fill('Calle del Mezcal');
  await page.getByLabel('Número exterior').fill('123');
  await page.getByLabel('Colonia').fill('Centro');
  await page.getByLabel('Ciudad o delegación').fill('Morelia');
  await page.getByLabel('Estado').fill('Michoacán');
  await page.getByLabel('Código postal').fill('58000');
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();

  await expect(page.getByRole('heading', { name: 'Revisa tu correo' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('confirmar tu correo');
  await expect.poll(() => registration).toMatchObject({
    firstName: 'Ana María',
    lastName: 'Martínez López',
    email: 'ana@example.com',
    password: 'mezcalSeguro2026',
    address: {
      street: 'Calle del Mezcal',
      number: '123',
      neighborhood: 'Centro',
      locality: 'Morelia',
      state: 'Michoacán',
      postalCode: '58000',
    },
  });
  expect(registration.dateOfBirth).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test('password recovery requests an email and validates the new password before sending it', async ({ page }) => {
  let resetRequest;
  let resetCompletion;
  await page.route('**/api/auth/password-reset-requests', async (route) => {
    resetRequest = route.request().postDataJSON();
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Si la cuenta existe, recibirás instrucciones por correo.' }),
    });
  });
  await page.route('**/api/auth/password-resets', async (route) => {
    resetCompletion = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'La contraseña se actualizó correctamente.' }),
    });
  });

  await page.goto('/cuenta/recuperar-contrasena');
  await page.getByLabel('Correo electrónico').fill('ana@example.com');
  await page.getByRole('button', { name: 'Enviar instrucciones' }).click();
  await expect(page.getByRole('status')).toContainText('recibirás instrucciones');
  await expect.poll(() => resetRequest).toEqual({ email: 'ana@example.com' });

  await page.goto('/cuenta/restablecer-contrasena?token=token-de-prueba');
  await page.getByLabel('Nueva contraseña').fill('mezcalSeguro2026');
  await page.getByLabel('Repite la contraseña').fill('otraClaveSegura2026');
  await page.getByRole('button', { name: 'Guardar contraseña' }).click();
  await expect(page.getByText('Las contraseñas no coinciden.', { exact: true })).toBeVisible();
  expect(resetCompletion).toBeUndefined();

  await page.getByLabel('Repite la contraseña').fill('mezcalSeguro2026');
  await page.getByRole('button', { name: 'Guardar contraseña' }).click();
  await expect(page.getByRole('status')).toContainText('se actualizó correctamente');
  await expect.poll(() => resetCompletion).toEqual({ token: 'token-de-prueba', password: 'mezcalSeguro2026' });
});

test('an authenticated customer can browse the landing without an age gate', async ({ page }) => {
  let sessionCalls = 0;
  await page.route('**/api/auth/session', (route) => {
    sessionCalls += 1;
    return route.fulfill({
      status: 200,
      json: { account: { id: 'account-id', firstName: 'Ana', lastName: 'Martínez' } },
    });
  });
  await page.route('**/api/cart/account**', (route) => route.fulfill({
    status: 200,
    json: { cart: { items: [], subtotal: { amount: 0, currency: 'MXN' } } },
  }));

  await page.goto('/#coleccion');
  await expect.poll(() => sessionCalls).toBeGreaterThan(0);
  await expect(page.getByRole('dialog', { name: '¿Eres mayor de edad?' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Totonalhuan' })).toBeVisible();
});

test('email confirmation activates the account and returns the customer to the landing', async ({ page }) => {
  let account = null;
  let confirmationPayload;
  await page.route('**/api/auth/session', (route) => (
    account
      ? route.fulfill({ status: 200, json: { account } })
      : route.fulfill({ status: 401, json: { error: { message: 'Inicia sesión.' } } })
  ));
  await page.route('**/api/cart/account**', (route) => route.fulfill({
    status: 200,
    json: { cart: { items: [], subtotal: { amount: 0, currency: 'MXN' } } },
  }));
  await page.route('**/api/auth/email-confirmations', async (route) => {
    confirmationPayload = route.request().postDataJSON();
    account = { id: 'account-id', firstName: 'Ana', lastName: 'Martínez' };
    await route.fulfill({ status: 200, json: { accountActivated: true } });
  });

  await page.goto('/cuenta/confirmar-correo?token=token-de-prueba');

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('button', { name: 'Hola, Ana' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: '¿Eres mayor de edad?' })).toHaveCount(0);
  expect(confirmationPayload).toEqual({ token: 'token-de-prueba' });
});

test('orders remain private and prompt signed-out visitors to sign in', async ({ page }) => {
  await page.goto('/cuenta/pedidos');
  await expect(page.getByRole('heading', { name: 'Inicia sesión para ver tus pedidos' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Crear una cuenta' })).toBeVisible();
});

test('authenticated orders show the empty state and point back to the collection', async ({ page }) => {
  await page.route('**/api/auth/session', (route) => route.fulfill({
    status: 200,
    json: { account: { id: 'account-id', firstName: 'Ana', lastName: 'Martínez' } },
  }));
  await page.route('**/api/cart/account**', (route) => route.fulfill({
    status: 200,
    json: { cart: { items: [], subtotal: { amount: 0, currency: 'MXN' } } },
  }));
  await page.route('**/api/orders', (route) => route.fulfill({ status: 200, json: { orders: [] } }));
  await page.goto('/cuenta/pedidos');

  await expect(page.getByText('Todavía no tienes pedidos', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Explorar la colección' })).toHaveAttribute('href', '/#coleccion');
  await expect(page.getByRole('navigation', { name: 'Secciones de tu cuenta' }).getByRole('link', { name: 'Mis pedidos' })).toHaveAttribute('aria-current', 'page');
});

test('mobile account menu shows orders, account, and sign out', async ({ page }) => {
  await acceptAgeForAccountFlow(page);
  let sessionCalls = 0;
  await page.route('**/api/auth/session', (route) => {
    sessionCalls += 1;
    return route.fulfill({
      status: 200,
      json: { account: { id: 'account-id', firstName: 'Ana', lastName: 'Martínez' } },
    });
  });
  await page.goto('/');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => sessionCalls).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Abrir menú' }).click();

  await expect(page.locator('#mobile-navigation').getByText('Hola, Ana', { exact: true })).toBeVisible();
  const options = page.getByRole('navigation', { name: 'Opciones de cuenta' });
  await expect(options.getByRole('link', { name: 'Mis pedidos' })).toBeVisible();
  await expect(options.getByRole('link', { name: 'Cuenta' })).toBeVisible();
  await expect(options.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
});

test('mobile signed-out account entry opens sign-in with a create-account option', async ({ page }) => {
  await acceptAgeForAccountFlow(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/auth/session', (route) => route.fulfill({
    status: 401,
    json: { error: { message: 'Inicia sesión.' } },
  }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Abrir menú' }).click();

  const mobileNavigation = page.locator('#mobile-navigation');
  await expect(mobileNavigation.getByRole('link', { name: 'Iniciar sesión' })).toBeVisible();
  await expect(mobileNavigation.getByRole('link', { name: 'Crear cuenta' })).toHaveCount(0);
  await mobileNavigation.getByRole('link', { name: 'Iniciar sesión' }).click();

  await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Crear una cuenta' })).toBeVisible();
});

test('sign-in view fits tall screens, omits the removed skull, and includes accessible credential controls', async ({ page }) => {
  await acceptAgeForAccountFlow(page);
  await page.setViewportSize({ width: 488, height: 803 });
  await page.route('**/api/auth/session', (route) => route.fulfill({
    status: 401,
    json: { error: { message: 'Inicia sesión.' } },
  }));
  await page.goto('/cuenta/iniciar-sesion');

  const emailInput = page.getByLabel('Correo electrónico');
  const passwordInput = page.getByLabel('Contraseña', { exact: true });
  const skull = page.locator('img[src*="skull.png"]');
  const eyebrow = page.getByText('Tu cuenta', { exact: true });
  const forgotLink = page.getByRole('link', { name: '¿Olvidaste tu contraseña?' });
  const passwordLabel = page.getByText('Contraseña', { exact: true });
  const loginButton = page.getByRole('button', { name: 'Entrar a mi cuenta' });

  await expect(emailInput).toBeVisible();
  await expect(skull).toHaveCount(0);
  await expect(eyebrow).toBeVisible();
  await expect(page.locator('.lucide-mail')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mostrar contraseña' })).toBeVisible();
  await expect(loginButton).toHaveCSS('background-color', 'rgb(15, 80, 71)');
  await expect(loginButton).toHaveCSS('color', 'rgb(226, 227, 224)');
  await loginButton.hover();
  await expect(loginButton).toHaveCSS('background-color', 'rgb(21, 105, 93)');
  await page.mouse.move(0, 0);
  await expect.poll(async () => {
    const labelBox = await passwordLabel.boundingBox();
    const linkBox = await forgotLink.boundingBox();
    return Math.abs(labelBox.y - linkBox.y);
  }).toBeLessThan(3);
  await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
  await expect(passwordInput).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Ocultar contraseña' }).click();
  await expect(passwordInput).toHaveAttribute('type', 'password');
  await expect(page.locator('footer').filter({ hasText: 'Etúcuaro, Michoacán' })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);

  await page.setViewportSize({ width: 488, height: 620 });
  expect(await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight)).toBe(true);
});
