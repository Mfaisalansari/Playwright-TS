import { logger } from '../utils/Logger';

export default async function globalTeardown(): Promise<void> {
  logger.info('══ Test run finished');
}
