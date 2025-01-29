import { Router } from 'express';
import { createUser, updateUser } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/', createUser);
router.put('/me', authenticate, updateUser); // Ensure authenticate middleware is applied

export default router;