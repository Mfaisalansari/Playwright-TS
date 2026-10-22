import { BasePage } from '../BasePage';

/** QA Demo App - /dashboard.html */
export class DashboardPage extends BasePage {
  protected readonly path = '/dashboard.html';
  protected readonly repo = 'demo/dashboard';

  async waitForLoaded(): Promise<void> {
    await this.ui.wait.forUrl(/dashboard/);
    await this.ui.wait.forVisible(this.el('welcome'));
  }

  async getWelcomeText(): Promise<string> {
    return this.ui.element.getText(this.el('welcome'));
  }

  async goToRegistration(): Promise<void> {
    await this.ui.element.clickAndWaitForNavigation(this.el('goRegistration'), /forms\.html/);
  }

  async goToEmployees(): Promise<void> {
    await this.ui.element.clickAndWaitForNavigation(this.el('goEmployees'), /table\.html/);
  }

  /** Navigate using the header menu, e.g. navigateVia('alerts') */
  async navigateVia(pageName: string): Promise<void> {
    await this.ui.element.click(this.el('navLink'), { params: { page: pageName } });
  }

  async logout(): Promise<void> {
    await this.ui.element.click(this.el('logout'));
    await this.ui.wait.forUrl(/login\.html\?loggedOut=1/);
  }
}
