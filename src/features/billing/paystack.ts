import crypto from 'crypto';
import { env } from '../../config/env';
import { AppError } from '../../lib/http';

/*
 * The small part of the Paystack API we use: start a payment, check one, and
 * recognise Paystack's webhook calls. Amounts go to Paystack in kobo.
 */

const TIMEOUT_MS = 15_000;

export type PaystackTransaction = {
  reference: string;
  status: string; // "success", "failed", "abandoned"...
  amount: number; // kobo
  currency: string;
  channel?: string | null;
  paid_at?: string | null;
};

export function paystackEnabled() {
  return Boolean(env.PAYSTACK_SECRET_KEY);
}

function secretKey() {
  if (!env.PAYSTACK_SECRET_KEY) {
    throw new AppError(503, 'Online payment is not switched on yet. Please contact us on WhatsApp to pay.');
  }
  return env.PAYSTACK_SECRET_KEY;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${secretKey()}`);
  if (init.body) headers.set('Content-Type', 'application/json');

  let response: Response;
  try {
    response = await fetch(`${env.PAYSTACK_BASE_URL.replace(/\/+$/, '')}${path}`, {
      ...init,
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    console.error('Paystack request failed', error);
    throw new AppError(502, 'We could not reach the payment service. Please try again.');
  }

  const body = (await response.json().catch(() => null)) as { status?: boolean; message?: string; data?: T } | null;
  if (!response.ok || !body?.status || body.data === undefined) {
    console.error('Paystack error', response.status, body?.message);
    throw new AppError(502, 'The payment service did not accept the request. Please try again.');
  }
  return body.data;
}

export function initializeTransaction(input: {
  email: string;
  amountNaira: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}) {
  return call<{ authorization_url: string; reference: string }>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email: input.email,
      amount: input.amountNaira * 100,
      currency: 'NGN',
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
  });
}

export function verifyTransaction(reference: string) {
  return call<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

/** True when the body really came from Paystack (signed with our secret key). */
export function isPaystackSignature(rawBody: Buffer, signature: string | undefined) {
  if (!env.PAYSTACK_SECRET_KEY || !signature) return false;
  const expected = crypto.createHmac('sha512', env.PAYSTACK_SECRET_KEY).update(rawBody).digest('hex');
  const given = Buffer.from(signature, 'utf8');
  const wanted = Buffer.from(expected, 'utf8');
  return given.length === wanted.length && crypto.timingSafeEqual(given, wanted);
}
