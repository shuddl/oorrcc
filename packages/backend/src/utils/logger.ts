import pino from 'pino';
import { config } from '../config';

const baseLogger = pino({
  level: config.NODE_ENV === 'development' ? 'debug' : 'info',
  transport: config.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined,
  redact: ['password', 'token', 'authorization']
});

export const createLogger = (name: string) => baseLogger.child({ name });