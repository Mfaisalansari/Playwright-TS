import * as fs from 'fs';
import * as path from 'path';
import { env } from '../config/env';

/** JSON read/write with dotted-path lookup:  JsonReader.get('users.json', 'admin.username') */
export class JsonReader {
  static resolve(file: string): string {
    return path.isAbsolute(file) ? file : path.join(env.testDataDir, file);
  }

  static read<T = any>(file: string): T {
    return JSON.parse(fs.readFileSync(this.resolve(file), 'utf-8')) as T;
  }

  static get<T = any>(file: string, dottedPath: string): T {
    const value = dottedPath.split('.').reduce<any>((obj, key) => (obj == null ? undefined : obj[key]), this.read(file));
    if (value === undefined) throw new Error(`Path "${dottedPath}" not found in ${file}`);
    return value as T;
  }

  static write(file: string, data: unknown): void {
    const full = this.resolve(file);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, JSON.stringify(data, null, 2));
  }

  /** Deep-merge `patch` into an existing JSON file. */
  static update(file: string, patch: Record<string, unknown>): void {
    const current = fs.existsSync(this.resolve(file)) ? this.read(file) : {};
    this.write(file, deepMerge(current, patch));
  }
}

export function deepMerge<T extends Record<string, any>>(target: T, source: Record<string, any>): T {
  const out: Record<string, any> = { ...target };
  for (const [k, v] of Object.entries(source)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && typeof out[k] === 'object' ? deepMerge(out[k], v) : v;
  }
  return out as T;
}
