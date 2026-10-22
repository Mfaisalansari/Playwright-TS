import * as path from 'path';
import { Locator } from '@playwright/test';
import { env } from '../config/env';
import { LocatorParams, Target } from '../locators/LocatorFactory';
import { BaseActions } from './BaseActions';

export interface ClickOptions {
  force?: boolean;
  timeout?: number;
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
  delay?: number;
  modifiers?: ('Alt' | 'Control' | 'Meta' | 'Shift' | 'ControlOrMeta')[];
  position?: { x: number; y: number };
  params?: LocatorParams;
}

/**
 * Element interactions: click, type, checkbox/radio, read text/attributes, state checks,
 * scroll, drag & drop, upload, download, element screenshots.
 */
export class ElementActions extends BaseActions {
  // ───────────────────────────── Get element ─────────────────────────────

  /** Get a Locator for a target (repo key / selector / Locator). */
  get(target: Target, params?: LocatorParams): Locator {
    return this.locate(target, params);
  }

  /** nth matching element (0-based). */
  nth(target: Target, index: number, params?: LocatorParams): Locator {
    return this.locate(target, params).nth(index);
  }

  /** All matching elements as individual Locators. */
  async getAll(target: Target, params?: LocatorParams): Promise<Locator[]> {
    return this.locate(target, params).all();
  }

  /** Child element inside a parent. */
  child(parent: Target, childSelector: string, params?: LocatorParams): Locator {
    return this.locate(parent, params).locator(childSelector);
  }

  /** Filter a set of elements by visible text. */
  withText(target: Target, text: string | RegExp, params?: LocatorParams): Locator {
    return this.locate(target, params).filter({ hasText: text });
  }

  // ───────────────────────────── Click ─────────────────────────────

  async click(target: Target, options: ClickOptions = {}): Promise<void> {
    const { params, ...opts } = options;
    await this.step(`Click ${this.describe(target)}`, () => this.locate(target, params).click(opts));
  }

  async doubleClick(target: Target, params?: LocatorParams): Promise<void> {
    await this.step(`Double-click ${this.describe(target)}`, () => this.locate(target, params).dblclick());
  }

  async rightClick(target: Target, params?: LocatorParams): Promise<void> {
    await this.step(`Right-click ${this.describe(target)}`, () =>
      this.locate(target, params).click({ button: 'right' }),
    );
  }

  /** Click bypassing actionability checks (covered / animating elements). */
  async forceClick(target: Target, params?: LocatorParams): Promise<void> {
    await this.step(`Force-click ${this.describe(target)}`, () => this.locate(target, params).click({ force: true }));
  }

  /** Click through JavaScript (last resort when an overlay intercepts clicks). */
  async jsClick(target: Target, params?: LocatorParams): Promise<void> {
    await this.step(`JS-click ${this.describe(target)}`, () =>
      this.locate(target, params).evaluate((el: HTMLElement) => el.click()),
    );
  }

  /** Dispatch a DOM event directly, e.g. 'click', 'change', 'blur'. */
  async dispatchEvent(target: Target, event: string, params?: LocatorParams): Promise<void> {
    await this.step(`Dispatch "${event}" on ${this.describe(target)}`, () =>
      this.locate(target, params).dispatchEvent(event),
    );
  }

  /** Click only if visible within timeout; returns whether it clicked. Good for optional popups/cookie banners. */
  async clickIfVisible(target: Target, timeout = 3000, params?: LocatorParams): Promise<boolean> {
    const loc = this.locate(target, params).first();
    try {
      await loc.waitFor({ state: 'visible', timeout });
    } catch {
      return false;
    }
    await this.step(`Click (optional) ${this.describe(target)}`, () => loc.click());
    return true;
  }

  /** Click and wait for the URL to change / page to navigate. */
  async clickAndWaitForNavigation(target: Target, urlPattern?: string | RegExp, params?: LocatorParams): Promise<void> {
    await this.step(`Click ${this.describe(target)} and wait for navigation`, async () => {
      const before = this.page.url();
      await this.locate(target, params).click();
      if (urlPattern) await this.page.waitForURL(urlPattern);
      else await this.page.waitForURL((u) => u.toString() !== before);
      await this.page.waitForLoadState();
    });
  }

  /** Click and wait for a matching network response. Returns the response JSON/text status. */
  async clickAndWaitForResponse(target: Target, urlPart: string | RegExp, params?: LocatorParams): Promise<number> {
    return this.step(`Click ${this.describe(target)} and wait for response ${urlPart}`, async () => {
      const [response] = await Promise.all([
        this.page.waitForResponse((r) =>
          typeof urlPart === 'string' ? r.url().includes(urlPart) : urlPart.test(r.url()),
        ),
        this.locate(target, params).click(),
      ]);
      return response.status();
    });
  }

  /** Click the element whose text matches, among a list of elements. */
  async clickByText(target: Target, text: string | RegExp, params?: LocatorParams): Promise<void> {
    await this.step(`Click "${text}" within ${this.describe(target)}`, () =>
      this.locate(target, params).filter({ hasText: text }).first().click(),
    );
  }

  async hover(target: Target, params?: LocatorParams): Promise<void> {
    await this.step(`Hover ${this.describe(target)}`, () => this.locate(target, params).hover());
  }

  async focus(target: Target, params?: LocatorParams): Promise<void> {
    await this.step(`Focus ${this.describe(target)}`, () => this.locate(target, params).focus());
  }

  async blur(target: Target, params?: LocatorParams): Promise<void> {
    await this.step(`Blur ${this.describe(target)}`, () => this.locate(target, params).blur());
  }

  async tap(target: Target, params?: LocatorParams): Promise<void> {
    await this.step(`Tap ${this.describe(target)}`, () => this.locate(target, params).tap());
  }

  // ───────────────────────────── Text input ─────────────────────────────

  /** Clear and enter text (fastest; sets value directly). */
  async enterText(target: Target, text: string | number, params?: LocatorParams): Promise<void> {
    await this.step(`Enter "${text}" into ${this.describe(target)}`, () =>
      this.locate(target, params).fill(String(text)),
    );
  }

  /** Enter text without echoing it to logs/reports (passwords, tokens). */
  async enterSecureText(target: Target, text: string, params?: LocatorParams): Promise<void> {
    await this.step(`Enter ****** into ${this.describe(target)}`, () => this.locate(target, params).fill(text));
  }

  /** Type key-by-key (triggers keydown/keyup for each char - for autocomplete / masked inputs). */
  async typeText(target: Target, text: string, delayMs = 50, params?: LocatorParams): Promise<void> {
    await this.step(`Type "${text}" into ${this.describe(target)}`, () =>
      this.locate(target, params).pressSequentially(text, { delay: delayMs }),
    );
  }

  /** Append text to existing value. */
  async appendText(target: Target, text: string, params?: LocatorParams): Promise<void> {
    await this.step(`Append "${text}" to ${this.describe(target)}`, async () => {
      const loc = this.locate(target, params);
      await loc.focus();
      await loc.press('End');
      await loc.pressSequentially(text);
    });
  }

  async clearText(target: Target, params?: LocatorParams): Promise<void> {
    await this.step(`Clear ${this.describe(target)}`, () => this.locate(target, params).clear());
  }

  /** Clear using keyboard (for inputs where .clear() does not trigger framework listeners). */
  async clearWithKeyboard(target: Target, params?: LocatorParams): Promise<void> {
    await this.step(`Clear (keyboard) ${this.describe(target)}`, async () => {
      const loc = this.locate(target, params);
      await loc.click();
      await loc.press('ControlOrMeta+A');
      await loc.press('Backspace');
    });
  }

  /** Enter text then press a key (default Enter). */
  async enterTextAndPress(target: Target, text: string, key = 'Enter', params?: LocatorParams): Promise<void> {
    await this.step(`Enter "${text}" + ${key} into ${this.describe(target)}`, async () => {
      const loc = this.locate(target, params);
      await loc.fill(text);
      await loc.press(key);
    });
  }

  async pressKey(target: Target, key: string, params?: LocatorParams): Promise<void> {
    await this.step(`Press ${key} on ${this.describe(target)}`, () => this.locate(target, params).press(key));
  }

  async selectText(target: Target, params?: LocatorParams): Promise<void> {
    await this.step(`Select text in ${this.describe(target)}`, () => this.locate(target, params).selectText());
  }

  // ───────────────────────────── Checkbox / Radio ─────────────────────────────

  async check(target: Target, params?: LocatorParams): Promise<void> {
    await this.step(`Check ${this.describe(target)}`, () => this.locate(target, params).check());
  }

  async uncheck(target: Target, params?: LocatorParams): Promise<void> {
    await this.step(`Uncheck ${this.describe(target)}`, () => this.locate(target, params).uncheck());
  }

  async setChecked(target: Target, checked: boolean, params?: LocatorParams): Promise<void> {
    await this.step(`Set ${this.describe(target)} checked=${checked}`, () =>
      this.locate(target, params).setChecked(checked),
    );
  }

  async toggle(target: Target, params?: LocatorParams): Promise<void> {
    const loc = this.locate(target, params);
    await this.setChecked(loc, !(await loc.isChecked()));
  }

  /** Select a radio button within a group by its value attribute. */
  async selectRadioByValue(groupName: string, value: string): Promise<void> {
    await this.step(`Select radio ${groupName}=${value}`, () =>
      this.page.locator(`input[type="radio"][name="${groupName}"][value="${value}"]`).check(),
    );
  }

  async isChecked(target: Target, params?: LocatorParams): Promise<boolean> {
    return this.locate(target, params).isChecked();
  }

  // ───────────────────────────── Read values ─────────────────────────────

  async getText(target: Target, params?: LocatorParams): Promise<string> {
    return ((await this.locate(target, params).first().textContent()) ?? '').trim();
  }

  /** Rendered (visible) text, honours CSS like display:none / text-transform. */
  async getInnerText(target: Target, params?: LocatorParams): Promise<string> {
    return (await this.locate(target, params).first().innerText()).trim();
  }

  async getAllTexts(target: Target, params?: LocatorParams): Promise<string[]> {
    return (await this.locate(target, params).allInnerTexts()).map((t) => t.trim());
  }

  async getValue(target: Target, params?: LocatorParams): Promise<string> {
    return this.locate(target, params).first().inputValue();
  }

  async getAttribute(target: Target, attribute: string, params?: LocatorParams): Promise<string | null> {
    return this.locate(target, params).first().getAttribute(attribute);
  }

  async getAllAttributes(target: Target, attribute: string, params?: LocatorParams): Promise<(string | null)[]> {
    const items = await this.locate(target, params).all();
    return Promise.all(items.map((i) => i.getAttribute(attribute)));
  }

  async getCssValue(target: Target, property: string, params?: LocatorParams): Promise<string> {
    return this.locate(target, params)
      .first()
      .evaluate((el, prop) => window.getComputedStyle(el).getPropertyValue(prop), property);
  }

  async getInnerHTML(target: Target, params?: LocatorParams): Promise<string> {
    return this.locate(target, params).first().innerHTML();
  }

  async getCount(target: Target, params?: LocatorParams): Promise<number> {
    return this.locate(target, params).count();
  }

  async getBoundingBox(target: Target, params?: LocatorParams) {
    return this.locate(target, params).first().boundingBox();
  }

  // ───────────────────────────── State checks (non-throwing) ─────────────────────────────

  async isVisible(target: Target, params?: LocatorParams): Promise<boolean> {
    return this.locate(target, params).first().isVisible();
  }

  /** Waits up to `timeout` for visibility, returns false instead of throwing. */
  async isVisibleWithin(target: Target, timeout = 5000, params?: LocatorParams): Promise<boolean> {
    try {
      await this.locate(target, params).first().waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  async isHidden(target: Target, params?: LocatorParams): Promise<boolean> {
    return this.locate(target, params).first().isHidden();
  }

  async isEnabled(target: Target, params?: LocatorParams): Promise<boolean> {
    return this.locate(target, params).first().isEnabled();
  }

  async isDisabled(target: Target, params?: LocatorParams): Promise<boolean> {
    return this.locate(target, params).first().isDisabled();
  }

  async isEditable(target: Target, params?: LocatorParams): Promise<boolean> {
    return this.locate(target, params).first().isEditable();
  }

  async exists(target: Target, params?: LocatorParams): Promise<boolean> {
    return (await this.locate(target, params).count()) > 0;
  }

  // ───────────────────────────── Scroll / Drag / Mouse ─────────────────────────────

  async scrollIntoView(target: Target, params?: LocatorParams): Promise<void> {
    await this.step(`Scroll to ${this.describe(target)}`, () => this.locate(target, params).scrollIntoViewIfNeeded());
  }

  async dragAndDrop(source: Target, destination: Target): Promise<void> {
    await this.step(`Drag ${this.describe(source)} to ${this.describe(destination)}`, () =>
      this.locate(source).dragTo(this.locate(destination)),
    );
  }

  /** Manual drag using mouse - for libraries that don't respond to HTML5 drag events. */
  async dragAndDropByMouse(source: Target, destination: Target, steps = 20): Promise<void> {
    await this.step(`Mouse-drag ${this.describe(source)} to ${this.describe(destination)}`, async () => {
      await this.locate(source).scrollIntoViewIfNeeded();
      const s = await this.locate(source).boundingBox();
      const d = await this.locate(destination).boundingBox();
      if (!s || !d) throw new Error('Unable to resolve drag source/destination position');
      await this.page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
      await this.page.mouse.down();
      await this.page.mouse.move(d.x + d.width / 2, d.y + d.height / 2, { steps });
      await this.page.mouse.up();
    });
  }

  /** Drag an element by an x/y offset (sliders etc.). */
  async dragByOffset(target: Target, xOffset: number, yOffset: number, params?: LocatorParams): Promise<void> {
    await this.step(`Drag ${this.describe(target)} by (${xOffset}, ${yOffset})`, async () => {
      await this.locate(target, params).scrollIntoViewIfNeeded();
      const b = await this.locate(target, params).boundingBox();
      if (!b) throw new Error('Element has no bounding box');
      await this.page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await this.page.mouse.down();
      await this.page.mouse.move(b.x + b.width / 2 + xOffset, b.y + b.height / 2 + yOffset, { steps: 10 });
      await this.page.mouse.up();
    });
  }

  // ───────────────────────────── Files ─────────────────────────────

  /** Upload one or more files to an <input type=file>. Relative paths resolve from /test-data. */
  async uploadFile(target: Target, files: string | string[], params?: LocatorParams): Promise<void> {
    const list = (Array.isArray(files) ? files : [files]).map((f) =>
      path.isAbsolute(f) ? f : path.join(env.testDataDir, f),
    );
    await this.step(`Upload ${list.map((f) => path.basename(f)).join(', ')} to ${this.describe(target)}`, () =>
      this.locate(target, params).setInputFiles(list),
    );
  }

  /** Upload via the native file chooser (when there's no visible input[type=file]). */
  async uploadViaFileChooser(trigger: Target, files: string | string[]): Promise<void> {
    const list = (Array.isArray(files) ? files : [files]).map((f) =>
      path.isAbsolute(f) ? f : path.join(env.testDataDir, f),
    );
    await this.step(`Upload via file chooser from ${this.describe(trigger)}`, async () => {
      const [chooser] = await Promise.all([this.page.waitForEvent('filechooser'), this.locate(trigger).click()]);
      await chooser.setFiles(list);
    });
  }

  async clearUpload(target: Target, params?: LocatorParams): Promise<void> {
    await this.locate(target, params).setInputFiles([]);
  }

  /** Click a link/button that triggers a download, save it in /downloads and return the full path. */
  async download(trigger: Target, saveAs?: string, params?: LocatorParams): Promise<string> {
    return this.step(`Download via ${this.describe(trigger)}`, async () => {
      const [download] = await Promise.all([this.page.waitForEvent('download'), this.locate(trigger, params).click()]);
      const file = path.join(env.downloadDir, saveAs ?? download.suggestedFilename());
      await download.saveAs(file);
      return file;
    });
  }

  // ───────────────────────────── Misc ─────────────────────────────

  /** Outline an element in red (debugging / evidence screenshots). */
  async highlight(target: Target, params?: LocatorParams): Promise<void> {
    await this.locate(target, params)
      .first()
      .evaluate((el: HTMLElement) => {
        el.style.outline = '3px solid red';
        el.style.outlineOffset = '2px';
      });
  }

  async screenshot(target: Target, fileName: string, params?: LocatorParams): Promise<Buffer> {
    return this.locate(target, params)
      .first()
      .screenshot({ path: path.join(env.rootDir, 'reports', 'screenshots', `${fileName}.png`) });
  }
}
