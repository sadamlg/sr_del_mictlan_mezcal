const { test, expect } = require('./fixtures');

const guestCartKey = 'mictlan-guest-cart-v1';
const product = { slug: 'calios', name: 'Calios · Destilado de pulque', primaryName: 'Calios', descriptor: 'Destilado de pulque' };

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
  await expect(guestCart.getByRole('heading', { name: product.primaryName })).toBeVisible();
  await expect(guestCart).toContainText(product.descriptor);
  const item = guestCart.getByRole('listitem').filter({ hasText: product.primaryName });
  await expect(item.getByLabel('Cantidad: 1')).toBeVisible();
  await item.getByRole('button', { name: `Aumentar cantidad de ${product.name}` }).click();
  await expect(item.getByLabel('Cantidad: 2')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Abrir carrito, 2 unidades' })).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: /Abrir carrito/ }).click();
  const restoredDrawer = page.getByRole('dialog', { name: 'Tu carrito' });
  const restoredCart = restoredDrawer.getByRole('region', { name: 'Artículos del carrito' });
  const restoredItem = restoredCart.getByRole('listitem').filter({ hasText: product.primaryName });
  await expect(restoredItem.getByLabel('Cantidad: 2')).toBeVisible();
  await restoredItem.getByRole('button', { name: `Quitar ${product.name} del carrito` }).click();
  await expect(restoredDrawer.getByRole('status')).toHaveText('El carrito está vacío');
});

test('cart drawer keeps its layout, design tokens, and escape behavior across responsive breakpoints', async ({ page }) => {
  const hydrationErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text().includes('Hydration failed')) hydrationErrors.push(message.text());
  });

  await page.goto('/');
  const trigger = page.getByRole('button', { name: /Abrir carrito/ });

  for (const width of [320, 360, 390, 428, 768, 820, 1023, 1024, 1280, 1440]) {
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
    await expect(drawer.getByRole('status')).toHaveText('El carrito está vacío');
    await expect(drawer.getByRole('link', { name: 'Seguir comprando' })).toHaveAttribute('href', '/#coleccion');
    await expect(drawer.getByText('Subtotal', { exact: true })).toHaveCount(0);
    await expect(drawer.getByRole('button', { name: 'Continuar al pago' })).toHaveCount(0);
    await expect(drawer.getByRole('region', { name: 'Artículos del carrito' })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();
    await expect(trigger).toBeFocused();
  }
  expect(hydrationErrors).toEqual([]);
});

test('empty cart continue link returns to the mezcal collection and closes the drawer', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Abrir carrito/ }).click();
  const drawer = page.getByRole('dialog', { name: 'Tu carrito' });
  await expect(drawer.getByRole('link', { name: 'Seguir comprando' })).toBeVisible();
  await drawer.getByRole('link', { name: 'Seguir comprando' }).click();

  await expect(page).toHaveURL(/\/#coleccion$/);
  await expect(drawer).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Totonalhuan' })).toBeVisible();
});

test('menu and cart exchange the active mobile panel and restore an empty cart cleanly', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const menu = page.locator('#mobile-navigation');
  const menuToggle = page.locator('#mobile-menu-toggle');
  const cartToggle = page.locator('#cart-toggle');
  const cartPanel = page.locator('#mobile-cart-panel');
  const drawer = page.getByRole('dialog', { name: 'Tu carrito' });

  await menuToggle.click();
  await expect(menu).toHaveAttribute('aria-hidden', 'false');
  await expect(menuToggle).toHaveAttribute('aria-expanded', 'true');

  await cartToggle.click();
  await expect(drawer).toBeVisible();
  await expect(menu).toHaveAttribute('aria-hidden', 'true');
  await expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(cartToggle).toHaveAttribute('aria-expanded', 'true');

  await menuToggle.click();
  await expect(menu).toHaveAttribute('aria-hidden', 'false');
  await expect(cartPanel).toHaveAttribute('aria-hidden', 'true');
  await expect(cartToggle).toHaveAttribute('aria-expanded', 'false');
});

test('mobile navigation closes when the viewport crosses into the desktop breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const menu = page.locator('#mobile-navigation');
  await page.locator('#mobile-menu-toggle').click();
  await expect(menu).toHaveAttribute('aria-hidden', 'false');

  await page.setViewportSize({ width: 1024, height: 844 });
  await expect(menu).toHaveAttribute('aria-hidden', 'true');
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
  await expect(page.locator('#cart-toggle')).toBeVisible();
});

test('cart item alignment and visual tokens hold from compact mobile through desktop', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(({ storageKey, slug }) => {
    window.localStorage.setItem(storageKey, JSON.stringify({
      items: [{ slug, quantity: 2 }],
      lastActivityAt: Date.now(),
    }));
  }, { storageKey: guestCartKey, slug: product.slug });
  await page.route('**/api/catalog/products', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ products: [{
      slug: product.slug,
      name: product.name,
      price: { amount: 12345, currency: 'MXN' },
    }] }),
  }));

  await page.goto('/cuenta');
  const cartToggle = page.getByRole('button', { name: /Abrir carrito/ });
  const drawer = page.getByRole('dialog', { name: 'Tu carrito' });
  const widths = [320, 360, 390, 428, 768, 820, 1023, 1024, 1280, 1440];

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await cartToggle.click();
    await expect(drawer).toBeVisible();
    const item = drawer.getByRole('listitem').filter({ hasText: product.primaryName });
    const image = item.locator(':scope > div > div').first();
    const title = item.getByRole('heading', { name: product.primaryName });
    const price = item.locator('p.text-mictlan-gold');
    const remove = item.getByRole('button', { name: `Quitar ${product.name} del carrito` });
    const controls = item.locator('div.inline-flex.items-center.border');
    const increase = item.getByRole('button', { name: `Aumentar cantidad de ${product.name}` });
    const footer = drawer.locator('footer');

    await expect(title).toBeVisible();
    await expect(item).toContainText(product.descriptor);
    await expect(price).toContainText('246.90');
    await expect(title).toHaveCSS('color', 'rgb(241, 231, 214)');
    await expect(price).toHaveCSS('color', 'rgb(233, 189, 130)');
    await expect(drawer.getByText('Subtotal', { exact: true })).toBeVisible();
    await expect(drawer.getByRole('link', { name: 'Inicia sesión para pagar' })).toBeVisible();
    await expect(remove).toBeVisible();
    await expect(increase).toBeVisible();
    await expect.poll(async () => {
      const [imageBox, titleBox, priceBox, removeBox, controlsBox] = await Promise.all([
        image.boundingBox(), title.boundingBox(), price.boundingBox(), remove.boundingBox(), controls.boundingBox(),
      ]);
      return Math.max(
        Math.abs(imageBox.y - titleBox.y),
        Math.abs(imageBox.y - priceBox.y),
        Math.abs(imageBox.y - removeBox.y),
        Math.abs(imageBox.y + imageBox.height - controlsBox.y - controlsBox.height),
      );
    }).toBeLessThanOrEqual(2);
    await expect.poll(async () => {
      const [drawerBox, footerBox] = await Promise.all([drawer.boundingBox(), footer.boundingBox()]);
      return Math.abs(drawerBox.y + drawerBox.height - footerBox.y - footerBox.height);
    }).toBeLessThanOrEqual(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(await title.evaluate((element) => getComputedStyle(element).fontFamily)).toContain('Cinzel Decorative');
    expect(await price.evaluate((element) => getComputedStyle(element).fontFamily)).toContain('Montserrat');
    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();
  }
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
  await expect(guestCart.getByRole('heading', { name: product.primaryName })).toBeVisible();
  await expect(guestCart).toContainText(product.descriptor);
  await expect(guestCart.locator('p.text-mictlan-gold')).toContainText(/246\.90/);
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
  await expect(page.getByRole('dialog', { name: 'Tu carrito' }).getByRole('link', { name: 'Finalizar compra' }))
    .toHaveAttribute('href', '/cuenta/checkout');
});

test('guest checkout closes the drawer, merges after login, and shows a purchase summary before Stripe', async ({ page }) => {
  await page.addInitScript(({ storageKey, slug }) => {
    window.sessionStorage.setItem('mictlan-age-confirmed-v1', 'yes');
    window.localStorage.setItem(storageKey, JSON.stringify({
      items: [{ slug, quantity: 1 }],
      lastActivityAt: Date.now(),
    }));
  }, { storageKey: guestCartKey, slug: product.slug });

  let authenticated = false;
  let mergeCount = 0;
  let checkoutCount = 0;
  const account = {
    id: 'account-a',
    firstName: 'Ana',
    lastName: 'Prueba',
    email: 'ana@example.test',
    address: {
      street: 'Calle de prueba',
      number: '123',
      neighborhood: 'Centro',
      locality: 'Morelia',
      state: 'Michoacán',
      postalCode: '58000',
    },
  };
  const cart = { items: [], subtotal: { amount: 0, currency: 'MXN' } };

  await page.unroute('**/api/auth/session');
  await page.route('**/api/auth/session', (route) => route.fulfill(authenticated
    ? { status: 200, json: { account } }
    : { status: 401, json: { error: { code: 'AUTHENTICATION_REQUIRED', message: 'Inicia sesión.' } } }));
  await page.route('**/api/auth/login', async (route) => {
    authenticated = true;
    await route.fulfill({ status: 200, json: { account } });
  });
  await page.unroute('**/api/cart/account**');
  await page.route('**/api/cart/account**', async (route) => {
    if (!authenticated) return route.fulfill({ status: 401, json: { error: { message: 'Inicia sesión.' } } });
    if (route.request().method() === 'POST') {
      mergeCount += 1;
      const transfer = route.request().postDataJSON();
      expect(transfer.items).toEqual([{ slug: product.slug, quantity: 1 }]);
      cart.items = [{
        slug: product.slug,
        name: product.name,
        quantity: 1,
        available: true,
        unitPrice: { amount: 25000, currency: 'MXN' },
        lineTotal: { amount: 25000, currency: 'MXN' },
      }];
      cart.subtotal.amount = 25000;
    }
    await route.fulfill({ status: 200, json: { cart } });
  });
  await page.route('**/api/checkout/sessions', async (route) => {
    checkoutCount += 1;
    await route.fulfill({ status: 201, json: { checkoutUrl: 'https://checkout.stripe.com/c/pay/test-summary-flow' } });
  });
  await page.route('**/api/checkout/payment-methods', (route) => route.fulfill({ status: 200, json: { cards: [] } }));
  await page.route('**/api/catalog/products', (route) => route.fulfill({
    status: 200,
    json: { products: [{
      slug: product.slug,
      name: product.name,
      image: { url: '/checkout-test-bottle.svg', alt: 'Botella de Calios' },
    }] },
  }));
  await page.route('**/checkout-test-bottle.svg', (route) => route.fulfill({
    status: 200,
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 80"><rect width="64" height="80" fill="#0a0b0a"/></svg>',
  }));
  await page.route('https://checkout.stripe.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Stripe test checkout</title>' }));

  await page.goto('/');
  await page.getByRole('button', { name: /Abrir carrito/ }).click();
  const drawer = page.getByRole('dialog', { name: 'Tu carrito' });
  await drawer.getByRole('link', { name: 'Inicia sesión para pagar' }).click();
  await expect(page).toHaveURL(/\/cuenta\/iniciar-sesion\?continuar=checkout$/);
  await expect(drawer).not.toBeVisible();

  await page.getByLabel('Correo electrónico').fill('ana@example.test');
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('password-for-test');
  await page.getByRole('button', { name: 'Entrar a mi cuenta' }).click();

  await expect(page).toHaveURL(/\/cuenta\/checkout$/);
  await expect(page.getByRole('heading', { name: 'Resumen de compra' })).toBeVisible();
  const selectedItems = page.getByRole('region', { name: 'Piezas seleccionadas' });
  await expect(selectedItems.getByRole('heading', { name: product.primaryName, exact: true })).toBeVisible();
  await expect(selectedItems).toContainText(product.descriptor);
  await expect(page.getByRole('img', { name: 'Botella de Calios' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pagar con Stripe' })).toBeEnabled();
  expect(mergeCount).toBe(1);
  expect(checkoutCount).toBe(0);

  await page.getByRole('button', { name: 'Pagar con Stripe' }).click();
  await expect(page).toHaveURL(/checkout\.stripe\.com\/c\/pay\/test-summary-flow$/);
  expect(checkoutCount).toBe(1);
});

test('checkout summary shows customer delivery details, consented masked cards, and product images', async ({ page }) => {
  const account = {
    id: 'account-a',
    firstName: 'Ana',
    lastName: 'Prueba',
    email: 'ana@example.test',
    address: {
      street: 'Calle de prueba',
      number: '123',
      neighborhood: 'Centro',
      locality: 'Morelia',
      state: 'Michoacán',
      postalCode: '58000',
    },
  };
  const cart = {
    items: [{
      slug: product.slug,
      name: product.name,
      quantity: 1,
      available: true,
      unitPrice: { amount: 25000, currency: 'MXN' },
      lineTotal: { amount: 25000, currency: 'MXN' },
    }],
    subtotal: { amount: 25000, currency: 'MXN' },
  };

  await page.unroute('**/api/auth/session');
  await page.route('**/api/auth/session', (route) => route.fulfill({ status: 200, json: { account } }));
  await page.unroute('**/api/cart/account**');
  await page.route('**/api/cart/account**', async (route) => {
    if (route.request().method() === 'PUT') {
      const { slug, quantity } = route.request().postDataJSON();
      const item = cart.items.find((entry) => entry.slug === slug);
      item.quantity = quantity;
      item.lineTotal.amount = item.unitPrice.amount * quantity;
      cart.subtotal.amount = item.lineTotal.amount;
    } else if (route.request().method() === 'DELETE') {
      cart.items = [];
      cart.subtotal.amount = 0;
      return route.fulfill({ status: 204, body: '' });
    }
    await route.fulfill({ status: 200, json: { cart } });
  });
  await page.route('**/api/catalog/products', (route) => route.fulfill({
    status: 200,
    json: { products: [{
      slug: product.slug,
      name: product.name,
      image: { url: '/checkout-test-bottle.svg', alt: 'Botella de Calios' },
    }] },
  }));
  await page.route('**/api/checkout/payment-methods', (route) => route.fulfill({
    status: 200,
    json: { cards: [{ brand: 'visa', last4: '4242', expMonth: 8, expYear: 2030 }] },
  }));
  await page.route('**/checkout-test-bottle.svg', (route) => route.fulfill({
    status: 200,
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 80"><rect width="64" height="80" fill="#0a0b0a"/></svg>',
  }));

  await page.goto('/cuenta/checkout');

  await expect(page.getByRole('heading', { name: 'Entrega y contacto' })).toBeVisible();
  await expect(page.getByText('Ana Prueba', { exact: true })).toBeVisible();
  await expect(page.getByText('ana@example.test', { exact: true })).toBeVisible();
  await expect(page.getByText(/Calle de prueba 123.*Centro.*Morelia.*Michoacán.*58000/)).toBeVisible();
  await expect(page.getByText(/Visa.*4242/)).toBeVisible();
  await expect(page.getByText('Vence 08/2030')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Botella de Calios' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Editar carrito' })).toHaveCount(0);
  await expect(page.getByText(/El pago se procesa en Stripe/)).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Seguir comprando' })).toHaveAttribute('href', '/#coleccion');

  await page.reload();
  const refreshedItems = page.getByRole('region', { name: 'Piezas seleccionadas' });
  await expect(refreshedItems.getByRole('heading', { name: product.primaryName, exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Botella de Calios' })).toBeVisible();

  const items = page.getByRole('region', { name: 'Artículos del carrito' });
  const item = items.getByRole('listitem').filter({ hasText: product.primaryName });
  await expect(item.getByLabel('Cantidad: 1')).toBeVisible();
  await item.getByRole('button', { name: `Aumentar cantidad de ${product.name}` }).click();
  await expect(item.getByLabel('Cantidad: 2')).toBeVisible();
  await item.getByRole('button', { name: `Disminuir cantidad de ${product.name}` }).click();
  await expect(item.getByLabel('Cantidad: 1')).toBeVisible();
  await item.getByRole('button', { name: `Quitar ${product.name} del carrito` }).click();
  await expect(page.getByText('Agrega productos para preparar tu compra.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Seguir comprando' })).toHaveAttribute('href', '/#coleccion');

  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('heading', { name: 'Resumen de compra' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});

test('checkout keeps edited recipient data per order and sends it to Stripe', async ({ page }) => {
  const account = {
    id: 'account-a',
    firstName: 'Ana',
    lastName: 'Prueba',
    email: 'ana@example.test',
    address: {
      street: 'Calle de prueba',
      number: '123',
      neighborhood: 'Centro',
      locality: 'Morelia',
      state: 'Michoacán',
      postalCode: '58000',
    },
  };
  const cart = {
    items: [{
      slug: product.slug,
      name: product.name,
      quantity: 1,
      available: true,
      unitPrice: { amount: 25000, currency: 'MXN' },
      lineTotal: { amount: 25000, currency: 'MXN' },
    }],
    subtotal: { amount: 25000, currency: 'MXN' },
  };
  let checkoutPayload;
  await page.route('**/api/auth/session', (route) => route.fulfill({ status: 200, json: { account } }));
  await page.route('**/api/cart/account**', (route) => route.fulfill({ status: 200, json: { cart } }));
  await page.route('**/api/catalog/products', (route) => route.fulfill({
    status: 200,
    json: { products: [{ slug: product.slug, name: product.name, image: { url: '/checkout-test-bottle.svg', alt: 'Botella de Calios' } }] },
  }));
  await page.route('**/checkout-test-bottle.svg', (route) => route.fulfill({
    status: 200,
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 80"><rect width="64" height="80" fill="#0a0b0a"/></svg>',
  }));
  await page.route('**/api/checkout/payment-methods', (route) => route.fulfill({ status: 200, json: { cards: [] } }));
  await page.route('**/api/checkout/sessions', async (route) => {
    checkoutPayload = route.request().postDataJSON();
    await route.fulfill({ status: 201, json: { checkoutUrl: 'https://checkout.stripe.com/c/pay/recipient-edit-test' } });
  });
  await page.route('https://checkout.stripe.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Stripe test checkout</title>' }));

  await page.goto('/cuenta/checkout');
  await expect(page.getByRole('button', { name: 'Pagar con Stripe' })).toBeEnabled();
  await page.getByRole('button', { name: 'Editar datos de entrega para este pedido' }).click();
  await expect(page.getByRole('button', { name: 'Pagar con Stripe' })).toBeDisabled();
  await page.getByLabel('Nombre de quien recibe').fill('María Destinataria');
  await page.getByLabel('Correo de contacto').fill('maria@example.test');
  await page.getByLabel('Calle', { exact: true }).fill('Avenida del Agave');
  await page.getByRole('button', { name: 'Guardar para este pedido' }).click();

  await expect(page.getByText('María Destinataria', { exact: true })).toBeVisible();
  await expect(page.getByText('maria@example.test', { exact: true })).toBeVisible();
  await expect(page.getByText(/Avenida del Agave 123/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pagar con Stripe' })).toBeEnabled();
  await page.getByRole('button', { name: 'Pagar con Stripe' }).click();

  await expect(page).toHaveURL(/checkout\.stripe\.com\/c\/pay\/recipient-edit-test$/);
  expect(checkoutPayload).toEqual({
    recipient: {
      name: 'María Destinataria',
      email: 'maria@example.test',
      address: {
        street: 'Avenida del Agave',
        number: '123',
        neighborhood: 'Centro',
        locality: 'Morelia',
        state: 'Michoacán',
        postalCode: '58000',
      },
    },
  });
});

test('new accounts keep the checkout intent through email confirmation and guest cart merge', async ({ page }) => {
  await page.addInitScript(({ storageKey, slug }) => {
    window.localStorage.setItem(storageKey, JSON.stringify({
      items: [{ slug, quantity: 1 }],
      lastActivityAt: Date.now(),
    }));
  }, { storageKey: guestCartKey, slug: product.slug });

  let authenticated = false;
  let mergeCount = 0;
  const account = {
    id: 'account-a',
    firstName: 'Ana',
    lastName: 'Prueba',
    email: 'ana@example.test',
    address: {
      street: 'Calle de prueba',
      number: '123',
      neighborhood: 'Centro',
      locality: 'Morelia',
      state: 'Michoacán',
      postalCode: '58000',
    },
  };
  const cart = {
    items: [{
      slug: product.slug,
      name: product.name,
      quantity: 1,
      available: true,
      unitPrice: { amount: 25000, currency: 'MXN' },
      lineTotal: { amount: 25000, currency: 'MXN' },
    }],
    subtotal: { amount: 25000, currency: 'MXN' },
  };

  await page.unroute('**/api/auth/session');
  await page.route('**/api/auth/session', (route) => route.fulfill(authenticated
    ? { status: 200, json: { account } }
    : { status: 401, json: { error: { code: 'AUTHENTICATION_REQUIRED', message: 'Inicia sesión.' } } }));
  await page.route('**/api/auth/register', (route) => route.fulfill({
    status: 201,
    json: { message: 'Revisa tu correo para activar la cuenta.', email: 'ana@example.test' },
  }));
  await page.route('**/api/auth/email-confirmations', (route) => {
    authenticated = true;
    return route.fulfill({ status: 200, json: { message: 'Tu cuenta está activa.', accountActivated: true } });
  });
  await page.unroute('**/api/cart/account**');
  await page.route('**/api/cart/account**', async (route) => {
    if (!authenticated) return route.fulfill({ status: 401, json: { error: { message: 'Inicia sesión.' } } });
    if (route.request().method() === 'POST') mergeCount += 1;
    await route.fulfill({ status: 200, json: { cart } });
  });
  await page.route('**/api/catalog/products', (route) => route.fulfill({
    status: 200,
    json: { products: [{
      slug: product.slug,
      name: product.name,
      image: { url: '/checkout-test-bottle.svg', alt: 'Botella de Calios' },
    }] },
  }));
  await page.route('**/checkout-test-bottle.svg', (route) => route.fulfill({
    status: 200,
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 80"><rect width="64" height="80" fill="#0a0b0a"/></svg>',
  }));
  await page.route('**/api/checkout/payment-methods', (route) => route.fulfill({ status: 200, json: { cards: [] } }));

  await page.goto('/cuenta/registro?continuar=checkout');
  await page.locator('#firstName').fill('Ana');
  await page.locator('#lastName').fill('Prueba');
  await page.locator('#email').fill('ana@example.test');
  await page.locator('#password').fill('password-for-test');
  await page.getByLabel('Calle').fill('Calle de prueba');
  await page.getByLabel('Número exterior').fill('1');
  await page.getByLabel('Colonia').fill('Centro');
  await page.getByLabel('Ciudad o delegación').fill('Morelia');
  await page.getByLabel('Estado').fill('Michoacán');
  await page.getByLabel('Código postal').fill('58000');
  await page.getByLabel('Fecha de nacimiento').click();
  await page.getByLabel('Año de nacimiento').selectOption('1990');
  await page.getByLabel('Mes de nacimiento').selectOption('3');
  await page.getByRole('grid', { name: 'abril de 1990' }).getByRole('button', { name: 'jueves, 12 de abril de 1990' }).click();
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(page.getByRole('heading', { name: 'Revisa tu correo' })).toBeVisible();
  await expect(page.getByText(/te llevaremos al resumen de compra/)).toBeVisible();

  await page.goto('/cuenta/confirmar-correo?token=abcdefghijklmnopqrstuvXYZ01234567890123456789');
  await expect(page).toHaveURL(/\/cuenta\/checkout$/);
  await expect(page.getByRole('heading', { name: 'Resumen de compra' })).toBeVisible();
  const selectedItems = page.getByRole('region', { name: 'Piezas seleccionadas' });
  await expect(selectedItems.getByRole('heading', { name: product.primaryName, exact: true })).toBeVisible();
  await expect(selectedItems).toContainText(product.descriptor);
  await expect(page.getByRole('img', { name: 'Botella de Calios' })).toBeVisible();
  expect(mergeCount).toBe(1);
});
