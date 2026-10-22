import { Dialog } from '@playwright/test';
import { logger } from '../utils/Logger';
import { BaseActions } from './BaseActions';

export type DialogType = 'alert' | 'confirm' | 'prompt' | 'beforeunload';

export interface DialogResult {
  type: DialogType;
  message: string;
  defaultValue: string;
}

/**
 * JavaScript dialogs: alert(), confirm(), prompt(), beforeunload.
 *
 * Playwright auto-DISMISSES dialogs unless a handler is registered, and the handler must be
 * registered BEFORE the action that opens the dialog. So every method here takes the
 * triggering action as a callback:
 *
 *   const msg = await ui.alert.accept(() => ui.element.click('alerts.jsConfirmBtn'));
 */
export class AlertActions extends BaseActions {
  private persistentHandler?: (d: Dialog) => Promise<void>;
  private history: DialogResult[] = [];

  /** Accept the next dialog opened by `trigger`. For prompts, `promptText` is entered. Returns the dialog info. */
  async accept(trigger: () => Promise<unknown>, promptText?: string): Promise<DialogResult> {
    return this.step('Accept JS dialog', () =>
      this.handleNext(trigger, async (d) => {
        await d.accept(promptText);
      }),
    );
  }

  /** Dismiss (Cancel) the next dialog opened by `trigger`. */
  async dismiss(trigger: () => Promise<unknown>): Promise<DialogResult> {
    return this.step('Dismiss JS dialog', () => this.handleNext(trigger, (d) => d.dismiss()));
  }

  /** Just read the dialog message (then accept it). */
  async getText(trigger: () => Promise<unknown>): Promise<string> {
    return (await this.accept(trigger)).message;
  }

  /** Answer a prompt() dialog. */
  async answerPrompt(trigger: () => Promise<unknown>, text: string): Promise<DialogResult> {
    return this.accept(trigger, text);
  }

  /**
   * Register a handler for ALL subsequent dialogs (until removeAutoHandler()).
   * Useful when an app throws unexpected alerts.
   */
  autoAccept(promptText?: string): void {
    this.setPersistent(async (d) => {
      logger.info(`Auto-accepting ${d.type()}: "${d.message()}"`);
      await d.accept(promptText);
    });
  }

  autoDismiss(): void {
    this.setPersistent(async (d) => {
      logger.info(`Auto-dismissing ${d.type()}: "${d.message()}"`);
      await d.dismiss();
    });
  }

  removeAutoHandler(): void {
    if (this.persistentHandler) this.page.off('dialog', this.persistentHandler);
    this.persistentHandler = undefined;
  }

  /** Every dialog seen through this class during the test. */
  getHistory(): DialogResult[] {
    return [...this.history];
  }

  /** Last dialog seen. */
  getLast(): DialogResult | undefined {
    return this.history[this.history.length - 1];
  }

  private setPersistent(handler: (d: Dialog) => Promise<void>): void {
    this.removeAutoHandler();
    this.persistentHandler = async (d: Dialog) => {
      this.record(d);
      await handler(d);
    };
    this.page.on('dialog', this.persistentHandler);
  }

  private async handleNext(trigger: () => Promise<unknown>, respond: (d: Dialog) => Promise<void>): Promise<DialogResult> {
    // Temporarily suspend auto handler so it doesn't race with this one.
    const persistent = this.persistentHandler;
    if (persistent) this.page.off('dialog', persistent);

    try {
      const dialogPromise = this.page.waitForEvent('dialog');
      // Trigger may itself block until the dialog closes (e.g. click on an element opening alert),
      // so do not await it before handling.
      const triggerPromise = trigger();
      const dialog = await dialogPromise;
      const result = this.record(dialog);
      await respond(dialog);
      await triggerPromise;
      return result;
    } finally {
      if (persistent) this.page.on('dialog', persistent);
    }
  }

  private record(d: Dialog): DialogResult {
    const r: DialogResult = { type: d.type() as DialogType, message: d.message(), defaultValue: d.defaultValue() };
    this.history.push(r);
    logger.info(`Dialog [${r.type}] "${r.message}"`);
    return r;
  }
}
