import { Page } from '@playwright/test';
import { UI } from '../actions/UI';

/**
 * Base for all Page Objects. Pages expose business-level methods and use `this.ui`
 * (action libraries) + object-repository keys - no raw Playwright calls needed.
 */
export abstract class BasePage {
  /** Path relative to baseURL, e.g. '/login'. */
  protected abstract readonly path: string;
  /** Object-repository page key, e.g. 'login' → locators "login.*" */
  protected abstract readonly repo: string;

  constructor(protected readonly ui: UI) {}

  protected get page(): Page {
    return this.ui.page;
  }

  /** Build a repo key: this.el('username') → "login.username" */
  protected el(name: string): string {
    return `${this.repo}.${name}`;
  }

  async open(): Promise<this> {
    await this.ui.browser.navigateTo(this.path);
    await this.waitForLoaded();
    return this;
  }

  /** Override to wait for a page-specific element. */
  async waitForLoaded(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  async getTitle(): Promise<string> {
    return this.page.title();
  }

  async isAt(): Promise<boolean> {
    return this.page.url().includes(this.path);
  }
}
