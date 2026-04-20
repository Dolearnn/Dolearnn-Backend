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
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
});

export const env = envSchema.parse(process.env);
