import { BasePage } from '../BasePage';

export interface RegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  age?: string;
  dob?: string;
  address?: string;
  gender?: 'male' | 'female' | 'other' | string;
  hobbies?: string[]; // Reading | Sports | Music
  country?: string; // visible text
  skills?: string[]; // visible texts
  lineOfBusiness?: string;
  city?: string;
}

/** QA Demo App - /forms.html (customer registration). Business-level methods built on the action libraries. */
export class RegistrationPage extends BasePage {
  protected readonly path = '/forms.html';
  protected readonly repo = 'demo/forms';

  async waitForLoaded(): Promise<void> {
    await this.ui.wait.forVisible(this.el('firstName'));
  }

  async fillPersonalDetails(d: RegistrationData): Promise<void> {
    await this.ui.element.enterText(this.el('firstName'), d.firstName);
    await this.ui.element.enterText(this.el('lastName'), d.lastName);
    await this.ui.element.enterText(this.el('email'), d.email);
    if (d.phone) await this.ui.element.enterText(this.el('phone'), d.phone);
    if (d.age) await this.ui.element.enterText(this.el('age'), d.age);
    if (d.dob) await this.ui.js.setValue(this.el('dob'), d.dob); // readonly date field
    if (d.address) await this.ui.element.enterText(this.el('address'), d.address);
  }

  async fillChoices(d: RegistrationData): Promise<void> {
    if (d.gender) await this.ui.element.selectRadioByValue('gender', d.gender);
    if (d.hobbies) {
      for (const h of ['Reading', 'Sports', 'Music']) {
        await this.ui.element.setChecked(this.el('hobby'), d.hobbies.includes(h), { name: h });
      }
    }
    if (d.country) await this.ui.dropdown.selectByLabel(this.el('country'), d.country);
    if (d.skills) await this.ui.dropdown.selectMultiple(this.el('skills'), d.skills);
    if (d.lineOfBusiness) await this.ui.dropdown.selectCustom(this.el('lobDropdown'), d.lineOfBusiness, this.el('lobOptions'));
    if (d.city) await this.ui.dropdown.selectAutoSuggest(this.el('city'), d.city.slice(0, 2), d.city, this.el('citySuggestions'));
  }

  async acceptTermsAndSubmit(): Promise<void> {
    await this.ui.element.check(this.el('terms'));
    await this.ui.element.click(this.el('submit'));
  }

  async register(d: RegistrationData): Promise<string> {
    await this.fillPersonalDetails(d);
    await this.fillChoices(d);
    await this.acceptTermsAndSubmit();
    return this.getSuccessMessage();
  }

  async getSuccessMessage(): Promise<string> {
    return this.ui.element.getText(this.el('successMsg'));
  }

  /** Submitted payload rendered by the app as JSON. */
  async getSubmittedData(): Promise<Record<string, unknown>> {
    return JSON.parse(await this.ui.element.getText(this.el('result')));
  }
}
