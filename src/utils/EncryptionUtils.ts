import * as crypto from 'crypto';

/**
 * Keep passwords out of plain-text test data:
 *   1. export SECRET_KEY=<any passphrase>
 *   2. npx ts-node -e "console.log(require('./src/utils/EncryptionUtils').EncryptionUtils.encrypt('MyPass'))"
 *   3. store "ENC(<output>)" in test data; TestDataManager decrypts it automatically.
 */
export class EncryptionUtils {
  private static key(): Buffer {
    const secret = process.env.SECRET_KEY;
    if (!secret) throw new Error('SECRET_KEY environment variable is required for encryption/decryption');
    return crypto.createHash('sha256').update(secret).digest();
  }

  static encrypt(plain: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.key(), iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return `${iv.toString('hex')}:${enc.toString('hex')}`;
  }

  static decrypt(payload: string): string {
    const [ivHex, dataHex] = payload.split(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.key(), Buffer.from(ivHex, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
  }

  /** Decrypt values wrapped like ENC(...) ; other values returned unchanged. */
  static resolve(value: string): string {
    const m = /^ENC\((.+)\)$/.exec(value ?? '');
    return m ? this.decrypt(m[1]) : value;
  }

  static base64Encode = (s: string): string => Buffer.from(s).toString('base64');
  static base64Decode = (s: string): string => Buffer.from(s, 'base64').toString('utf8');
}
