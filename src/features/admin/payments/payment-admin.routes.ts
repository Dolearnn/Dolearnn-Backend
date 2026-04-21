import { Router } from 'express';
import { asyncHandler } from '../../../lib/http';
import {
  createPaymentSchema,
  listPayoutsQuerySchema,
  markPayoutPaidSchema,
} from './payment-admin.schemas';
import {
  createPayment,
  listLessonPackages,
  listParentsForPayments,
  listPayments,
  listPayoutSummaries,
  markPayoutPaid,
} from './payment-admin.service';

export const paymentAdminRoutes = Router();

paymentAdminRoutes.get(
  '/',
  asyncHandler(async (_req, res) => {
    const payments = await listPayments();
    res.json({ payments });
  }),
);

paymentAdminRoutes.get(
  '/lesson-packages',
  asyncHandler(async (_req, res) => {
    const packages = await listLessonPackages();
    res.json({ packages });
  }),
);

paymentAdminRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = createPaymentSchema.parse(req.body);
    const result = await createPayment(input);
    res.status(201).json(result);
  }),
);

paymentAdminRoutes.get(
  '/parents',
  asyncHandler(async (_req, res) => {
    const parents = await listParentsForPayments();
    res.json({ parents });
  }),
);

paymentAdminRoutes.get(
  '/payouts',
  asyncHandler(async (req, res) => {
    const input = listPayoutsQuerySchema.parse(req.query);
    const payouts = await listPayoutSummaries(input.month);
    res.json({ payouts });
  }),
);

paymentAdminRoutes.post(
  '/payouts/mark-paid',
  asyncHandler(async (req, res) => {
    const input = markPayoutPaidSchema.parse(req.body);
    const payout = await markPayoutPaid(input);
    res.json({ payout });
  }),
);
