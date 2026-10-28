const { test: base, expect } = require('@playwright/test');

const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(`Uncaught page error: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) {
        runtimeErrors.push(`Console error: ${message.text()}`);
      }
    });
    await page.route('**/api/**', async (route) => {
      const { pathname } = new URL(route.request().url());
      if (pathname === '/api/auth/session' || pathname === '/api/orders') {
        return route.fulfill({ status: 401, json: { error: { code: 'AUTHENTICATION_REQUIRED', message: 'Inicia sesión.' } } });
      }
      if (pathname.startsWith('/api/cart/account')) {
        return route.fulfill({ status: 401, json: { error: { code: 'AUTHENTICATION_REQUIRED', message: 'Inicia sesión.' } } });
      }
      if (pathname === '/api/catalog/products') return route.fulfill({ status: 200, json: { products: [] } });
      if (pathname === '/api/visits') return route.fulfill({ status: 200, json: { count: 0 } });
      return route.fulfill({ status: 404, json: { error: { message: 'Ruta de prueba no simulada.' } } });
    });

    await use(page);

    expect(runtimeErrors, `Browser runtime errors in ${testInfo.title}`).toEqual([]);
  },
});

module.exports = { test, expect };
