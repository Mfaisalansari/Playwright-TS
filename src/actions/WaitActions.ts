import { LocatorParams, Target } from '../locators/LocatorFactory';
import { BaseActions } from './BaseActions';

/**
 * Explicit waits. Playwright auto-waits for actions, so use these only for
 * synchronisation that isn't tied to an action (spinners, async data, counts ...).
 */
export class WaitActions extends BaseActions {
  async forVisible(target: Target, timeout?: number, params?: LocatorParams): Promise<void> {
    await this.locate(target, params).first().waitFor({ state: 'visible', timeout });
  }

  async forHidden(target: Target, timeout?: number, params?: LocatorParams): Promise<void> {
    await this.locate(target, params).first().waitFor({ state: 'hidden', timeout });
  }

  async forAttached(target: Target, timeout?: number, params?: LocatorParams): Promise<void> {
    await this.locate(target, params).first().waitFor({ state: 'attached', timeout });
  }

  async forDetached(target: Target, timeout?: number, params?: LocatorParams): Promise<void> {
    await this.locate(target, params).first().waitFor({ state: 'detached', timeout });
  }

  async forEnabled(target: Target, timeout = 10_000, params?: LocatorParams): Promise<void> {
    const loc = this.locate(target, params).first();
    await this.until(() => loc.isEnabled(), timeout, `${this.describe(target)} to be enabled`);
  }

  async forText(target: Target, text: string, timeout = 10_000, params?: LocatorParams): Promise<void> {
    const loc = this.locate(target, params).first();
    await this.until(async () => ((await loc.textContent()) ?? '').includes(text), timeout, `text "${text}"`);
  }

  async forValue(target: Target, value: string, timeout = 10_000, params?: LocatorParams): Promise<void> {
    const loc = this.locate(target, params).first();
    await this.until(async () => (await loc.inputValue()) === value, timeout, `value "${value}"`);
  }

  async forCount(target: Target, count: number, timeout = 10_000, params?: LocatorParams): Promise<void> {
    const loc = this.locate(target, params);
    await this.until(async () => (await loc.count()) === count, timeout, `${count} elements`);
  }

  async forAttribute(target: Target, attr: string, value: string, timeout = 10_000, params?: LocatorParams): Promise<void> {
    const loc = this.locate(target, params).first();
    await this.until(async () => (await loc.getAttribute(attr)) === value, timeout, `${attr}="${value}"`);
  }

  /** Wait for a loading spinner/overlay to appear (briefly) then disappear. */
  async forSpinner(spinner: Target, appearTimeout = 2000, disappearTimeout = 60_000): Promise<void> {
    const loc = this.locate(spinner).first();
    try {
      await loc.waitFor({ state: 'visible', timeout: appearTimeout });
    } catch {
      return; // never appeared
    }
    await loc.waitFor({ state: 'hidden', timeout: disappearTimeout });
  }

  async forPageLoad(state: 'load' | 'domcontentloaded' | 'networkidle' = 'load'): Promise<void> {
    await this.page.waitForLoadState(state);
  }

  async forNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  async forUrl(url: string | RegExp, timeout?: number): Promise<void> {
    await this.page.waitForURL(url, { timeout });
  }

  async forTitle(title: string, timeout = 10_000): Promise<void> {
    await this.until(async () => (await this.page.title()).includes(title), timeout, `title "${title}"`);
  }

  /** Wait for a JS expression in the page to become truthy. */
  async forFunction(fn: string | (() => unknown), timeout?: number): Promise<void> {
    await this.page.waitForFunction(fn, undefined, { timeout });
  }

  /** Hard wait - avoid; provided for legacy/debug use only. */
  async sleep(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  /** Generic polling wait for any async condition. */
  async until(condition: () => Promise<boolean>, timeout = 10_000, description = 'condition', intervalMs = 250): Promise<void> {
    const end = Date.now() + timeout;
    let lastError: unknown;
    while (Date.now() < end) {
      try {
        if (await condition()) return;
      } catch (e) {
        lastError = e;
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error(`Timed out after ${timeout}ms waiting for ${description}${lastError ? `: ${(lastError as Error).message}` : ''}`);
  }
}
