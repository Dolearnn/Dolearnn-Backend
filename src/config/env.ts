import 'dotenv/config';
import { z } from 'zod';

const optionalNonEmptyString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1).optional(),
);

// The sender address. Accepts "you@x.com" or "Name <you@x.com>" (quotes and
// spaces are ignored). A value that still isn't an email turns email off with a
// warning instead of stopping the whole server.
const senderEmail = z.preprocess((value) => {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.trim().replace(/^["']|["']$/g, '');
  if (!cleaned) return undefined;
  const address = (cleaned.match(/<([^>]+)>/)?.[1] ?? cleaned).trim();
  if (z.string().email().safeParse(address).success) return address;
  console.warn('EMAIL_FROM_EMAIL is not a valid email address, so email is turned off. Set it to an address like you@example.com.');
  return undefined;
}, z.string().email().optional());

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
  // Streak and "questions ready" emails to learners. Off unless set to true.
  REMINDER_EMAILS_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  GOOGLE_CLIENT_ID: optionalNonEmptyString,
  EMAIL_PROVIDER: z.enum(['resend', 'sendgrid', 'smtp']).optional(),
  EMAIL_FROM_EMAIL: senderEmail,
  EMAIL_FROM_NAME: optionalNonEmptyString,
  RESEND_API_KEY: optionalNonEmptyString,
  SENDGRID_API_KEY: optionalNonEmptyString,
  // Used when EMAIL_PROVIDER=smtp (sent through nodemailer).
  SMTP_HOST: optionalNonEmptyString,
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  // true for port 465 (TLS from the start); false for 587/25 (STARTTLS).
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  SMTP_USER: optionalNonEmptyString,
  SMTP_PASS: optionalNonEmptyString,
  // What a learner pays for one tutoring session, in naira. Tutors are paid
  // their own per-session rate (by default 50% of this).
  TUTORING_SESSION_PRICE: z.coerce.number().positive().default(10000),
  // AI features stay switched off until a key is set.
  ANTHROPIC_API_KEY: optionalNonEmptyString,
  // Which Claude model writes explanations. Explanations are generated once per
  // question and reused, so the strongest model stays cheap; pick a smaller one
  // (for example claude-sonnet-5) here if that ever changes.
  AI_MODEL: z.string().min(1).default('claude-opus-5'),
});

export const env = envSchema.parse(process.env);
