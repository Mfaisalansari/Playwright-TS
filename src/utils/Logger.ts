import * as fs from 'fs';
import * as path from 'path';
import winston from 'winston';
import { env } from '../config/env';

if (!fs.existsSync(env.logDir)) fs.mkdirSync(env.logDir, { recursive: true });

const fmt = winston.format.printf(({ level, message, timestamp, worker }) =>
  `${timestamp} [${level.toUpperCase().padEnd(5)}]${worker !== undefined ? ` [w${worker}]` : ''} ${message}`,
);

/**
 * Framework logger (winston). Writes to console and logs/execution.log, errors also to logs/error.log.
 * Each Playwright worker tags its lines with the worker index.
 */
export const logger = winston.createLogger({
  level: env.logLevel,
  defaultMeta: { worker: process.env.TEST_WORKER_INDEX },
  format: winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }), fmt),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(env.logDir, 'execution.log') }),
    new winston.transports.File({ filename: path.join(env.logDir, 'error.log'), level: 'error' }),
  ],
});

export default logger;
