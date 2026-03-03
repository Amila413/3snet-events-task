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
  // Use list reporter for concise terminal output + HTML for detailed review.
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    // All tests navigate relative to this base URL (origin only).
    // Use page.goto('/eventswidget/') in page objects to resolve correctly.
    baseURL: 'https://dev.3snet.info',
    // Capture a screenshot and trace only when a test fails.
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    // Increase action timeout to accommodate elements below the fold.
    actionTimeout: 15000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
