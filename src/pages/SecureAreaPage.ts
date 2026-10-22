import { BasePage } from './BasePage';

export class SecureAreaPage extends BasePage {
  protected readonly path = '/secure';
  protected readonly repo = 'secure';

  async waitForLoaded(): Promise<void> {
    await this.ui.wait.forVisible(this.el('heading'));
  }

  async getHeading(): Promise<string> {
    return this.ui.element.getText(this.el('heading'));
  }

  async logout(): Promise<void> {
    await this.ui.element.click(this.el('logoutButton'));
  }
}
