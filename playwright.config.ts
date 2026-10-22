import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env';

/**
 * Central Playwright configuration.
 * All environment-specific values come from src/config/env.ts (driven by .env / TEST_ENV).
 */
export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  timeout: env.testTimeout,
  expect: { timeout: env.expectTimeout },
  // first run of a visual check writes the baseline instead of failing
  updateSnapshots: 'missing',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : env.retries,
  workers: process.env.CI ? 4 : env.workers,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['junit', { outputFile: 'reports/junit/results.xml' }],
    ['json', { outputFile: 'reports/json/results.json' }],
    ['./src/reporters/CustomReporter.ts'],
  ],

  globalSetup: require.resolve('./src/core/globalSetup'),
  globalTeardown: require.resolve('./src/core/globalTeardown'),

  // Starts the bundled QA Demo App (used by tests/demo) - reused if already running.
  webServer: {
    command: 'node demo-app/server.js',
    url: `${env.demoUrl}/health`,
    reuseExistingServer: true,
    timeout: 30_000,
    env: { PORT: String(env.demoPort) },
  },

  use: {
    baseURL: env.baseUrl,
    headless: env.headless,
    viewport: { width: 1920, height: 1080 },
    actionTimeout: env.actionTimeout,
    navigationTimeout: env.navigationTimeout,
    ignoreHTTPSErrors: true,
    acceptDownloads: true,
    screenshot: 'only-on-failure',
    video: env.video,
    trace: 'retain-on-failure',
    testIdAttribute: env.testIdAttribute,
    launchOptions: { slowMo: env.slowMo, executablePath: env.chromePath || undefined },
  },

  projects: [
    // UI projects ignore /tests/api and /tests/demo; those have their own projects
    { name: 'chromium', testIgnore: /(api|demo)\//, use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } },
    { name: 'firefox', testIgnore: /(api|demo)\//, use: { ...devices['Desktop Firefox'], viewport: { width: 1920, height: 1080 } } },
    { name: 'webkit', testIgnore: /(api|demo)\//, use: { ...devices['Desktop Safari'], viewport: { width: 1920, height: 1080 } } },
    { name: 'edge', testIgnore: /(api|demo)\//, use: { ...devices['Desktop Edge'], channel: 'msedge' } },
    { name: 'mobile-chrome', testIgnore: /(api|demo)\//, use: { ...devices['Pixel 7'] } },
    { name: 'api', testDir: './tests/api', use: { baseURL: env.apiBaseUrl } },
    // Sample suite against the bundled QA Demo App (offline, covers every framework function)
    { name: 'demo', testDir: './tests/demo', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, baseURL: env.demoUrl } },
  ],
});
