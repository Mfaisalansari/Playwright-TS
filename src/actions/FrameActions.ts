import { Frame, FrameLocator, Locator } from '@playwright/test';
import { LocatorFactory, LocatorParams, Target } from '../locators/LocatorFactory';
import { BaseActions } from './BaseActions';

/**
 * iFrame support.
 *
 * Playwright doesn't need "switchTo().frame()" - you address elements *through* a frame.
 * Frame paths are arrays of iframe selectors, outermost first:
 *     ui.frame.click(['#outer', '#inner'], 'button.save')
 * A single string is treated as one-level frame path.
 */
export type FramePath = string | string[];

export class FrameActions extends BaseActions {
  /** Get a FrameLocator, supports nested frames. */
  frame(path: FramePath): FrameLocator {
    const chain = Array.isArray(path) ? path : [path];
    if (chain.length === 0) throw new Error('Frame path cannot be empty');
    let fl = this.page.frameLocator(chain[0]);
    for (const sel of chain.slice(1)) fl = fl.frameLocator(sel);
    return fl;
  }

  /** Locate an element inside a frame. Target may be a repo key, raw selector or Locator. */
  locateIn(path: FramePath, target: Target, params?: LocatorParams): Locator {
    return LocatorFactory.resolve(this.frame(path), target, params);
  }

  async click(path: FramePath, target: Target, params?: LocatorParams): Promise<void> {
    await this.step(`[frame ${fmt(path)}] Click ${this.describe(target)}`, () => this.locateIn(path, target, params).click());
  }

  async enterText(path: FramePath, target: Target, text: string, params?: LocatorParams): Promise<void> {
    await this.step(`[frame ${fmt(path)}] Enter "${text}" into ${this.describe(target)}`, () =>
      this.locateIn(path, target, params).fill(text),
    );
  }

  async getText(path: FramePath, target: Target, params?: LocatorParams): Promise<string> {
    return ((await this.locateIn(path, target, params).first().textContent()) ?? '').trim();
  }

  async isVisible(path: FramePath, target: Target, params?: LocatorParams): Promise<boolean> {
    return this.locateIn(path, target, params).first().isVisible();
  }

  async selectOption(path: FramePath, target: Target, label: string, params?: LocatorParams): Promise<void> {
    await this.step(`[frame ${fmt(path)}] Select "${label}" in ${this.describe(target)}`, async () => {
      await this.locateIn(path, target, params).selectOption({ label });
    });
  }

  /** Body text of a frame (rich-text editors like TinyMCE/CKEditor). */
  async getBodyText(path: FramePath): Promise<string> {
    return (await this.frame(path).locator('body').innerText()).trim();
  }

  /** Replace body content of an editable iframe (rich-text editors). */
  async setBodyText(path: FramePath, text: string): Promise<void> {
    await this.step(`[frame ${fmt(path)}] Set body text`, async () => {
      const body = this.frame(path).locator('body');
      await body.click();
      await body.press('ControlOrMeta+A');
      await body.pressSequentially(text);
    });
  }

  // ─────────── Frame objects (for evaluate / url / navigation inside frame) ───────────

  getFrameByName(name: string): Frame {
    const f = this.page.frame({ name });
    if (!f) throw new Error(`No frame with name "${name}". Frames: ${this.listFrames().join(', ')}`);
    return f;
  }

  getFrameByUrl(urlPart: string | RegExp): Frame {
    const f = this.page.frames().find((fr) => (typeof urlPart === 'string' ? fr.url().includes(urlPart) : urlPart.test(fr.url())));
    if (!f) throw new Error(`No frame with url matching "${urlPart}"`);
    return f;
  }

  /** Resolve the Frame object behind an iframe element. */
  async getFrameByElement(iframeSelector: string): Promise<Frame> {
    const handle = await this.page.locator(iframeSelector).elementHandle();
    const f = await handle?.contentFrame();
    if (!f) throw new Error(`Element ${iframeSelector} is not an iframe or not loaded`);
    return f;
  }

  getFrameCount(): number {
    return this.page.frames().length - 1; // exclude main frame
  }

  /** Names/urls of all frames - handy for debugging. */
  listFrames(): string[] {
    return this.page.frames().map((f) => `${f.name() || '(unnamed)'} -> ${f.url()}`);
  }

  async waitForFrameLoaded(path: FramePath, readySelector = 'body'): Promise<void> {
    await this.frame(path).locator(readySelector).first().waitFor({ state: 'visible' });
  }
}

const fmt = (p: FramePath): string => (Array.isArray(p) ? p.join(' > ') : p);
