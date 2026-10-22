import { faker } from '@faker-js/faker';

/**
 * Random test-data generation (Faker). Call DataGenerator.seed(n) for reproducible data.
 */
export class DataGenerator {
  static seed(value: number): void {
    faker.seed(value);
  }

  static firstName = (): string => faker.person.firstName();
  static lastName = (): string => faker.person.lastName();
  static fullName = (): string => faker.person.fullName();
  static email = (domain?: string): string =>
    domain ? `${faker.internet.username().toLowerCase()}.${Date.now()}@${domain}` : faker.internet.email().toLowerCase();
  static username = (): string => `${faker.internet.username()}${faker.number.int(999)}`.replace(/[^a-zA-Z0-9_]/g, '');
  static password = (length = 12): string =>
    `${faker.internet.password({ length: length - 3 })}A1!`; // guarantees upper/digit/special
  static phone = (): string => faker.phone.number();
  static mobile10 = (): string => faker.string.numeric({ length: 10, allowLeadingZeros: false });
  static company = (): string => faker.company.name();
  static jobTitle = (): string => faker.person.jobTitle();

  static address() {
    return {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      zip: faker.location.zipCode(),
      country: faker.location.country(),
    };
  }

  static number = (min = 0, max = 1000): number => faker.number.int({ min, max });
  static decimal = (min = 0, max = 1000, precision = 2): number =>
    faker.number.float({ min, max, fractionDigits: precision });
  static amount = (min = 100, max = 100_000): string => faker.finance.amount({ min, max, dec: 2 });
  static alphanumeric = (length = 8): string => faker.string.alphanumeric(length);
  static alpha = (length = 8): string => faker.string.alpha(length);
  static numeric = (length = 6): string => faker.string.numeric(length);
  static uuid = (): string => faker.string.uuid();
  static sentence = (): string => faker.lorem.sentence();
  static paragraph = (): string => faker.lorem.paragraph();
  static boolean = (): boolean => faker.datatype.boolean();
  static pick = <T>(items: T[]): T => faker.helpers.arrayElement(items);
  static pastDate = (years = 1): Date => faker.date.past({ years });
  static futureDate = (years = 1): Date => faker.date.future({ years });
  static dob = (minAge = 18, maxAge = 65): Date => faker.date.birthdate({ min: minAge, max: maxAge, mode: 'age' });
  static creditCardNumber = (): string => faker.finance.creditCardNumber(); // fake, for test inputs only
  static iban = (): string => faker.finance.iban();

  /** Unique business-style reference, e.g. "POL-20261022-4821". */
  static reference(prefix = 'REF'): string {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    return `${prefix}-${ymd}-${faker.string.numeric(4)}`;
  }

  /** A complete fake user. */
  static user() {
    const firstName = this.firstName();
    const lastName = this.lastName();
    return {
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      email: `${firstName}.${lastName}.${faker.string.numeric(4)}@example.com`.toLowerCase(),
      username: this.username(),
      password: this.password(),
      phone: this.mobile10(),
      dob: this.dob(),
      address: this.address(),
    };
  }
}
