import { Router } from 'express';
import { PlanProduct } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler } from '../../lib/http';
import { requireAuth } from '../../middleware/auth';
import { rateLimit } from '../../middleware/rate-limit';
import { confirmCheckout, getMyBilling, handlePaystackEvent, startCheckout } from './billing.service';
import { isPaystackSignature } from './paystack';
import { listProducts } from './plans';

export const billingRoutes = Router();

const byUser = (req: { user?: { id: string } }) => req.user?.id ?? 'anonymous';

// Public: plan names and today's prices.
billingRoutes.get(
  '/plans',
  asyncHandler(async (_req, res) => {
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ products: listProducts() });
  }),
);

// Paystack calls this after a payment. Only signed calls are acted on, and the
// payment is still checked with Paystack before Pro is switched on.
billingRoutes.post(
  '/paystack/webhook',
  asyncHandler(async (req, res) => {
    if (!req.rawBody || !isPaystackSignature(req.rawBody, req.header('x-paystack-signature'))) {
      res.sendStatus(401);
      return;
    }
    await handlePaystackEvent(req.body);
    res.sendStatus(200);
  }),
);

billingRoutes.use(requireAuth);

billingRoutes.get(
  '/me',
  asyncHandler(async (req, res) => {
    res.json(await getMyBilling(req.user!));
  }),
);

billingRoutes.post(
  '/checkout',
  rateLimit({
    keyPrefix: 'billing-checkout',
    windowMs: 10 * 60 * 1000,
    max: 10,
    message: 'Too many payment attempts. Please wait a few minutes.',
    keyGenerator: byUser,
  }),
  asyncHandler(async (req, res) => {
    const { product } = z.object({ product: z.nativeEnum(PlanProduct) }).parse(req.body);
    res.status(201).json(await startCheckout(req.user!, product));
  }),
);

billingRoutes.post(
  '/confirm',
  rateLimit({
    keyPrefix: 'billing-confirm',
    windowMs: 10 * 60 * 1000,
    max: 30,
    message: 'Too many checks. Please wait a few minutes.',
    keyGenerator: byUser,
  }),
  asyncHandler(async (req, res) => {
    const { reference } = z.object({ reference: z.string().trim().min(6).max(100) }).parse(req.body);
    res.json(await confirmCheckout(req.user!, reference));
  }),
);
