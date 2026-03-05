import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // Fail the build on CI if `test.only` is accidentally left in source code.
  forbidOnly: !!process.env.CI,
  // Retry failed tests on CI.
  retries: process.env.CI ? 2 : 0,
  // Single worker on CI for isolation; unlimited locally.
  workers: process.env.CI ? 1 : undefined,
  // List reporter for terminal output + HTML for detailed review
  // + JSON for the web UI to parse pass/fail counts.
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/report.json' }],
  ],

  use: {
    // All tests navigate relative to this base URL (origin only).
    baseURL: 'https://dev.3snet.info',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    actionTimeout: 15000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
