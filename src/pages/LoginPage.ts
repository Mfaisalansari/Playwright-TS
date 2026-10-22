import { BasePage } from './BasePage';
import { SecureAreaPage } from './SecureAreaPage';

/** Sample page object for https://the-internet.herokuapp.com/login */
export class LoginPage extends BasePage {
  protected readonly path = '/login';
  protected readonly repo = 'login';

  async waitForLoaded(): Promise<void> {
    await this.ui.wait.forVisible(this.el('username'));
  }

  async enterUsername(username: string): Promise<void> {
    await this.ui.element.enterText(this.el('username'), username);
  }

  async enterPassword(password: string): Promise<void> {
    await this.ui.element.enterSecureText(this.el('password'), password);
  }

  async clickLogin(): Promise<void> {
    await this.ui.element.click(this.el('loginButton'));
  }

  async login(username: string, password: string): Promise<SecureAreaPage> {
    await this.enterUsername(username);
    await this.enterPassword(password);
    await this.clickLogin();
    return new SecureAreaPage(this.ui);
  }

  async getFlashMessage(): Promise<string> {
    return this.ui.element.getInnerText(this.el('flashMessage'));
  }
}
