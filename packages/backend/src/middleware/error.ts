import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { createLogger } from '../utils/logger';
import { ApiError } from '@fullstack/shared';

const logger = createLogger('error-middleware');

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  logger.error({ err, req: { method: req.method, url: req.url } }, 'Error occurred');

  if (err instanceof ZodError) {
    const apiError: ApiError = {
      code: 'VALIDATION_ERROR',
      message: 'Invalid request data',
      details: err.flatten()
    };
    return res.status(400).json({ success: false, error: apiError });
  }

  // Handle known error types
  if (err.name === 'UnauthorizedError') {
    const apiError: ApiError = {
      code: 'UNAUTHORIZED',
      message: 'Authentication required'
    };
    return res.status(401).json({ success: false, error: apiError });
  }

  // Default error response
  const apiError: ApiError = {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred'
  };
  
  res.status(500).json({ success: false, error: apiError });
};