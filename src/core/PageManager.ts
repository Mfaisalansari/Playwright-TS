import { BrowserContext, Page } from '@playwright/test';

/**
 * Holds the "current" page (tab/window) for every action class.
 * When you switch tab/window via WindowActions, every action automatically targets the new page
 * - the same mental model as Selenium's driver.switchTo().window().
 */
export class PageManager {
  private _page: Page;

  constructor(page: Page) {
    this._page = page;
  }

  get page(): Page {
    return this._page;
  }

  get context(): BrowserContext {
    return this._page.context();
  }

  /** All open pages (tabs + popup windows) in the current browser context. */
  get pages(): Page[] {
    return this.context.pages();
  }

  switchTo(page: Page): Page {
    this._page = page;
    return page;
  }
}
