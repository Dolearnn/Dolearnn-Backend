import 'dotenv/config';
import { z } from 'zod';

const optionalNonEmptyString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1).optional(),
);

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  DATABASE_URL: optionalNonEmptyString,
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  FRONTEND_URLS: z.string().optional(),
  JWT_SECRET: z.string().min(24).optional(),
  JWT_EXPIRES_IN: z.string().default('7d'),
  RESET_PASSWORD_EXPIRES_IN_MINUTES: z.coerce.number().int().positive().default(30),
  ENABLE_API_DOCS: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  GOOGLE_CLIENT_ID: optionalNonEmptyString,
  EMAIL_PROVIDER: z.enum(['resend', 'sendgrid']).optional(),
  EMAIL_FROM_EMAIL: z.string().email().optional(),
  EMAIL_FROM_NAME: optionalNonEmptyString,
  RESEND_API_KEY: optionalNonEmptyString,
  SENDGRID_API_KEY: optionalNonEmptyString,
  // AI features stay switched off until a key is set.
  ANTHROPIC_API_KEY: optionalNonEmptyString,
  // Which Claude model writes explanations. Explanations are generated once per
  // question and reused, so the strongest model stays cheap; pick a smaller one
  // (for example claude-sonnet-5) here if that ever changes.
  AI_MODEL: z.string().min(1).default('claude-opus-5'),
});

export const env = envSchema.parse(process.env);
