import { Locator } from '@playwright/test';
import { LocatorParams, Target } from '../locators/LocatorFactory';
import { BaseActions } from './BaseActions';

/**
 * Web table / grid helpers for <table> markup.
 * Row & column indexes are 0-based; header row is excluded from row indexes.
 * For div-based grids pass custom row/cell selectors.
 */
export interface TableSelectors {
  header?: string; // default: thead th  (falls back to first row th)
  row?: string; // default: tbody tr
  cell?: string; // default: td
}

export class TableActions extends BaseActions {
  private sel(s?: TableSelectors): Required<TableSelectors> {
    return { header: s?.header ?? 'thead th, thead td', row: s?.row ?? 'tbody tr', cell: s?.cell ?? 'td' };
  }

  rows(table: Target, s?: TableSelectors, params?: LocatorParams): Locator {
    return this.locate(table, params).locator(this.sel(s).row);
  }

  async getHeaders(table: Target, s?: TableSelectors): Promise<string[]> {
    return (await this.locate(table).locator(this.sel(s).header).allInnerTexts()).map((t) => t.trim());
  }

  async getRowCount(table: Target, s?: TableSelectors): Promise<number> {
    return this.rows(table, s).count();
  }

  async getColumnCount(table: Target, s?: TableSelectors): Promise<number> {
    return (await this.getHeaders(table, s)).length;
  }

  async getColumnIndex(table: Target, header: string, s?: TableSelectors): Promise<number> {
    const headers = await this.getHeaders(table, s);
    const idx = headers.findIndex((h) => h.toLowerCase() === header.toLowerCase());
    if (idx < 0) throw new Error(`Column "${header}" not found. Headers: ${headers.join(' | ')}`);
    return idx;
  }

  cell(table: Target, row: number, col: number, s?: TableSelectors): Locator {
    const c = this.sel(s);
    return this.rows(table, s).nth(row).locator(c.cell).nth(col);
  }

  async getCellText(table: Target, row: number, col: number | string, s?: TableSelectors): Promise<string> {
    const colIdx = typeof col === 'string' ? await this.getColumnIndex(table, col, s) : col;
    return (await this.cell(table, row, colIdx, s).innerText()).trim();
  }

  async getRowTexts(table: Target, row: number, s?: TableSelectors): Promise<string[]> {
    return (await this.rows(table, s).nth(row).locator(this.sel(s).cell).allInnerTexts()).map((t) => t.trim());
  }

  async getColumnValues(table: Target, col: number | string, s?: TableSelectors): Promise<string[]> {
    const colIdx = typeof col === 'string' ? await this.getColumnIndex(table, col, s) : col;
    const count = await this.getRowCount(table, s);
    const out: string[] = [];
    for (let r = 0; r < count; r++) out.push((await this.cell(table, r, colIdx, s).innerText()).trim());
    return out;
  }

  /** Whole table as array of objects keyed by header. */
  async getTableData(table: Target, s?: TableSelectors): Promise<Record<string, string>[]> {
    const headers = await this.getHeaders(table, s);
    const count = await this.getRowCount(table, s);
    const data: Record<string, string>[] = [];
    for (let r = 0; r < count; r++) {
      const cells = await this.getRowTexts(table, r, s);
      data.push(Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ''])));
    }
    return data;
  }

  /** Index of first row containing the text (in any cell, or a specific column). -1 if none. */
  async findRowIndex(table: Target, text: string, col?: number | string, s?: TableSelectors): Promise<number> {
    if (col !== undefined) {
      const values = await this.getColumnValues(table, col, s);
      return values.findIndex((v) => v === text);
    }
    const count = await this.getRowCount(table, s);
    for (let r = 0; r < count; r++) if ((await this.getRowTexts(table, r, s)).includes(text)) return r;
    return -1;
  }

  /** Row locator by text in that row. */
  rowWithText(table: Target, text: string, s?: TableSelectors): Locator {
    return this.rows(table, s).filter({ hasText: text }).first();
  }

  /** Click an element (link/button) within the row that contains `rowText`. */
  async clickInRow(table: Target, rowText: string, elementSelector: string, s?: TableSelectors): Promise<void> {
    await this.step(`Click ${elementSelector} in row "${rowText}"`, () => this.rowWithText(table, rowText, s).locator(elementSelector).first().click());
  }

  /** Sort by clicking a header. */
  async sortBy(table: Target, header: string, s?: TableSelectors): Promise<void> {
    const idx = await this.getColumnIndex(table, header, s);
    await this.step(`Sort table by "${header}"`, () => this.locate(table).locator(this.sel(s).header).nth(idx).click());
  }

  async isColumnSorted(table: Target, col: number | string, order: 'asc' | 'desc' = 'asc', s?: TableSelectors): Promise<boolean> {
    const values = await this.getColumnValues(table, col, s);
    const sorted = [...values].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (order === 'desc') sorted.reverse();
    return values.every((v, i) => v === sorted[i]);
  }
}
