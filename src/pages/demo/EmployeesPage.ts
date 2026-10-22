import { BasePage } from '../BasePage';

/** QA Demo App - /table.html */
export class EmployeesPage extends BasePage {
  protected readonly path = '/table.html';
  protected readonly repo = 'demo/table';

  get table(): string {
    return this.el('employees');
  }

  async waitForLoaded(): Promise<void> {
    await this.ui.wait.forVisible(this.table);
  }

  async search(text: string): Promise<void> {
    await this.ui.element.enterText(this.el('search'), text);
  }

  async getDisplayedCount(): Promise<number> {
    return Number(await this.ui.element.getText(this.el('rowCount')));
  }

  async deleteEmployee(name: string): Promise<string> {
    const dialog = await this.ui.alert.accept(() => this.ui.table.clickInRow(this.table, name, '.delete-btn'));
    return dialog.message;
  }

  async editEmployee(name: string): Promise<void> {
    await this.ui.table.clickInRow(this.table, name, '.edit-btn');
  }
}
