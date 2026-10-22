import * as fs from 'fs';
import { expect, test } from '../../src/fixtures/baseFixture';
import { env } from '../../src/config/env';

/** ui.browser - navigation, cookies, storage, sessions, screenshots, network, emulation. */
test.describe('BrowserActions @demo @browser', () => {
  test('navigation: navigateTo, reload, goBack, goForward, getTitle, getUrl, getPageSource, waitForUrl', async ({ ui }) => {
    await ui.browser.navigateTo('/forms.html');
    await ui.browser.navigateTo('/table.html', 'domcontentloaded');
    expect(await ui.browser.getTitle()).toBe('Employees | QA Demo App');

    await ui.browser.goBack();
    await ui.browser.waitForUrl(/forms\.html/);
    expect(ui.browser.getUrl()).toContain('/forms.html');

    await ui.browser.goForward();
    await ui.browser.waitForUrl('**/table.html');
    await ui.browser.reload();
    expect(await ui.browser.getPageSource()).toContain('id="employees"');
  });

  test('cookies: addCookie, getCookie, getCookies, deleteCookie, clearCookies', async ({ ui }) => {
    await ui.browser.navigateTo('/browser.html');
    await ui.browser.addCookie('consent', 'yes');
    await ui.browser.addCookie('region', 'EU');

    await ui.element.click('demo/browser.readCookie');
    await ui.assert.textContains('demo/browser.cookieValue', 'consent=yes');
    expect((await ui.browser.getCookie('region'))?.value).toBe('EU');
    expect((await ui.browser.getCookies()).length).toBeGreaterThanOrEqual(2);

    await ui.browser.deleteCookie('consent');
    expect(await ui.browser.getCookie('consent')).toBeUndefined();
    await ui.browser.clearCookies();
    expect(await ui.browser.getCookies()).toHaveLength(0);
  });

  test('storage: set/get/remove/clear for localStorage and sessionStorage', async ({ ui }) => {
    await ui.browser.navigateTo('/browser.html');
    await ui.browser.setStorageItem('quoteId', 'Q-100');
    await ui.browser.setStorageItem('tab', 'risk', 'sessionStorage');
    expect(await ui.browser.getStorageItem('quoteId')).toBe('Q-100');
    expect(await ui.browser.getStorageItem('tab', 'sessionStorage')).toBe('risk');

    await ui.browser.removeStorageItem('quoteId');
    expect(await ui.browser.getStorageItem('quoteId')).toBeNull();
    await ui.browser.clearStorage('sessionStorage');
    expect(await ui.browser.getStorageItem('tab', 'sessionStorage')).toBeNull();
  });

  test('saveSession: log in once, reuse the session in a new context', async ({ ui, browser, demoLoginPage }) => {
    await demoLoginPage.open();
    await (await demoLoginPage.login(env.demoUser, env.demoPassword)).waitForLoaded();
    const file = await ui.browser.saveSession('demo-admin');
    expect(fs.existsSync(file)).toBe(true);

    const ctx = await browser.newContext({ storageState: file, baseURL: env.demoUrl });
    const page = await ctx.newPage();
    await page.goto('/dashboard.html');
    await expect(page.locator('#welcome')).toHaveText('Welcome, admin'); // no login needed
    await ctx.close();
  });

  test('takeScreenshot and saveAsPdf', async ({ ui, browserName }) => {
    await ui.browser.navigateTo('/table.html');
    expect(fs.existsSync(await ui.browser.takeScreenshot('employees-page'))).toBe(true);
    expect(fs.existsSync(await ui.browser.takeScreenshot('employees-viewport', false))).toBe(true);

    test.skip(browserName !== 'chromium' || !env.headless, 'PDF export needs headless Chromium');
    expect(fs.existsSync(await ui.browser.saveAsPdf('employees'))).toBe(true);
  });

  test.describe('Network', () => {
    test.beforeEach(async ({ ui }) => ui.browser.navigateTo('/waits.html'));

    test('mockResponse and removeAllMocks', async ({ ui }) => {
      await ui.browser.mockResponse('**/api/users', [{ name: 'Mocked User', role: 'QA' }]);
      await ui.element.click('demo/waits.loadUsers');
      await ui.assert.textEquals('demo/waits.networkStatus', 'Loaded 1 users');
      await ui.assert.textEquals('demo/waits.users', 'Mocked User - QA');

      await ui.browser.removeAllMocks();
      await ui.element.click('demo/waits.loadUsers');
      await ui.assert.textContains('demo/waits.networkStatus', 'Loaded');
      expect(await ui.element.getCount('demo/waits.users')).toBeGreaterThan(1);
    });

    test('modifyResponse - alter the real API payload', async ({ ui }) => {
      await ui.browser.modifyResponse('**/api/users', (users: any[]) => users.map((u) => ({ ...u, role: 'Modified' })));
      await ui.element.click('demo/waits.loadUsers');
      await ui.wait.forText('demo/waits.networkStatus', 'Loaded');
      expect((await ui.element.getAllTexts('demo/waits.users')).every((t) => t.endsWith('Modified'))).toBe(true);
    });

    test('blockRequests - simulate backend failure', async ({ ui }) => {
      await ui.browser.blockRequests('**/api/users');
      await ui.element.click('demo/waits.loadUsers');
      await ui.assert.textEquals('demo/waits.networkStatus', 'Failed to load users');
    });

    test('waitForResponse, waitForRequest, captureRequests', async ({ ui }) => {
      const captured = ui.browser.captureRequests((r) => r.url().includes('/api/'));

      const [response] = await Promise.all([ui.browser.waitForResponse('/api/users', 200), ui.element.click('demo/waits.loadUsers')]);
      expect(response.status()).toBe(200);

      const [request] = await Promise.all([ui.browser.waitForRequest(/\/api\/slow/), ui.element.click('demo/waits.slowBtn')]);
      expect(request.method()).toBe('GET');

      await ui.wait.forText('demo/waits.networkStatus', 'Waited');
      expect(captured.map((r) => new URL(r.url()).pathname)).toEqual(['/api/users', '/api/slow']);
    });
  });

  test('blockResourceTypes - page renders without stylesheets', async ({ ui }) => {
    await ui.browser.blockResourceTypes(['stylesheet', 'image']);
    await ui.browser.navigateTo('/forms.html');
    expect(await ui.element.getCssValue('body', 'background-color')).toBe('rgba(0, 0, 0, 0)'); // style.css not applied
  });

  test('captureConsoleErrors', async ({ ui }) => {
    await ui.browser.navigateTo('/browser.html');
    const errors = ui.browser.captureConsoleErrors();
    await ui.element.click('demo/browser.logError');
    await ui.wait.until(async () => errors.length > 0, 5000, 'console error');
    expect(errors[0]).toContain('Simulated application error');
  });

  test('headers & auth: setExtraHeaders (Bearer), setHttpCredentials (Basic)', async ({ ui }) => {
    await ui.browser.navigateTo('/browser.html');
    await ui.element.click('demo/browser.callSecure');
    await ui.assert.textEquals('demo/browser.secureResult', 'Unauthorised');

    await ui.browser.setExtraHeaders({ Authorization: 'Bearer demo-token-123' });
    await ui.element.click('demo/browser.callSecure');
    await ui.assert.textEquals('demo/browser.secureResult', 'Authorised');

    await ui.browser.setHttpCredentials('admin', 'Admin@123');
    await ui.browser.navigateTo('/api/basic');
    expect(await ui.browser.getPageSource()).toContain('basic-ok');
  });

  test('emulation: setOffline, setGeolocation, grantPermissions, setViewport, emulateColorScheme', async ({ ui }) => {
    await ui.browser.navigateTo('/browser.html');

    await ui.browser.setOffline(true);
    await ui.element.click('demo/browser.checkOnline');
    await ui.assert.textEquals('demo/browser.onlineStatus', 'Offline');
    await ui.browser.setOffline(false);
    await ui.element.click('demo/browser.checkOnline');
    await ui.assert.textEquals('demo/browser.onlineStatus', 'Online');

    await ui.browser.setGeolocation(28.4595, 77.0266); // Gurugram
    await ui.element.click('demo/browser.getLocation');
    await ui.assert.textEquals('demo/browser.location', '28.4595,77.0266');

    await ui.browser.grantPermissions(['clipboard-read', 'clipboard-write'], env.demoUrl);

    await ui.browser.setViewport(1024, 700);
    await ui.element.click('demo/browser.readViewport');
    await ui.assert.textEquals('demo/browser.viewport', '1024x700');

    await ui.browser.emulateColorScheme('dark');
    await ui.assert.textEquals('demo/browser.theme', 'dark');
  });
});
