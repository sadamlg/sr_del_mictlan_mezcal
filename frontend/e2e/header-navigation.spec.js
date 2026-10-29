const { test, expect } = require('./fixtures');

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    window.sessionStorage.setItem('mictlan-age-confirmed-v1', 'yes');
  });
});

test('the header stays visible after an in-page section jump and still hides on manual scroll', async ({ page }) => {
  await page.goto('/');
  const header = page.locator('header').first();

  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Mezcales' }).click();
  await expect(page).toHaveURL(/#coleccion$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(80);
  await expect(header).toHaveClass(/(?:^|\s)translate-y-0(?:\s|$)/);

  await page.mouse.wheel(0, 300);
  await expect(header).toHaveClass(/(?:^|\s)-translate-y-full(?:\s|$)/);
  await page.mouse.wheel(0, -150);
  await expect(header).toHaveClass(/(?:^|\s)translate-y-0(?:\s|$)/);
});

test('the header reappears when navigating between account pages after a downward scroll', async ({ page }) => {
  await page.setViewportSize({ width: 488, height: 480 });
  await page.goto('/cuenta/iniciar-sesion');
  const header = page.locator('header').first();

  await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible();
  await page.mouse.wheel(0, 700);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(80);
  await expect(header).toHaveClass(/(?:^|\s)-translate-y-full(?:\s|$)/);

  await page.getByRole('link', { name: 'Crear una cuenta' }).click();
  await expect(page).toHaveURL(/\/cuenta\/registro$/);
  await expect(header).toHaveClass(/(?:^|\s)translate-y-0(?:\s|$)/);
});
