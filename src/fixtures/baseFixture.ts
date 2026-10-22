import { test as base, expect } from '@playwright/test';
import { ApiClient } from '../api/ApiClient';
import { UI } from '../actions/UI';
import { env } from '../config/env';
import { TestDataManager } from '../data/TestDataManager';
import { LoginPage } from '../pages/LoginPage';
import { SecureAreaPage } from '../pages/SecureAreaPage';
import { DashboardPage, DemoLoginPage, EmployeesPage, RegistrationPage } from '../pages/demo';
import { logger } from '../utils/Logger';

/**
 * Custom fixtures - import { test, expect } from this file in every spec.
 *
 *   test('x', async ({ ui, loginPage, testData, api }) => { ... })
 *
 * Add new page objects here so they are injected automatically.
 */
type Fixtures = {
  ui: UI;
  testData: TestDataManager;
  api: ApiClient;
  loginPage: LoginPage;
  secureAreaPage: SecureAreaPage;
  // QA Demo App pages
  demoLoginPage: DemoLoginPage;
  dashboardPage: DashboardPage;
  registrationPage: RegistrationPage;
  employeesPage: EmployeesPage;
  /** ApiClient pointed at the QA Demo App */
  demoApi: ApiClient;
  /** auto fixture: logs start/end, attaches console errors on failure */
  testLifecycle: void;
};

export const test = base.extend<Fixtures>({
  ui: async ({ page }, use) => {
    await use(new UI(page));
  },

  testData: async ({}, use) => {
    const data = new TestDataManager();
    await use(data);
    data.clear();
  },

  api: async ({ request }, use) => {
    await use(new ApiClient(request, env.apiBaseUrl));
  },

  loginPage: async ({ ui }, use) => {
    await use(new LoginPage(ui));
  },

  secureAreaPage: async ({ ui }, use) => {
    await use(new SecureAreaPage(ui));
  },

  demoLoginPage: async ({ ui }, use) => use(new DemoLoginPage(ui)),
  dashboardPage: async ({ ui }, use) => use(new DashboardPage(ui)),
  registrationPage: async ({ ui }, use) => use(new RegistrationPage(ui)),
  employeesPage: async ({ ui }, use) => use(new EmployeesPage(ui)),
  demoApi: async ({ request }, use) => use(new ApiClient(request, env.demoUrl)),

  testLifecycle: [
    async ({ page }, use, testInfo) => {
      const consoleErrors: string[] = [];
      page.on('pageerror', (e) => consoleErrors.push(e.message));
      page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));

      logger.info(`▶ START: ${testInfo.titlePath.slice(1).join(' › ')} [${testInfo.project.name}]`);
      await use();

      const status = testInfo.status === testInfo.expectedStatus ? 'PASSED' : testInfo.status?.toUpperCase();
      logger.info(`■ END: ${testInfo.title} → ${status} (${testInfo.duration}ms)`);

      if (testInfo.status !== testInfo.expectedStatus) {
        if (consoleErrors.length) await testInfo.attach('console-errors', { body: consoleErrors.join('\n'), contentType: 'text/plain' });
        try {
          const shot = await page.screenshot({ fullPage: true });
          await testInfo.attach('failure-fullpage', { body: shot, contentType: 'image/png' });
        } catch {
          /* page may be closed */
        }
      }
    },
    { auto: true },
  ],
});

export { expect };
