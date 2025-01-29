import { createClient } from '@libsql/client';
import { config } from '../config';
import { createLogger } from '../utils/logger';

const logger = createLogger('database');

export const db = createClient({
  url: config.DATABASE_URL
});

// Initialize database connection
export const initDatabase = async () => {
  try {
    await db.execute(`SELECT 1`);
    logger.info('Database connection established');
  } catch (error) {
    logger.error({ error }, 'Failed to connect to database');
    throw error;
  }
};