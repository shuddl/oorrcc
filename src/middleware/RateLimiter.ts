import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  middleware = (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Get existing requests for this IP
    let requests = this.requests.get(ip) || [];
    requests = requests.filter(time => time > windowStart);

    if (requests.length >= this.config.max) {
      logger.warn('Rate limit exceeded', { ip });
      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later'
        }
      });
    }

    requests.push(now);
    this.requests.set(ip, requests);

    next();
  };
}