import { Router } from 'express';
import { PlanProduct } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler } from '../../../lib/http';
import { listPlanPurchases, recordOfflinePurchase } from '../../billing/billing.service';

export const planAdminRoutes = Router();

planAdminRoutes.get(
  '/purchases',
  asyncHandler(async (req, res) => {
    const { take } = z.object({ take: z.coerce.number().int().min(1).max(200).default(50) }).parse(req.query);
    res.json(await listPlanPurchases({ take }));
  }),
);

// A bank transfer or lesson-centre sale the team has confirmed.
planAdminRoutes.post(
  '/purchases',
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        email: z.string().trim().email(),
        product: z.nativeEnum(PlanProduct),
        amount: z.coerce.number().int().min(0).max(1_000_000).optional(),
        note: z.string().trim().max(300).optional(),
      })
      .parse(req.body);
    res.status(201).json(await recordOfflinePurchase(req.user!, input));
  }),
);
