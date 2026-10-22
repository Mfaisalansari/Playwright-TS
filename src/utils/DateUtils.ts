/**
 * Date helpers with no external dependency.
 * Format tokens: yyyy, yy, MMMM, MMM, MM, M, dd, d, HH, hh, mm, ss, SSS, a
 */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export class DateUtils {
  static format(date: Date, pattern = 'dd/MM/yyyy'): string {
    const pad = (n: number, l = 2) => String(n).padStart(l, '0');
    const h12 = date.getHours() % 12 || 12;
    const map: Record<string, string> = {
      yyyy: String(date.getFullYear()),
      yy: String(date.getFullYear()).slice(-2),
      MMMM: MONTHS[date.getMonth()],
      MMM: MONTHS[date.getMonth()].slice(0, 3),
      MM: pad(date.getMonth() + 1),
      M: String(date.getMonth() + 1),
      dd: pad(date.getDate()),
      d: String(date.getDate()),
      HH: pad(date.getHours()),
      hh: pad(h12),
      mm: pad(date.getMinutes()),
      ss: pad(date.getSeconds()),
      SSS: pad(date.getMilliseconds(), 3),
      a: date.getHours() < 12 ? 'AM' : 'PM',
    };
    return pattern.replace(/yyyy|yy|MMMM|MMM|MM|M|dd|d|HH|hh|mm|ss|SSS|a/g, (t) => map[t]);
  }

  static today(pattern = 'dd/MM/yyyy'): string {
    return this.format(new Date(), pattern);
  }

  static now(pattern = 'yyyy-MM-dd HH:mm:ss'): string {
    return this.format(new Date(), pattern);
  }

  static timestamp(): string {
    return this.format(new Date(), 'yyyyMMdd_HHmmss');
  }

  static addDays(days: number, from = new Date()): Date {
    const d = new Date(from);
    d.setDate(d.getDate() + days);
    return d;
  }

  static addMonths(months: number, from = new Date()): Date {
    const d = new Date(from);
    d.setMonth(d.getMonth() + months);
    return d;
  }

  static addYears(years: number, from = new Date()): Date {
    const d = new Date(from);
    d.setFullYear(d.getFullYear() + years);
    return d;
  }

  /** Relative date string, e.g. DateUtils.relative('+30d') / '-1y' / '+2m' → formatted. */
  static relative(expr: string, pattern = 'dd/MM/yyyy'): string {
    const m = /^([+-]\d+)([dmy])$/.exec(expr.trim());
    if (!m) throw new Error(`Invalid relative date "${expr}". Use +Nd, -Nm, +Ny`);
    const n = Number(m[1]);
    const d = m[2] === 'd' ? this.addDays(n) : m[2] === 'm' ? this.addMonths(n) : this.addYears(n);
    return this.format(d, pattern);
  }

  /** Parse dd/MM/yyyy or yyyy-MM-dd. */
  static parse(value: string): Date {
    let m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(value);
    if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(value);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const d = new Date(value);
    if (isNaN(d.getTime())) throw new Error(`Unparseable date "${value}"`);
    return d;
  }

  static daysBetween(a: Date, b: Date): number {
    return Math.round((b.getTime() - a.getTime()) / 86_400_000);
  }

  static isWeekend(d = new Date()): boolean {
    return d.getDay() === 0 || d.getDay() === 6;
  }

  static nextBusinessDay(from = new Date()): Date {
    let d = this.addDays(1, from);
    while (this.isWeekend(d)) d = this.addDays(1, d);
    return d;
  }
}
