import { BasePage } from '../BasePage';
import { DashboardPage } from './DashboardPage';

/** QA Demo App - /login.html */
export class DemoLoginPage extends BasePage {
  protected readonly path = '/login.html';
  protected readonly repo = 'demo/login';

  async waitForLoaded(): Promise<void> {
    await this.ui.wait.forVisible(this.el('username'));
  }

  async login(username: string, password: string, rememberMe = false): Promise<DashboardPage> {
    await this.ui.element.enterText(this.el('username'), username);
    await this.ui.element.enterSecureText(this.el('password'), password);
    if (rememberMe) await this.ui.element.check(this.el('rememberMe'));
    await this.ui.element.click(this.el('loginButton'));
    return new DashboardPage(this.ui);
  }

  async getError(): Promise<string> {
    return this.ui.element.getText(this.el('error'));
  }
}
