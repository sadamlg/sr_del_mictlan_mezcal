const { test, expect } = require('@playwright/test');

async function acceptAgeForAccountFlow(page) {
  await page.addInitScript(() => window.sessionStorage.setItem('mictlan-age-confirmed-v1', 'yes'));
}

test('login updates the account greeting and exposes account actions', async ({ page }) => {
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
  await expect.poll(() => initialSessionCompleted).toBe(true);
  await expect(accountButton).toBeVisible();
  await expect(page.getByLabel('Nombre(s)')).toHaveValue('Ana María');
  await expect(page.getByLabel('Apellidos')).toHaveValue('Martínez López');
  await page.getByLabel('Nombre(s)').fill('Ana');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByRole('button', { name: 'Hola, Ana' })).toBeVisible();

  await page.getByRole('button', { name: 'Hola, Ana' }).click();
  const options = page.getByRole('navigation', { name: 'Opciones de cuenta' });
  await expect(options.getByRole('link', { name: 'Mis pedidos' })).toBeVisible();
  await expect(options.getByRole('link', { name: 'Cuenta' })).toBeVisible();
  await expect(options.getByRole('link', { name: 'Mis pedidos' })).toHaveAttribute('href', '/cuenta/pedidos');
  await options.getByRole('button', { name: 'Cerrar sesión' }).click();

  await expect(page.getByRole('link', { name: 'Iniciar sesión' })).toBeVisible();
});

test('registration separates first names and surnames', async ({ page }) => {
  await acceptAgeForAccountFlow(page);
  await page.goto('/cuenta/registro');

  await expect(page.getByLabel('Nombre(s)')).toBeVisible();
  await expect(page.getByLabel('Apellidos')).toBeVisible();
  await expect(page.getByLabel('Nombre(s)')).toHaveAttribute('required', '');
  await expect(page.getByLabel('Apellidos')).toHaveAttribute('required', '');
  await expect(page.getByRole('button', { name: 'Crear mi cuenta' })).toHaveCSS('background-color', 'rgb(15, 80, 71)');
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

test('sign-in view fits tall screens and includes accessible credential controls', async ({ page }) => {
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
  await expect(skull).toBeVisible();
  await expect.poll(async () => {
    const skullBox = await skull.boundingBox();
    const eyebrowBox = await eyebrow.boundingBox();
    return skullBox.y + skullBox.height < eyebrowBox.y;
  }).toBe(true);
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
  await expect(page.locator('footer')).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);

  await page.setViewportSize({ width: 488, height: 620 });
  expect(await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight)).toBe(true);
});
