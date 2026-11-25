import crypto from 'crypto';
import {
  PaymentGateway,
  PlanProduct,
  PlanPurchaseStatus,
  Prisma,
  Role,
} from '@prisma/client';
import { env } from '../../config/env';
import { AppError } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import { naira } from '../../lib/pricing';
import { createAdminNotifications, createNotification } from '../notifications/notification.service';
import { FREE_LIMITS, PRODUCTS, addMonths, listProducts, priceOf } from './plans';
import {
  initializeTransaction,
  paystackEnabled,
  verifyTransaction,
  type PaystackTransaction,
} from './paystack';

type BillingUser = { id: string; email: string; role: Role };

// Lagos is UTC+1 all year (no daylight saving).
const LAGOS_OFFSET = '+01:00';
const LAGOS_OFFSET_MS = 60 * 60 * 1000;

// Today in Lagos as "YYYY-MM-DD" (the same day the Daily and streaks use).
function lagosToday() {
  return new Date(Date.now() + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
}

function lagosDayStart() {
  return new Date(`${lagosToday()}T00:00:00${LAGOS_OFFSET}`);
}

function lagosMonthStart() {
  return new Date(`${lagosToday().slice(0, 7)}-01T00:00:00${LAGOS_OFFSET}`);
}

function lagosDate(date: Date) {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' });
}

// ---------------------------------------------------------------------------
// Plan status and free-plan limits
// ---------------------------------------------------------------------------

/** Pro when a paid purchase covers now; `proUntil` is the end of the last one. */
export async function getPlan(userId: string, now = new Date()) {
  const [active, last] = await Promise.all([
    prisma.planPurchase.findFirst({
      where: { userId, status: PlanPurchaseStatus.PAID, startsAt: { lte: now }, endsAt: { gt: now } },
      select: { product: true },
    }),
    prisma.planPurchase.aggregate({
      where: { userId, status: PlanPurchaseStatus.PAID, endsAt: { gt: now } },
      _max: { endsAt: true },
    }),
  ]);
  return {
    plan: active ? ('PRO' as const) : ('FREE' as const),
    product: active?.product ?? null,
    proUntil: active ? last._max.endsAt : null,
  };
}

// Only learner accounts have limits; teachers and admins try quizzes freely.
function hasLimits(role: Role) {
  return role === Role.STUDENT || role === Role.PARENT;
}

async function getUsage(userId: string) {
  const [quizzesToday, utmePapersThisMonth] = await Promise.all([
    prisma.quizAttempt.count({
      where: {
        userId,
        startedAt: { gte: lagosDayStart() },
        isDaily: false,
        isUtme: false,
        arenaEntry: { is: null },
      },
    }),
    prisma.quizAttempt.count({
      where: { userId, isUtme: true, startedAt: { gte: lagosMonthStart() } },
    }),
  ]);
  return { quizzesToday, utmePapersThisMonth };
}

/**
 * Stops a free learner who has used up today's quizzes or this month's UTME
 * paper. Called before a quiz is created; Arena and the Daily never come here.
 */
export async function assertCanStartQuiz(user: { id: string; role: Role }, options: { utme: boolean }) {
  if (!hasLimits(user.role)) return;
  const { plan } = await getPlan(user.id);
  if (plan === 'PRO') return;

  const usage = await getUsage(user.id);
  if (options.utme && usage.utmePapersThisMonth >= FREE_LIMITS.utmePapersPerMonth) {
    throw new AppError(
      402,
      'You have used this month’s free UTME paper. Upgrade to Pro for unlimited full papers, or try again next month.',
      'PLAN_LIMIT',
    );
  }
  if (!options.utme && usage.quizzesToday >= FREE_LIMITS.quizzesPerDay) {
    throw new AppError(
      402,
      `You have used your ${FREE_LIMITS.quizzesPerDay} free quizzes for today. Upgrade to Pro for unlimited practice, or come back tomorrow.`,
      'PLAN_LIMIT',
    );
  }
}

/** Everything the learner's Plan page needs. */
export async function getMyBilling(user: BillingUser) {
  const [plan, usage, purchases] = await Promise.all([
    getPlan(user.id),
    getUsage(user.id),
    prisma.planPurchase.findMany({
      where: { userId: user.id, status: PlanPurchaseStatus.PAID },
      orderBy: { paidAt: 'desc' },
      take: 20,
      select: {
        id: true,
        product: true,
        amount: true,
        gateway: true,
        channel: true,
        reference: true,
        paidAt: true,
        startsAt: true,
        endsAt: true,
      },
    }),
  ]);
  return {
    ...plan,
    limited: hasLimits(user.role) && plan.plan === 'FREE',
    limits: FREE_LIMITS,
    usage,
    products: listProducts(),
    onlinePayment: paystackEnabled(),
    purchases,
  };
}

// ---------------------------------------------------------------------------
// Buying
// ---------------------------------------------------------------------------

function newReference(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}`.toUpperCase();
}

/** Starts a Paystack payment and returns the page to send the learner to. */
export async function startCheckout(user: BillingUser, product: PlanProduct) {
  if (!hasLimits(user.role)) {
    throw new AppError(403, 'Plans are for learner accounts.');
  }
  if (!paystackEnabled()) {
    throw new AppError(503, 'Online payment is not switched on yet. Please contact us on WhatsApp to pay.');
  }

  const amount = priceOf(product);
  const purchase = await prisma.planPurchase.create({
    data: {
      userId: user.id,
      product,
      amount,
      reference: newReference('DL'),
      gateway: PaymentGateway.PAYSTACK,
    },
  });

  const transaction = await initializeTransaction({
    email: user.email,
    amountNaira: amount,
    reference: purchase.reference,
    // Paystack adds ?reference=... when it sends the learner back.
    callbackUrl: `${env.FRONTEND_URL.replace(/\/+$/, '')}/student/plan`,
    metadata: { purchaseId: purchase.id, product, cancel_action: `${env.FRONTEND_URL.replace(/\/+$/, '')}/student/plan` },
  });

  return { authorizationUrl: transaction.authorization_url, reference: purchase.reference };
}

/**
 * Turns on Pro for a paid purchase, starting when the learner's current Pro
 * ends (or now). Safe to call more than once for the same purchase: the
 * webhook and the learner's return to the site can both arrive.
 */
async function activatePurchase(
  purchaseId: string,
  paid: { channel?: string | null; paidAt?: Date },
) {
  return prisma.$transaction(async (db) => {
    const purchase = await db.planPurchase.findUnique({ where: { id: purchaseId } });
    if (!purchase) return null;
    // One activation at a time per learner, so two passes never overlap.
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${purchase.userId}))`;

    const fresh = await db.planPurchase.findUnique({ where: { id: purchaseId } });
    if (!fresh || fresh.status === PlanPurchaseStatus.PAID) return { purchase: fresh, activated: false };

    const now = new Date();
    const current = await db.planPurchase.aggregate({
      where: { userId: fresh.userId, status: PlanPurchaseStatus.PAID, endsAt: { gt: now } },
      _max: { endsAt: true },
    });
    const startsAt = current._max.endsAt ?? now;
    const endsAt = addMonths(startsAt, PRODUCTS[fresh.product].months);

    const updated = await db.planPurchase.update({
      where: { id: purchaseId },
      data: {
        status: PlanPurchaseStatus.PAID,
        channel: paid.channel ?? fresh.channel,
        paidAt: paid.paidAt ?? now,
        startsAt,
        endsAt,
      },
    });
    return { purchase: updated, activated: true };
  });
}

async function announce(purchaseId: string) {
  const purchase = await prisma.planPurchase.findUnique({
    where: { id: purchaseId },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  });
  if (!purchase?.endsAt) return;
  const { name } = PRODUCTS[purchase.product];
  await createNotification({
    userId: purchase.user.id,
    role: purchase.user.role,
    title: 'Pro is on',
    body: `Thank you! Your ${name} (${naira(purchase.amount)}) is active until ${lagosDate(purchase.endsAt)}. Unlimited quizzes, full UTME papers and the weekly parent report are now open.`,
  }).catch((error) => console.error('Could not send the payment notification', error));
  await createAdminNotifications({
    title: 'New plan payment',
    body: `${purchase.user.name} (${purchase.user.email}) paid ${naira(purchase.amount)} for ${name} via ${purchase.gateway === PaymentGateway.PAYSTACK ? `Paystack${purchase.channel ? ` (${purchase.channel})` : ''}` : 'an offline payment'}. Reference ${purchase.reference}.`,
  }).catch((error) => console.error('Could not send the admin payment alert', error));
}

/** Applies what Paystack says about a payment. Returns the purchase, if ours. */
async function applyTransaction(transaction: PaystackTransaction) {
  const purchase = await prisma.planPurchase.findUnique({ where: { reference: transaction.reference } });
  if (!purchase) return null;
  if (purchase.status === PlanPurchaseStatus.PAID) return purchase;

  if (transaction.status !== 'success') {
    if (transaction.status === 'failed') {
      await prisma.planPurchase.updateMany({
        where: { id: purchase.id, status: PlanPurchaseStatus.PENDING },
        data: { status: PlanPurchaseStatus.FAILED },
      });
    }
    return prisma.planPurchase.findUnique({ where: { id: purchase.id } });
  }

  // Never trust a payment for less than the price we asked for.
  if (transaction.currency !== 'NGN' || transaction.amount < purchase.amount * 100) {
    console.error('Paystack amount mismatch', transaction.reference, transaction.amount, transaction.currency);
    await createAdminNotifications({
      title: 'Payment needs checking',
      body: `Paystack reference ${transaction.reference} reported ${transaction.currency} ${transaction.amount / 100}, but the plan costs ${naira(purchase.amount)}. Pro was not switched on.`,
    }).catch(() => undefined);
    return purchase;
  }

  const result = await activatePurchase(purchase.id, {
    channel: transaction.channel ?? null,
    paidAt: transaction.paid_at ? new Date(transaction.paid_at) : undefined,
  });
  if (result?.activated) void announce(purchase.id);
  return result?.purchase ?? purchase;
}

/** Called when Paystack sends the learner back: asks Paystack how it went. */
export async function confirmCheckout(user: BillingUser, reference: string) {
  const purchase = await prisma.planPurchase.findUnique({ where: { reference } });
  if (!purchase || purchase.userId !== user.id) {
    throw new AppError(404, 'Payment not found');
  }
  const updated =
    purchase.status === PlanPurchaseStatus.PAID ? purchase : await applyTransaction(await verifyTransaction(reference));
  return {
    status: updated?.status ?? purchase.status,
    product: purchase.product,
    endsAt: updated?.endsAt ?? null,
  };
}

/** Paystack's webhook: a signed "charge.success" event. */
export async function handlePaystackEvent(event: { event?: string; data?: { reference?: string } }) {
  if (event.event !== 'charge.success' || !event.data?.reference) return;
  // Re-check with Paystack rather than trusting the event body alone.
  await applyTransaction(await verifyTransaction(event.data.reference));
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

/** A bank transfer, cash or lesson-centre sale, confirmed by an admin. */
export async function recordOfflinePurchase(
  admin: BillingUser,
  input: { email: string; product: PlanProduct; amount?: number; note?: string },
) {
  const learner = await prisma.user.findUnique({
    where: { email: input.email.trim().toLowerCase() },
    select: { id: true, role: true },
  });
  if (!learner || !hasLimits(learner.role)) {
    throw new AppError(404, 'No learner account uses that email.');
  }

  const purchase = await prisma.planPurchase.create({
    data: {
      userId: learner.id,
      product: input.product,
      amount: input.amount ?? priceOf(input.product),
      reference: newReference('OFF'),
      gateway: PaymentGateway.OFFLINE,
      recordedById: admin.id,
      note: input.note?.trim() || null,
    },
  });
  const result = await activatePurchase(purchase.id, {});
  if (result?.activated) void announce(purchase.id);
  return result?.purchase ?? purchase;
}

export async function listPlanPurchases(query: { take: number }) {
  const where: Prisma.PlanPurchaseWhereInput = { status: PlanPurchaseStatus.PAID };
  const now = new Date();
  const [purchases, totals, activeLearners] = await Promise.all([
    prisma.planPurchase.findMany({
      where,
      orderBy: { paidAt: 'desc' },
      take: query.take,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.planPurchase.groupBy({
      by: ['product'],
      where,
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.planPurchase.findMany({
      where: { ...where, startsAt: { lte: now }, endsAt: { gt: now } },
      distinct: ['userId'],
      select: { userId: true },
    }),
  ]);
  return {
    purchases: purchases.map((purchase) => ({
      id: purchase.id,
      learner: purchase.user,
      product: purchase.product,
      amount: purchase.amount,
      gateway: purchase.gateway,
      channel: purchase.channel,
      reference: purchase.reference,
      note: purchase.note,
      paidAt: purchase.paidAt,
      startsAt: purchase.startsAt,
      endsAt: purchase.endsAt,
    })),
    totals: totals.map((total) => ({
      product: total.product,
      count: total._count._all,
      amount: total._sum.amount ?? 0,
    })),
    activeProLearners: activeLearners.length,
  };
}
