import { z } from 'zod';

function isSafeHttpsUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export const safeMeetingLinkSchema = z
  .string()
  .trim()
  .url('Valid meeting link is required')
  .refine(isSafeHttpsUrl, {
    message: 'Meeting link must use https',
  });
