const { test, expect } = require('@playwright/test');

test('age confirmation unlocks the landing and is remembered for the session', async ({ page }) => {
  await page.goto('/');

  const dialog = page.getByRole('dialog', { name: '¿Eres mayor de edad?' });
  const confirmButton = dialog.getByRole('button', { name: 'Sí' });

  await expect(dialog).toBeVisible();
  await expect(confirmButton).toBeFocused();
  await confirmButton.click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Totonalhuan' })).toBeVisible();

  await page.reload();

  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Totonalhuan' })).toBeVisible();
});

test('footer collection navigation scrolls when #coleccion is already active', async ({ page }) => {
  await page.goto('/#coleccion');
  await page.getByRole('dialog').getByRole('button', { name: 'Sí' }).click();

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
  await page.getByRole('dialog').getByRole('button', { name: 'Sí' }).click();

  const collection = page.locator('#coleccion');
  await page.getByRole('link', { name: 'Explorar la colección' }).click();

  await expect.poll(() => collection.evaluate((element) => element.getBoundingClientRect().top))
    .toBeGreaterThan(-150);
  await expect.poll(() => collection.evaluate((element) => element.getBoundingClientRect().top))
    .toBeLessThan(300);
});
