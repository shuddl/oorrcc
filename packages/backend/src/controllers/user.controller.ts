import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { UserService } from '../services/user.service';
import { createUserSchema, updateUserSchema } from '@fullstack/shared';
import { AuthRequest } from '../middleware/auth';
import { createLogger } from '../utils/logger';

const logger = createLogger('user-controller');
const userService = new UserService();

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const input = createUserSchema.parse(req.body);
  const user = await userService.createUser(input);
  
  logger.info({ userId: user.id }, 'User created');
  res.status(201).json({ success: true, data: user });
});

export const updateUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      }
    });
  }

  const input = updateUserSchema.parse(req.body);
  const user = await userService.updateUser(req.user.id, input);

  logger.info({ userId: user.id }, 'User updated');
  res.json({ success: true, data: user });
});