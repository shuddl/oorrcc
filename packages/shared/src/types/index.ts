import { z } from 'zod';

// User schemas
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(2),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type User = {
  id: string;
  email: string;
export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional()
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),

export type ApiError = z.infer<typeof apiErrorSchema>;

export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: apiErrorSchema.optional()
});

export type ApiResponse = z.infer<typeof apiResponseSchema>;

// Environment configuration schema
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  DATABASE_URL: z.string().url(),

  JWT_SECRET: z.string().min(32),
  PORT: z.number().int().positive(),
  CORS_ORIGIN: z.string().url()
});

export type Env = z.infer<typeof envSchema>;

// Add additional auth-related types if necessary
export type AuthToken = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
};
// Authentication token types
export type AuthToken = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
};