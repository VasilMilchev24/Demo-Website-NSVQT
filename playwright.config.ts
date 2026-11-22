import { defineConfig, devices } from '@playwright/test';

/** E2E suite against the built site (`npm run build` first). BASE_URL can point at a Vercel preview. */
const baseURL = process.env['BASE_URL'] ?? 'http://localhost:4321';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  workers: 4,
  retries: 0,
  reporter: [['list']],
  timeout: 90_000,
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
  ],
  ...(process.env['BASE_URL']
    ? {}
    : {
        webServer: { command: 'npm run preview', url: baseURL, reuseExistingServer: true, timeout: 60_000 },
      }),
});
