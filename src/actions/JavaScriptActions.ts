import { LocatorParams, Target } from '../locators/LocatorFactory';
import { BaseActions } from './BaseActions';

/** JavaScriptExecutor-style helpers. */
export class JavaScriptActions extends BaseActions {
  /** Run arbitrary JS in the page. */
  async execute<R = unknown, A = unknown>(fn: string | ((arg: A) => R), arg?: A): Promise<R> {
    return this.page.evaluate(fn as any, arg) as Promise<R>;
  }

  /** Run JS against an element: (el, arg) => ... */
  async executeOn<R = unknown, A = unknown>(target: Target, fn: (el: any, arg: A) => R, arg?: A, params?: LocatorParams): Promise<R> {
    return this.locate(target, params).first().evaluate(fn as any, arg) as Promise<R>;
  }

  async scrollToTop(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, 0));
  }

  async scrollToBottom(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }

  async scrollBy(x: number, y: number): Promise<void> {
    await this.page.evaluate(([dx, dy]) => window.scrollBy(dx, dy), [x, y]);
  }

  /** Scroll inside a scrollable container element. */
  async scrollElement(target: Target, top: number, params?: LocatorParams): Promise<void> {
    await this.locate(target, params).first().evaluate((el, t) => ((el as HTMLElement).scrollTop = t), top);
  }

  /** Keep scrolling until no more content loads (infinite scroll lists). */
  async scrollUntilEnd(maxScrolls = 20, pauseMs = 500): Promise<void> {
    let lastHeight = 0;
    for (let i = 0; i < maxScrolls; i++) {
      const h = await this.page.evaluate(() => document.body.scrollHeight);
      if (h === lastHeight) break;
      lastHeight = h;
      await this.scrollToBottom();
      await this.page.waitForTimeout(pauseMs);
    }
  }

  /** Set value directly and fire input/change events (readonly date pickers etc.). */
  async setValue(target: Target, value: string, params?: LocatorParams): Promise<void> {
    await this.step(`JS set value "${value}" on ${this.describe(target)}`, () =>
      this.locate(target, params)
        .first()
        .evaluate((el, v) => {
          const input = el as HTMLInputElement;
          input.value = v;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }, value),
    );
  }

  async removeAttribute(target: Target, attr: string, params?: LocatorParams): Promise<void> {
    await this.locate(target, params)
      .first()
      .evaluate((el, a) => el.removeAttribute(a), attr);
  }

  async setAttribute(target: Target, attr: string, value: string, params?: LocatorParams): Promise<void> {
    await this.locate(target, params)
      .first()
      .evaluate((el, [a, v]) => el.setAttribute(a, v), [attr, value]);
  }

  async isInViewport(target: Target, params?: LocatorParams): Promise<boolean> {
    return this.locate(target, params)
      .first()
      .evaluate((el) => {
        const r = el.getBoundingClientRect();
        return r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight && r.right <= window.innerWidth;
      });
  }

  async getDocumentReadyState(): Promise<string> {
    return this.page.evaluate(() => document.readyState);
  }

  async zoom(percent: number): Promise<void> {
    await this.page.evaluate((p) => ((document.body.style as any).zoom = `${p}%`), percent);
  }
}
