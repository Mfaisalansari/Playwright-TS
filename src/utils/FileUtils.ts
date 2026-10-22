import * as fs from 'fs';
import * as path from 'path';

export class FileUtils {
  static ensureDir(dir: string): void {
    fs.mkdirSync(dir, { recursive: true });
  }

  static exists(file: string): boolean {
    return fs.existsSync(file);
  }

  static readText(file: string): string {
    return fs.readFileSync(file, 'utf-8');
  }

  static writeText(file: string, content: string): void {
    this.ensureDir(path.dirname(file));
    fs.writeFileSync(file, content);
  }

  static deleteFile(file: string): void {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }

  static cleanDir(dir: string): void {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    this.ensureDir(dir);
  }

  static listFiles(dir: string, ext?: string): string[] {
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((f) => !ext || f.endsWith(ext))
      .map((f) => path.join(dir, f));
  }

  /** Most recently modified file in a folder (e.g. latest download). */
  static latestFile(dir: string, ext?: string): string | undefined {
    return this.listFiles(dir, ext).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
  }

  /** Wait for a file to appear (downloads written by external processes). */
  static async waitForFile(file: string, timeoutMs = 30_000): Promise<void> {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
      if (fs.existsSync(file) && fs.statSync(file).size > 0) return;
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(`File not found within ${timeoutMs}ms: ${file}`);
  }

  static sizeInKb(file: string): number {
    return Math.round(fs.statSync(file).size / 1024);
  }
}
