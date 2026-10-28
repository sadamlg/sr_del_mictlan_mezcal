const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3100',
    browserName: 'chromium',
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --hostname 0.0.0.0 --port 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      INTERNAL_API_URL: process.env.INTERNAL_API_URL || (process.env.CI ? 'http://backend:3000' : 'http://localhost:4000'),
      NEXT_PUBLIC_API_URL: 'http://localhost:3100',
      MEDIA_BASE_URL: process.env.MEDIA_BASE_URL || 'http://localhost:3100',
    },
  },
});
