import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  DATABASE_URL: z.string().min(1).optional(),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
});

export const env = envSchema.parse(process.env);
