import { Browser, BrowserContext, Page } from '@playwright/test';
import { logger } from '../utils/Logger';
import { BaseActions } from './BaseActions';

/**
 * Tabs & windows.
 * In Playwright every tab/popup window is a `Page` in the same BrowserContext.
 * Switching here updates the shared PageManager, so ALL action classes (ui.element, ui.dropdown ...)
 * automatically act on the switched-to page.
 */
export class WindowActions extends BaseActions {
  /** Open a new blank tab (optionally navigate) and switch to it. */
  async openNewTab(url?: string): Promise<Page> {
    return this.step(`Open new tab ${url ?? ''}`, async () => {
      const page = await this.pm.context.newPage();
      if (url) await page.goto(url);
      return this.pm.switchTo(page);
    });
  }

  /**
   * Run an action that opens a new tab/window (target=_blank, window.open) and switch to it.
   *   await ui.window.switchToNewTab(() => ui.element.click('Click Here'));
   */
  async switchToNewTab(trigger: () => Promise<unknown>): Promise<Page> {
    return this.step('Switch to newly opened tab/window', async () => {
      const [newPage] = await Promise.all([this.pm.context.waitForEvent('page'), trigger()]);
      await newPage.waitForLoadState();
      logger.info(`New tab: ${newPage.url()}`);
      return this.pm.switchTo(newPage);
    });
  }

  /** Same as switchToNewTab but for popups opened from the current page (window.open). */
  async switchToPopup(trigger: () => Promise<unknown>): Promise<Page> {
    return this.step('Switch to popup window', async () => {
      const [popup] = await Promise.all([this.page.waitForEvent('popup'), trigger()]);
      await popup.waitForLoadState();
      return this.pm.switchTo(popup);
    });
  }

  async switchToTabByIndex(index: number): Promise<Page> {
    return this.step(`Switch to tab #${index}`, async () => {
      const pages = this.pm.pages;
      if (index < 0 || index >= pages.length) throw new Error(`Tab index ${index} out of range (0-${pages.length - 1})`);
      await pages[index].bringToFront();
      return this.pm.switchTo(pages[index]);
    });
  }

  async switchToTabByTitle(title: string | RegExp, timeout = 10_000): Promise<Page> {
    return this.step(`Switch to tab with title "${title}"`, () =>
      this.switchWhen(async (p) => {
        const t = await p.title();
        return typeof title === 'string' ? t.includes(title) : title.test(t);
      }, timeout, `title ${title}`),
    );
  }

  async switchToTabByUrl(url: string | RegExp, timeout = 10_000): Promise<Page> {
    return this.step(`Switch to tab with url "${url}"`, () =>
      this.switchWhen(async (p) => (typeof url === 'string' ? p.url().includes(url) : url.test(p.url())), timeout, `url ${url}`),
    );
  }

  /** Switch back to the first (main) tab. */
  async switchToMainTab(): Promise<Page> {
    return this.switchToTabByIndex(0);
  }

  async closeCurrentTab(): Promise<void> {
    await this.step('Close current tab', async () => {
      const current = this.page;
      await current.close();
      const remaining = this.pm.pages;
      if (remaining.length) {
        this.pm.switchTo(remaining[remaining.length - 1]);
        await this.page.bringToFront();
      }
    });
  }

  async closeTabByIndex(index: number): Promise<void> {
    const target = this.pm.pages[index];
    if (!target) throw new Error(`No tab at index ${index}`);
    const wasCurrent = target === this.page;
    await target.close();
    if (wasCurrent && this.pm.pages.length) this.pm.switchTo(this.pm.pages[0]);
  }

  /** Close every tab except the current one. */
  async closeAllOtherTabs(): Promise<void> {
    await this.step('Close all other tabs', async () => {
      for (const p of this.pm.pages) if (p !== this.page) await p.close();
    });
  }

  getTabCount(): number {
    return this.pm.pages.length;
  }

  getCurrentTabIndex(): number {
    return this.pm.pages.indexOf(this.page);
  }

  async getAllTabTitles(): Promise<string[]> {
    return Promise.all(this.pm.pages.map((p) => p.title()));
  }

  getAllTabUrls(): string[] {
    return this.pm.pages.map((p) => p.url());
  }

  async bringToFront(): Promise<void> {
    await this.page.bringToFront();
  }

  /**
   * Open a completely separate browser window with its own session (new BrowserContext) -
   * e.g. a second user (maker/checker, approver flows). Returns the new page; caller closes the context.
   */
  async openIsolatedWindow(browser: Browser, url?: string): Promise<{ context: BrowserContext; page: Page }> {
    const context = await browser.newContext();
    const page = await context.newPage();
    if (url) await page.goto(url);
    return { context, page };
  }

  /** Resize the current window's viewport. */
  async resize(width: number, height: number): Promise<void> {
    await this.page.setViewportSize({ width, height });
  }

  private async switchWhen(predicate: (p: Page) => Promise<boolean>, timeout: number, label: string): Promise<Page> {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      for (const p of this.pm.pages) {
        if (await predicate(p)) {
          await p.bringToFront();
          return this.pm.switchTo(p);
        }
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error(`No tab matching ${label}. Open tabs: ${this.getAllTabUrls().join(', ')}`);
  }
}
