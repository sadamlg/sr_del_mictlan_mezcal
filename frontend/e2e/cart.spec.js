const { test, expect } = require('@playwright/test');

const guestCartKey = 'mictlan-guest-cart-v1';
const product = { slug: 'calios', name: 'Calios · Destilado de pulque' };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('mictlan-age-confirmed-v1', 'yes');
  });
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Inicia sesión.' } }) });
  });
  await page.route('**/api/cart/account**', async (route) => {
    await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Inicia sesión.' } }) });
  });
});

test('visitor can add, update, remove, and restore the guest cart after reload', async ({ page }) => {
  await page.goto('/');
  const addButton = page.locator(`[data-product-slug="${product.slug}"]`);
  await expect(addButton).toBeVisible();
  await addButton.click();

  const drawer = page.getByRole('dialog', { name: 'Tu carrito' });
  const guestCart = drawer.getByRole('region', { name: 'Artículos del carrito' });
  await expect(guestCart).toContainText(product.name);
  const item = guestCart.getByRole('listitem').filter({ hasText: product.name });
  await expect(item.getByLabel('Cantidad: 1')).toBeVisible();
  await item.getByRole('button', { name: `Aumentar cantidad de ${product.name}` }).click();
  await expect(item.getByLabel('Cantidad: 2')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Abrir carrito, 2 unidades' })).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: /Abrir carrito/ }).click();
  const restoredDrawer = page.getByRole('dialog', { name: 'Tu carrito' });
  const restoredCart = restoredDrawer.getByRole('region', { name: 'Artículos del carrito' });
  const restoredItem = restoredCart.getByRole('listitem').filter({ hasText: product.name });
  await expect(restoredItem.getByLabel('Cantidad: 2')).toBeVisible();
  await restoredItem.getByRole('button', { name: `Quitar ${product.name} del carrito` }).click();
  await expect(restoredDrawer.getByRole('status')).toHaveText('El carrito está vacío');
});

test('cart drawer fits narrow and wide viewports and closes with Escape', async ({ page }) => {
  const hydrationErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text().includes('Hydration failed')) hydrationErrors.push(message.text());
  });

  await page.goto('/');
  const trigger = page.getByRole('button', { name: /Abrir carrito/ });

  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await trigger.click();
    const drawer = page.getByRole('dialog', { name: 'Tu carrito' });
    await expect(drawer).toBeVisible();
    await expect.poll(async () => {
      const bounds = await drawer.boundingBox();
      return bounds.x + bounds.width;
    }).toBeLessThanOrEqual(width);
    const drawerBounds = await drawer.boundingBox();
    expect(drawerBounds.x).toBeGreaterThanOrEqual(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();
    await expect(trigger).toBeFocused();
  }
  expect(hydrationErrors).toEqual([]);
});

test('signing in combines guest and account quantities into one cart without repeating the transfer', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window.crypto, 'randomUUID', { value: undefined, configurable: true });
  });
  await page.addInitScript(({ storageKey, slug }) => {
    if (window.sessionStorage.getItem('guest-cart-seeded')) return;
    window.sessionStorage.setItem('guest-cart-seeded', 'yes');
    window.localStorage.setItem(storageKey, JSON.stringify({
      items: [{ slug, quantity: 1 }],
      lastActivityAt: Date.now(),
    }));
  }, { storageKey: guestCartKey, slug: product.slug });

  await page.unroute('**/api/auth/session');
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ account: { id: 'account-a', firstName: 'Ana' } }) });
  });
  await page.unroute('**/api/cart/account**');
  let merges = 0;
  let savedCart = {
    items: [{ slug: product.slug, name: product.name, quantity: 2, available: true, unitPrice: { amount: 25000, currency: 'MXN' }, lineTotal: { amount: 50000, currency: 'MXN' } }],
    subtotal: { amount: 50000, currency: 'MXN' },
  };
  await page.route('**/api/cart/account**', async (route) => {
    if (route.request().method() === 'POST') {
      merges += 1;
      const transfer = route.request().postDataJSON();
      expect(transfer.items).toEqual([{ slug: product.slug, quantity: 1 }]);
      savedCart = {
        items: [{ ...savedCart.items[0], quantity: 3, lineTotal: { amount: 75000, currency: 'MXN' } }],
        subtotal: { amount: 75000, currency: 'MXN' },
      };
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ cart: savedCart }),
    });
  });

  await page.goto('/');
  expect(await page.evaluate(() => typeof crypto.randomUUID)).toBe('undefined');
  await page.getByRole('button', { name: /Abrir carrito/ }).click();

  const drawer = page.getByRole('dialog', { name: 'Tu carrito' });
  const cart = drawer.getByRole('region', { name: 'Artículos del carrito' });
  await expect(cart.getByLabel('Cantidad: 3')).toBeVisible();
  await expect(drawer.getByRole('region')).toHaveCount(1);
  expect(await page.evaluate((key) => localStorage.getItem(key), guestCartKey)).toBeNull();
  await page.reload();
  await expect.poll(() => merges).toBe(1);
});

test('a failed transfer keeps guest products and retry does not add them twice', async ({ page }) => {
  await page.addInitScript(({ storageKey, slug }) => {
    if (sessionStorage.getItem('guest-cart-seeded')) return;
    sessionStorage.setItem('guest-cart-seeded', 'yes');
    localStorage.setItem(storageKey, JSON.stringify({ items: [{ slug, quantity: 1 }], lastActivityAt: Date.now() }));
  }, { storageKey: guestCartKey, slug: product.slug });
  await page.unroute('**/api/auth/session');
  await page.route('**/api/auth/session', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ account: { id: 'account-a', firstName: 'Ana' } }),
  }));
  await page.unroute('**/api/cart/account**');
  let attempts = 0;
  await page.route('**/api/cart/account**', async (route) => {
    if (route.request().method() === 'POST') {
      attempts += 1;
      if (attempts === 1) return route.abort('failed');
    }
    const quantity = attempts > 1 ? 3 : 2;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ cart: {
      items: [{ slug: product.slug, name: product.name, quantity, available: true, unitPrice: { amount: 25000, currency: 'MXN' }, lineTotal: { amount: 25000 * quantity, currency: 'MXN' } }],
      subtotal: { amount: 25000 * quantity, currency: 'MXN' },
    } }) });
  });

  await page.goto('/');
  await page.getByRole('button', { name: /Abrir carrito/ }).click();
  const drawer = page.getByRole('dialog', { name: 'Tu carrito' });
  await expect(drawer.getByRole('button', { name: 'Reintentar carga del carrito' })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), guestCartKey)).not.toBeNull();
  await drawer.getByRole('button', { name: 'Reintentar carga del carrito' }).click();
  await expect(drawer.getByLabel('Cantidad: 3')).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), guestCartKey)).toBeNull();
  expect(attempts).toBe(2);
});

test('guest cart resolves current product names and prices from account pages', async ({ page }) => {
  await page.addInitScript(({ storageKey, slug }) => {
    window.localStorage.setItem(storageKey, JSON.stringify({
      items: [{ slug, quantity: 2 }],
      lastActivityAt: Date.now(),
    }));
  }, { storageKey: guestCartKey, slug: product.slug });
  await page.route('**/api/catalog/products', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ products: [{
        slug: product.slug,
        name: product.name,
        price: { amount: 12345, currency: 'MXN' },
      }] }),
    });
  });

  await page.goto('/cuenta');
  await page.getByRole('button', { name: /Abrir carrito/ }).click();

  const guestCart = page.getByRole('dialog', { name: 'Tu carrito' }).getByRole('region', { name: 'Artículos del carrito' });
  await expect(guestCart).toContainText(product.name);
  await expect(guestCart).toContainText(/123\.45/);
});

test('adding a product to an account cart sends only the absolute quantity', async ({ page }) => {
  let savedItem;
  await page.unroute('**/api/auth/session');
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ account: { id: 'account-a', firstName: 'Ana' } }) });
  });
  await page.unroute('**/api/cart/account**');
  await page.route('**/api/cart/account**', async (route) => {
    if (route.request().method() === 'PUT') {
      savedItem = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ cart: {
        items: [{ slug: product.slug, name: product.name, quantity: 2, available: true, unitPrice: { amount: 25000, currency: 'MXN' }, lineTotal: { amount: 50000, currency: 'MXN' } }],
        subtotal: { amount: 50000, currency: 'MXN' },
      } }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ cart: {
      items: [{ slug: product.slug, name: product.name, quantity: 1, available: true, unitPrice: { amount: 25000, currency: 'MXN' }, lineTotal: { amount: 25000, currency: 'MXN' } }],
      subtotal: { amount: 25000, currency: 'MXN' },
    } }) });
  });

  await page.goto('/');
  await page.locator(`[data-product-slug="${product.slug}"]`).click();

  await expect.poll(() => savedItem).toEqual({ slug: product.slug, quantity: 2 });
  const accountCart = page.getByRole('dialog', { name: 'Tu carrito' }).getByRole('region', { name: 'Artículos del carrito' });
  await expect(accountCart.getByLabel('Cantidad: 2')).toBeVisible();
  await expect(accountCart).not.toContainText('El carrito está vacío');
});
