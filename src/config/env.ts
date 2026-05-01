import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  DATABASE_URL: z.string().min(1).optional(),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  FRONTEND_URLS: z.string().optional(),
  JWT_SECRET: z.string().min(24).optional(),
  JWT_EXPIRES_IN: z.string().default('7d'),
  RESET_PASSWORD_EXPIRES_IN_MINUTES: z.coerce.number().int().positive().default(30),
  ENABLE_API_DOCS: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  EMAIL_PROVIDER: z.enum(['resend', 'sendgrid']).optional(),
  EMAIL_FROM_EMAIL: z.string().email().optional(),
  EMAIL_FROM_NAME: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  SENDGRID_API_KEY: z.string().min(1).optional(),
});

export const env = envSchema.parse(process.env);
