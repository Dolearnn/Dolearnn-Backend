import { Router } from 'express';
import { asyncHandler } from '../../../lib/http';
import {
  createPaymentSchema,
  listLessonPackagesQuerySchema,
  listPaymentsQuerySchema,
  listPayoutsQuerySchema,
  markPayoutPaidSchema,
} from './payment-admin.schemas';
import {
  createPayment,
  listLessonPackages,
  listLessonPackagesPage,
  listParentsForPayments,
  listPayments,
  listPaymentsPage,
  listPayoutSummaries,
  markPayoutPaid,
} from './payment-admin.service';

export const paymentAdminRoutes = Router();

paymentAdminRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const hasQuery = Object.keys(req.query).length > 0;
    const result = hasQuery
      ? await listPaymentsPage(listPaymentsQuerySchema.parse(req.query))
      : await listPayments();
    res.json(result);
  }),
);

paymentAdminRoutes.get(
  '/lesson-packages',
  asyncHandler(async (req, res) => {
    const hasQuery = Object.keys(req.query).length > 0;
    const result = hasQuery
      ? await listLessonPackagesPage(listLessonPackagesQuerySchema.parse(req.query))
      : await listLessonPackages();
    res.json(result);
  }),
);

paymentAdminRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = createPaymentSchema.parse(req.body);
    const result = await createPayment(input, req.user!);
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
    const payout = await markPayoutPaid(input, req.user!);
    res.json({ payout });
  }),
);
