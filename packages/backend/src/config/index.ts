import { envSchema } from '@fullstack/shared';
import { createLogger } from '../utils/logger';

const logger = createLogger('config');

// Load and validate environment variables
const env = envSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  PORT: Number(process.env.PORT) || 3001,
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000'
});

if (!env.success) {
  logger.error(
    { issues: env.error.issues },
    'Invalid environment configuration'
  );
  process.exit(1);
}

export const config = env.data;