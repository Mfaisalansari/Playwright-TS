import * as fs from 'fs';
import * as path from 'path';
import { env } from '../config/env';

export type LocatorStrategy =
  | 'css'
  | 'xpath'
  | 'id'
  | 'name'
  | 'text'
  | 'exactText'
  | 'role'
  | 'label'
  | 'placeholder'
  | 'testid'
  | 'alt'
  | 'title'
  | 'playwright'; // any native Playwright selector, e.g. "text=Login >> nth=0"

export interface LocatorDefinition {
  strategy: LocatorStrategy;
  /** Locator value. Supports placeholders: {0}, {1} or {name} replaced at runtime. */
  value: string;
  /** For role strategy: accessible name, exact, etc. */
  options?: { name?: string; exact?: boolean; checked?: boolean; level?: number; includeHidden?: boolean };
  /** Optional iframe chain: CSS/XPath selectors of frames, outermost first. */
  frames?: string[];
  /** Optional filters applied after locating. */
  hasText?: string;
  nth?: number | 'first' | 'last';
  /** Backup locators tried when the primary one is not found (self-healing). */
  fallbacks?: Omit<LocatorDefinition, 'fallbacks' | 'frames'>[];
  description?: string;
}

/**
 * Object Repository
 * -----------------
 * Every *.json file under /object-repository is loaded. The file name becomes the page key:
 *   object-repository/login.json  { "username": {...} }   →   "login.username"
 * Nested folders are supported: object-repository/admin/users.json → "admin/users.grid"
 */
class ObjectRepositoryImpl {
  private repo = new Map<string, LocatorDefinition>();
  private loaded = false;

  private load(): void {
    if (this.loaded) return;
    this.loaded = true;
    if (!fs.existsSync(env.objectRepoDir)) return;
    this.walk(env.objectRepoDir);
  }

  private walk(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) this.walk(full);
      else if (entry.name.endsWith('.json')) this.loadFile(full);
    }
  }

  private loadFile(file: string): void {
    const pageKey = path
      .relative(env.objectRepoDir, file)
      .replace(/\\/g, '/')
      .replace(/\.json$/, '');
    const json = JSON.parse(fs.readFileSync(file, 'utf-8')) as Record<string, LocatorDefinition>;
    for (const [name, def] of Object.entries(json)) {
      if (!def.strategy || def.value === undefined) {
        throw new Error(`Object repository entry "${pageKey}.${name}" in ${file} needs "strategy" and "value"`);
      }
      this.repo.set(`${pageKey}.${name}`, def);
    }
  }

  has(key: string): boolean {
    this.load();
    return this.repo.has(key);
  }

  get(key: string): LocatorDefinition {
    this.load();
    const def = this.repo.get(key);
    if (!def) throw new Error(`Locator "${key}" not found in object repository (${env.objectRepoDir})`);
    return def;
  }

  /** Register / override a locator at runtime (useful for dynamic pages). */
  register(key: string, def: LocatorDefinition): void {
    this.load();
    this.repo.set(key, def);
  }

  keys(prefix = ''): string[] {
    this.load();
    return [...this.repo.keys()].filter((k) => k.startsWith(prefix));
  }
}

export const ObjectRepository = new ObjectRepositoryImpl();
