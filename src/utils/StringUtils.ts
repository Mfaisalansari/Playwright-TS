export class StringUtils {
  /** Replace {key} / ${key} tokens: interpolate('Hello {name}', { name: 'Faisal' }) */
  static interpolate(template: string, values: Record<string, string | number>): string {
    return template.replace(/\$?\{(\w+)\}/g, (m, k: string) => (values[k] !== undefined ? String(values[k]) : m));
  }

  static random(length = 8, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'): string {
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  static normalizeSpaces(s: string): string {
    return s.replace(/\s+/g, ' ').trim();
  }

  static extractNumber(s: string): number {
    const m = s.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
    if (!m) throw new Error(`No number found in "${s}"`);
    return Number(m[0]);
  }

  /** "£1,234.50" → 1234.5 */
  static parseCurrency(s: string): number {
    return Number(s.replace(/[^0-9.-]/g, ''));
  }

  static formatCurrency(n: number, currency = 'GBP', locale = 'en-GB'): string {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n);
  }

  static toCamelCase(s: string): string {
    return s.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase());
  }

  static toTitleCase(s: string): string {
    return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  static equalsIgnoreCase(a: string, b: string): boolean {
    return a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0;
  }

  static mask(value: string, visible = 4): string {
    return value.length <= visible ? value : '*'.repeat(value.length - visible) + value.slice(-visible);
  }
}
