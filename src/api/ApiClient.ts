import { APIRequestContext, APIResponse, expect } from '@playwright/test';
import { logger } from '../utils/Logger';

type Params = Record<string, string | number | boolean>;

export interface ApiResult<T = any> {
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  body: T;
  durationMs: number;
  raw: APIResponse;
}

/**
 * Thin REST wrapper over Playwright's APIRequestContext with logging, auth and timing.
 * Use for API tests, or to create/clean up test data before UI tests (much faster than UI).
 */
export class ApiClient {
  private headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };

  constructor(private readonly request: APIRequestContext, private readonly baseUrl = '') {}

  setBearerToken(token: string): this {
    this.headers.Authorization = `Bearer ${token}`;
    return this;
  }

  setBasicAuth(user: string, pass: string): this {
    this.headers.Authorization = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
    return this;
  }

  setHeader(name: string, value: string): this {
    this.headers[name] = value;
    return this;
  }

  get<T = any>(url: string, params?: Params) {
    return this.send<T>('GET', url, { params });
  }
  post<T = any>(url: string, data?: unknown, params?: Params) {
    return this.send<T>('POST', url, { data, params });
  }
  put<T = any>(url: string, data?: unknown) {
    return this.send<T>('PUT', url, { data });
  }
  patch<T = any>(url: string, data?: unknown) {
    return this.send<T>('PATCH', url, { data });
  }
  delete<T = any>(url: string) {
    return this.send<T>('DELETE', url, {});
  }

  /** multipart/form-data upload */
  async upload<T = any>(url: string, fieldName: string, filePath: string, extra: Record<string, string> = {}) {
    const { ['Content-Type']: _drop, ...headers } = this.headers;
    const fs = await import('fs');
    const path = await import('path');
    return this.send<T>('POST', url, {
      headers,
      multipart: {
        ...extra,
        [fieldName]: { name: path.basename(filePath), mimeType: 'application/octet-stream', buffer: fs.readFileSync(filePath) },
      },
    });
  }

  private async send<T>(method: string, url: string, opts: Record<string, any>): Promise<ApiResult<T>> {
    const full = /^https?:\/\//.test(url) ? url : `${this.baseUrl}${url}`;
    const start = Date.now();
    logger.info(`API ${method} ${full}${opts.data ? ` body=${JSON.stringify(opts.data).slice(0, 300)}` : ''}`);
    const raw = await this.request.fetch(full, { method, headers: opts.headers ?? this.headers, ...opts });
    const durationMs = Date.now() - start;
    const text = await raw.text();
    let body: any = text;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      /* non-JSON body */
    }
    logger.info(`API ${method} ${full} -> ${raw.status()} (${durationMs}ms)`);
    return { status: raw.status(), ok: raw.ok(), headers: raw.headers(), body: body as T, durationMs, raw };
  }

  // ─────────── Response assertions ───────────

  static expectStatus(res: ApiResult, status: number): void {
    expect(res.status, `Expected HTTP ${status} but got ${res.status}: ${JSON.stringify(res.body).slice(0, 500)}`).toBe(status);
  }

  /** Light schema check: every key exists with the expected JS type ("string" | "number" | "boolean" | "object" | "array"). */
  static expectShape(obj: Record<string, any>, shape: Record<string, string>): void {
    for (const [key, type] of Object.entries(shape)) {
      expect(obj, `Missing field "${key}"`).toHaveProperty(key);
      const actual = Array.isArray(obj[key]) ? 'array' : obj[key] === null ? 'null' : typeof obj[key];
      expect(actual, `Field "${key}" type`).toBe(type);
    }
  }

  static expectResponseTime(res: ApiResult, maxMs: number): void {
    expect(res.durationMs, `Response time ${res.durationMs}ms exceeds ${maxMs}ms`).toBeLessThanOrEqual(maxMs);
  }
}
