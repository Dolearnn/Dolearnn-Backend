import { Role } from '@prisma/client';
import { z } from 'zod';

// There is one kind of self-service account: the learner. Older clients may
// still send "PARENT"; it is accepted and ignored.
const selfServiceRole = z
  .enum([Role.STUDENT, Role.PARENT])
  .optional()
  .transform(() => Role.STUDENT);

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  email: z.string().trim().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  whatsapp: z.string().trim().optional(),
  accountType: selfServiceRole,
});

export const loginSchema = z.object({
  email: z.string().trim().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const googleAuthSchema = z.object({
  idToken: z.string().min(1, 'Google ID token is required'),
  accountType: selfServiceRole,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Valid email is required'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
