import { startServer } from './app';
import { initDatabase } from './db';
import { createLogger } from './utils/logger';

const logger = createLogger('server');

const start = async () => {
  try {
    await initDatabase();
    await startServer();
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
};

start();