import * as path from 'path';
import { Cookie, Request, Response } from '@playwright/test';
import { env } from '../config/env';
import { BaseActions } from './BaseActions';

type StorageType = 'localStorage' | 'sessionStorage';

/**
 * Browser / page level operations: navigation, cookies, storage, screenshots,
 * network interception & mocking, permissions, geolocation, offline mode.
 */
export class BrowserActions extends BaseActions {
  // ───────────────────────────── Navigation ─────────────────────────────

  /** Navigate to an absolute URL, or a path relative to baseURL. */
  async navigateTo(url = '/', waitUntil: 'load' | 'domcontentloaded' | 'networkidle' | 'commit' = 'load'): Promise<void> {
    await this.step(`Navigate to ${url}`, async () => {
      await this.page.goto(url, { waitUntil });
    });
  }

  async reload(): Promise<void> {
    await this.step('Reload page', async () => {
      await this.page.reload();
    });
  }

  async goBack(): Promise<void> {
    await this.step('Browser back', async () => {
      await this.page.goBack();
    });
  }

  async goForward(): Promise<void> {
    await this.step('Browser forward', async () => {
      await this.page.goForward();
    });
  }

  async getTitle(): Promise<string> {
    return this.page.title();
  }

  getUrl(): string {
    return this.page.url();
  }

  async getPageSource(): Promise<string> {
    return this.page.content();
  }

  async waitForUrl(url: string | RegExp, timeout?: number): Promise<void> {
    await this.page.waitForURL(url, { timeout });
  }

  // ───────────────────────────── Cookies ─────────────────────────────

  async getCookies(): Promise<Cookie[]> {
    return this.pm.context.cookies();
  }

  async getCookie(name: string): Promise<Cookie | undefined> {
    return (await this.getCookies()).find((c) => c.name === name);
  }

  async addCookie(name: string, value: string, domainOrUrl?: string): Promise<void> {
    const url = domainOrUrl ?? this.page.url();
    await this.pm.context.addCookies([{ name, value, url }]);
  }

  async deleteCookie(name: string): Promise<void> {
    await this.pm.context.clearCookies({ name });
  }

  async clearCookies(): Promise<void> {
    await this.pm.context.clearCookies();
  }

  // ───────────────────────────── Local / Session storage ─────────────────────────────

  async getStorageItem(key: string, type: StorageType = 'localStorage'): Promise<string | null> {
    return this.page.evaluate(([k, t]) => window[t as StorageType].getItem(k), [key, type]);
  }

  async setStorageItem(key: string, value: string, type: StorageType = 'localStorage'): Promise<void> {
    await this.page.evaluate(([k, v, t]) => window[t as StorageType].setItem(k, v), [key, value, type]);
  }

  async removeStorageItem(key: string, type: StorageType = 'localStorage'): Promise<void> {
    await this.page.evaluate(([k, t]) => window[t as StorageType].removeItem(k), [key, type]);
  }

  async clearStorage(type: StorageType = 'localStorage'): Promise<void> {
    await this.page.evaluate((t) => window[t as StorageType].clear(), type);
  }

  /** Save cookies + storage to a file for reuse (login once, reuse session). */
  async saveSession(fileName = 'user'): Promise<string> {
    const file = path.join(env.rootDir, '.auth', `${fileName}.json`);
    await this.pm.context.storageState({ path: file });
    return file;
  }

  // ───────────────────────────── Screenshots / PDF ─────────────────────────────

  async takeScreenshot(name: string, fullPage = true): Promise<string> {
    const file = path.join(env.rootDir, 'reports', 'screenshots', `${name}-${Date.now()}.png`);
    await this.page.screenshot({ path: file, fullPage });
    return file;
  }

  /** Save page as PDF (Chromium headless only). */
  async saveAsPdf(name: string): Promise<string> {
    const file = path.join(env.rootDir, 'reports', 'pdf', `${name}.pdf`);
    await this.page.pdf({ path: file, format: 'A4', printBackground: true });
    return file;
  }

  // ───────────────────────────── Network ─────────────────────────────

  /** Mock any request matching the URL pattern with a JSON body. */
  async mockResponse(urlPattern: string | RegExp, body: unknown, status = 200, headers: Record<string, string> = {}): Promise<void> {
    await this.page.route(urlPattern, (route) =>
      route.fulfill({ status, contentType: 'application/json', headers, body: JSON.stringify(body) }),
    );
  }

  /** Modify a real response before the page gets it. */
  async modifyResponse(urlPattern: string | RegExp, modify: (json: any) => any): Promise<void> {
    await this.page.route(urlPattern, async (route) => {
      const response = await route.fetch();
      const json = await response.json();
      await route.fulfill({ response, json: modify(json) });
    });
  }

  /** Abort requests (e.g. block images/ads/analytics to speed tests up). */
  async blockRequests(urlPattern: string | RegExp): Promise<void> {
    await this.page.route(urlPattern, (route) => route.abort());
  }

  /** Block by resource type: 'image' | 'font' | 'stylesheet' | 'media' ... */
  async blockResourceTypes(types: string[]): Promise<void> {
    await this.page.route('**/*', (route) =>
      types.includes(route.request().resourceType()) ? route.abort() : route.continue(),
    );
  }

  async removeAllMocks(): Promise<void> {
    await this.page.unrouteAll({ behavior: 'ignoreErrors' });
  }

  async waitForResponse(urlPart: string | RegExp, status?: number): Promise<Response> {
    return this.page.waitForResponse(
      (r) => (typeof urlPart === 'string' ? r.url().includes(urlPart) : urlPart.test(r.url())) && (status === undefined || r.status() === status),
    );
  }

  async waitForRequest(urlPart: string | RegExp): Promise<Request> {
    return this.page.waitForRequest((r) => (typeof urlPart === 'string' ? r.url().includes(urlPart) : urlPart.test(r.url())));
  }

  /** Capture all requests going forward; returns a live array. */
  captureRequests(filter?: (r: Request) => boolean): Request[] {
    const captured: Request[] = [];
    this.page.on('request', (r) => {
      if (!filter || filter(r)) captured.push(r);
    });
    return captured;
  }

  /** Collect console errors from the page; returns a live array. */
  captureConsoleErrors(): string[] {
    const errors: string[] = [];
    this.page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    this.page.on('pageerror', (e) => errors.push(e.message));
    return errors;
  }

  async setExtraHeaders(headers: Record<string, string>): Promise<void> {
    await this.pm.context.setExtraHTTPHeaders(headers);
  }

  // ───────────────────────────── Emulation ─────────────────────────────

  async setOffline(offline: boolean): Promise<void> {
    await this.pm.context.setOffline(offline);
  }

  async setGeolocation(latitude: number, longitude: number): Promise<void> {
    await this.pm.context.grantPermissions(['geolocation']);
    await this.pm.context.setGeolocation({ latitude, longitude });
  }

  async grantPermissions(permissions: string[], origin?: string): Promise<void> {
    await this.pm.context.grantPermissions(permissions, origin ? { origin } : undefined);
  }

  async setViewport(width: number, height: number): Promise<void> {
    await this.page.setViewportSize({ width, height });
  }

  async emulateColorScheme(colorScheme: 'light' | 'dark'): Promise<void> {
    await this.page.emulateMedia({ colorScheme });
  }

  async setHttpCredentials(username: string, password: string): Promise<void> {
    // Basic auth for subsequent navigations in this page
    await this.setExtraHeaders({ Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}` });
  }
}
