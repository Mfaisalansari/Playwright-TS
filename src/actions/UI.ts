import { Page } from '@playwright/test';
import { PageManager } from '../core/PageManager';
import { AlertActions } from './AlertActions';
import { AssertActions } from './AssertActions';
import { BrowserActions } from './BrowserActions';
import { DropdownActions } from './DropdownActions';
import { ElementActions } from './ElementActions';
import { FrameActions } from './FrameActions';
import { JavaScriptActions } from './JavaScriptActions';
import { KeyboardMouseActions } from './KeyboardMouseActions';
import { TableActions } from './TableActions';
import { WaitActions } from './WaitActions';
import { WindowActions } from './WindowActions';

/**
 * Single entry point to every action library:
 *
 *   ui.element.click('login.submit')
 *   ui.dropdown.selectByLabel('#dropdown', 'Option 1')
 *   ui.alert.accept(() => ui.element.click('alerts.jsAlert'))
 *   ui.frame.enterText('#mce_0_ifr', 'body', 'hello')
 *   ui.window.switchToNewTab(() => ui.element.click('text=Click Here'))
 *   ui.assert.textContains('login.flash', 'You logged into')
 */
export class UI {
  readonly pm: PageManager;
  readonly element: ElementActions;
  readonly dropdown: DropdownActions;
  readonly alert: AlertActions;
  readonly frame: FrameActions;
  readonly window: WindowActions;
  readonly browser: BrowserActions;
  readonly wait: WaitActions;
  readonly assert: AssertActions;
  readonly keyboard: KeyboardMouseActions;
  readonly js: JavaScriptActions;
  readonly table: TableActions;

  constructor(pageOrManager: Page | PageManager) {
    this.pm = pageOrManager instanceof PageManager ? pageOrManager : new PageManager(pageOrManager);
    this.element = new ElementActions(this.pm);
    this.dropdown = new DropdownActions(this.pm);
    this.alert = new AlertActions(this.pm);
    this.frame = new FrameActions(this.pm);
    this.window = new WindowActions(this.pm);
    this.browser = new BrowserActions(this.pm);
    this.wait = new WaitActions(this.pm);
    this.assert = new AssertActions(this.pm);
    this.keyboard = new KeyboardMouseActions(this.pm);
    this.js = new JavaScriptActions(this.pm);
    this.table = new TableActions(this.pm);
  }

  /** The page currently in focus (changes when you switch tabs/windows). */
  get page(): Page {
    return this.pm.page;
  }
}
