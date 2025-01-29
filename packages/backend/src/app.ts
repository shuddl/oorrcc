import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { config } from './config';
import { errorHandler } from './middleware/error';
import { createLogger } from './utils/logger';
import userRoutes from './routes/user.routes';

const logger = createLogger('app');

export const createApp = () => {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: config.CORS_ORIGIN,
    credentials: true
  }));

  // Request logging
  app.use(pinoHttp({
    logger: createLogger('http'),
    customLogLevel: (res, err) => {
      if (res.statusCode >= 400 && res.statusCode < 500) return 'warn';
      if (res.statusCode >= 500 || err) return 'error';
      return 'info';
    }
  }));

  // Body parsing
  app.use(express.json());

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Routes
  app.use('/api/users', userRoutes);

  // Error handling
  app.use(errorHandler);

  return app;
};

export const startServer = async () => {
  const app = createApp();

  app.listen(config.PORT, () => {
    logger.info(
      { port: config.PORT, env: config.NODE_ENV },
      'Server started'
    );
  });
};