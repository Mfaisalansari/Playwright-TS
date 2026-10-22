import { BaseActions } from './BaseActions';

/**
 * Page-level keyboard & mouse (Selenium "Actions" class equivalent).
 * Key names: https://playwright.dev/docs/api/class-keyboard  e.g. 'Enter', 'Tab', 'ArrowDown', 'Control+A', 'ControlOrMeta+C'
 */
export class KeyboardMouseActions extends BaseActions {
  // ─────────── Keyboard ───────────

  async press(key: string, times = 1): Promise<void> {
    await this.step(`Press ${key}${times > 1 ? ` ×${times}` : ''}`, async () => {
      for (let i = 0; i < times; i++) await this.page.keyboard.press(key);
    });
  }

  async type(text: string, delayMs = 0): Promise<void> {
    await this.step(`Keyboard type "${text}"`, () => this.page.keyboard.type(text, { delay: delayMs }));
  }

  /** Insert text without key events (fast; like paste). */
  async insertText(text: string): Promise<void> {
    await this.page.keyboard.insertText(text);
  }

  async keyDown(key: string): Promise<void> {
    await this.page.keyboard.down(key);
  }

  async keyUp(key: string): Promise<void> {
    await this.page.keyboard.up(key);
  }

  async pressTab(times = 1): Promise<void> {
    await this.press('Tab', times);
  }

  async pressEnter(): Promise<void> {
    await this.press('Enter');
  }

  async pressEscape(): Promise<void> {
    await this.press('Escape');
  }

  async selectAll(): Promise<void> {
    await this.press('ControlOrMeta+A');
  }

  async copy(): Promise<void> {
    await this.press('ControlOrMeta+C');
  }

  async paste(): Promise<void> {
    await this.press('ControlOrMeta+V');
  }

  async cut(): Promise<void> {
    await this.press('ControlOrMeta+X');
  }

  async undo(): Promise<void> {
    await this.press('ControlOrMeta+Z');
  }

  /** Read clipboard text (Chromium; needs clipboard-read permission). */
  async getClipboardText(): Promise<string> {
    await this.pm.context.grantPermissions(['clipboard-read', 'clipboard-write']);
    return this.page.evaluate(() => navigator.clipboard.readText());
  }

  // ─────────── Mouse ───────────

  async moveTo(x: number, y: number, steps = 1): Promise<void> {
    await this.page.mouse.move(x, y, { steps });
  }

  async clickAt(x: number, y: number, button: 'left' | 'right' | 'middle' = 'left'): Promise<void> {
    await this.step(`Mouse click at (${x}, ${y})`, () => this.page.mouse.click(x, y, { button }));
  }

  async doubleClickAt(x: number, y: number): Promise<void> {
    await this.page.mouse.dblclick(x, y);
  }

  async mouseDown(button: 'left' | 'right' | 'middle' = 'left'): Promise<void> {
    await this.page.mouse.down({ button });
  }

  async mouseUp(button: 'left' | 'right' | 'middle' = 'left'): Promise<void> {
    await this.page.mouse.up({ button });
  }

  /** Mouse wheel scroll by delta (positive deltaY scrolls down). */
  async wheel(deltaX: number, deltaY: number): Promise<void> {
    await this.page.mouse.wheel(deltaX, deltaY);
  }

  /** Draw a path (signature pads / canvas). */
  async drawPath(points: { x: number; y: number }[]): Promise<void> {
    if (!points.length) return;
    await this.page.mouse.move(points[0].x, points[0].y);
    await this.page.mouse.down();
    for (const p of points.slice(1)) await this.page.mouse.move(p.x, p.y, { steps: 5 });
    await this.page.mouse.up();
  }
}
