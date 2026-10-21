import { defineConfig, devices } from '@playwright/test';

// Uses the preinstalled Chromium when present (cloud dev container); falls back
// to Playwright's managed browser elsewhere.
const executablePath = process.env.PW_CHROMIUM_PATH ?? (process.env.PLAYWRIGHT_BROWSERS_PATH ? '/opt/pw-browsers/chromium' : undefined);
const launchOptions = executablePath ? { executablePath } : {};

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    launchOptions,
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], launchOptions } },
    { name: 'phone-chromium', use: { ...devices['Pixel 7'], launchOptions }, grep: /@phone/ },
  ],
});
