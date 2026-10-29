const { test, expect } = require('./fixtures');

test('visitor counter shows the API total and reuses its session after reload', async ({ page }) => {
  const visitIds = [];
  await page.route('**/api/visits', async (route) => {
    visitIds.push(route.request().postDataJSON().visitId);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: 27 }) });
  });

  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-scroll-behavior', 'smooth');
  const counter = page.locator('section[aria-labelledby="visitor-counter-title"]');
  await expect(counter).toContainText('27');
  await page.reload();
  await expect(counter).toContainText('27');
  expect(visitIds.length).toBeGreaterThanOrEqual(2);
  expect(new Set(visitIds).size).toBe(1);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(counter).toContainText('27');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('landing hero CTA uses the account teal palette and keeps its hover scale', async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('mictlan-age-confirmed-v1', 'yes'));
  await page.goto('/');

  const cta = page.getByRole('link', { name: 'Conocer la colección' });
  const ctaSurface = cta.locator('span[aria-hidden="true"]');

  await expect(cta).toBeVisible();
  await expect(page.locator('img[src*="hero-background.png"]')).toHaveAttribute('loading', 'eager');
  await expect(cta).toHaveCSS('color', 'rgb(226, 227, 224)');
  await expect(ctaSurface).toHaveCSS('background-color', 'rgb(15, 80, 71)');
  await cta.hover();
  await expect(ctaSurface).toHaveCSS('background-color', 'rgb(21, 105, 93)');
  await expect.poll(() => ctaSurface.evaluate((element) => getComputedStyle(element).scale))
    .toContain('1.1');
});

test('age confirmation unlocks the landing and is remembered for the session', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#coleccion')).toHaveCount(1);
  await page.locator('#coleccion').scrollIntoViewIfNeeded();

  const dialog = page.getByRole('dialog', { name: '¿Eres mayor de edad?' });
  const confirmButton = dialog.getByRole('button', { name: 'Entrar al Mictlán' });

  await expect(dialog).toBeVisible();
  await expect(dialog.locator('img[src*="skull.png"]')).toHaveAttribute('loading', 'eager');
  await expect(confirmButton).toBeFocused();
  await expect(confirmButton).toHaveCSS('background-color', 'rgb(15, 80, 71)');
  await confirmButton.hover();
  await expect(confirmButton).toHaveCSS('background-color', 'rgb(21, 105, 93)');
  await page.mouse.move(0, 0);
  await confirmButton.click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Totonalhuan' })).toBeVisible();

  await page.reload();

  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Totonalhuan' })).toBeVisible();
});

test('footer collection navigation scrolls when #coleccion is already active', async ({ page }) => {
  await page.goto('/#coleccion');
  await page.locator('#coleccion').scrollIntoViewIfNeeded();
  await page.getByRole('dialog').getByRole('button', { name: 'Entrar al Mictlán' }).click();

  const collection = page.locator('#coleccion');
  const mezcalesLink = page
    .getByRole('navigation', { name: 'Navegación del pie de página' })
    .getByRole('link', { name: 'Mezcales' });

  await mezcalesLink.click();

  await expect.poll(() => collection.evaluate((element) => element.getBoundingClientRect().top))
    .toBeGreaterThan(-150);
  await expect.poll(() => collection.evaluate((element) => element.getBoundingClientRect().top))
    .toBeLessThan(300);
});

test('footer collection CTA also returns to the collection from the same fragment', async ({ page }) => {
  await page.goto('/#coleccion');
  await page.locator('#coleccion').scrollIntoViewIfNeeded();
  await page.getByRole('dialog').getByRole('button', { name: 'Entrar al Mictlán' }).click();

  const collection = page.locator('#coleccion');
  await page.getByRole('link', { name: 'Explorar la colección' }).click();

  await expect.poll(() => collection.evaluate((element) => element.getBoundingClientRect().top))
    .toBeGreaterThan(-150);
  await expect.poll(() => collection.evaluate((element) => element.getBoundingClientRect().top))
    .toBeLessThan(300);
});
