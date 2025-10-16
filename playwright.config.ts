import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    trace: 'retain-on-failure',
    video: 'off',
  },
  webServer: {
    command: 'npm run dev',
    reuseExistingServer: !process.env.CI,
    port: 5173,
    timeout: 60_000,
  },
});
