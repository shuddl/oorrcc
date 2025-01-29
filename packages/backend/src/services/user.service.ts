import { db } from '../db';
import { createLogger } from '../utils/logger';
import { CreateUserInput, UpdateUserInput, User } from '@fullstack/shared';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const logger = createLogger('user-service');

export class UserService {
  async createUser(input: CreateUserInput): Promise<User> {
    const passwordHash = await bcrypt.hash(input.password, 10);
    const id = randomUUID();
    const now = new Date();

    try {
      await db.execute({
        sql: `
          INSERT INTO users (id, email, name, password_hash, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
          RETURNING *
        `,
        args: [id, input.email, input.name, passwordHash, now.toISOString(), now.toISOString()]
      });

      if (!result.rows[0]) {
        throw new Error('Failed to create user');
      }

      const user = result.rows[0];
      return {
        id: user.id as string,
        email: user.email as string,
        name: user.name as string,
        createdAt: new Date(user.created_at as string),
        updatedAt: new Date(user.updated_at as string)
      };
    } catch (error) {
      logger.error({ error, email: input.email }, 'Failed to create user');
      throw new Error('User creation failed');
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const result = await db.execute({
        sql: 'SELECT * FROM users WHERE email = ?',
        args: [email]
      });

      if (!result.rows[0]) return null;

      const user = result.rows[0];
      return {
        id: user.id as string,
        email: user.email as string,
        name: user.name as string,
        createdAt: new Date(user.created_at as number),
        updatedAt: new Date(user.updated_at as number)
      };
    } catch (error) {
      logger.error({ error, email }, 'Failed to get user by email');
      throw error;
    }
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    const updates: string[] = [];
    const values: any[] = [];

    if (input.name) {
      updates.push('name = ?');
      values.push(input.name);
    }

    if (input.email) {
      updates.push('email = ?');
      values.push(input.email);
    }

    if (updates.length === 0) {
      throw new Error('No updates provided');
    }

    const now = new Date();
    updates.push('updated_at = ?');
    values.push(now.getTime());
    values.push(id);

    try {
      const result = await db.execute({
        sql: `
          UPDATE users
          SET ${updates.join(', ')}
          WHERE id = ?
          RETURNING *
        `,
        args: values
      });

      if (!result.rows[0]) {
        throw new Error('User not found');
      }

      const user = result.rows[0];
      return {
        id: user.id as string,
        email: user.email as string,
        name: user.name as string,
        createdAt: new Date(user.created_at as number),
        updatedAt: new Date(user.updated_at as number)
      };
    } catch (error) {
      logger.error({ error, userId: id }, 'Failed to update user');
          RETURNING *
      throw error;
    }
  }
}
        `,
        args: values
      });

      if (!result.rows[0]) {
        throw new Error('User not found');
      }

      const user = result.rows[0];
      return {
        id: user.id as string,
        email: user.email as string,
        name: user.name as string,
        createdAt: new Date(user.created_at as number),
        updatedAt: new Date(user.updated_at as number)
      };
    } catch (error) {
      logger.error({ error, userId: id }, 'Failed to update user');
      throw error;
    }
  }
}