import { defineConfig, devices } from '@playwright/test';
import { E2E_API_PORT, E2E_CLIENT_PORT, readRootEnv, resolveTestDatabaseUrl } from './support/env';

// Throws before any server starts if the test database URL is unsafe.
const testDatabaseUrl = resolveTestDatabaseUrl(readRootEnv());

const apiUrl = `http://localhost:${E2E_API_PORT}`;
const clientUrl = `http://localhost:${E2E_CLIENT_PORT}`;

export default defineConfig({
  testDir: 'tests',
  outputDir: 'test-results',
  globalSetup: './global-setup.ts',
  // The run shares requests_test with the server tests; one worker keeps it predictable.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: clientUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Dedicated servers on their own ports, never reused: if a port is busy the run fails
  // instead of silently testing a dev server connected to requests_dev.
  webServer: [
    {
      name: 'API',
      command: 'node --import tsx src/server.ts',
      cwd: '../server',
      env: { DATABASE_URL: testDatabaseUrl, PORT: String(E2E_API_PORT) },
      url: `${apiUrl}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      name: 'Client',
      command: `npm run dev -- --port ${E2E_CLIENT_PORT} --strictPort`,
      cwd: '../client',
      // vite.config.ts proxies /api to http://localhost:$PORT; the shell value wins over .env.
      env: { PORT: String(E2E_API_PORT) },
      url: clientUrl,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
