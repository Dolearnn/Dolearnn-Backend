import { PlanProduct } from '@prisma/client';

/*
 * What learners can buy, and what the free plan includes. Prices are naira.
 * From the JAMB 2027 growth strategy: two plans only (Free and Pro), with the
 * Exam Season Pass as three months of Pro for one payment. The frontend shows
 * the same numbers (Dolearnn-Frontend/lib/pricing.ts); change both together.
 */

// The founding Exam Season Pass price applies to payments made before
// 1 January 2027, Lagos time (UTC+1).
export const FOUNDING_PASS_ENDS_AT = new Date('2027-01-01T00:00:00+01:00');

type Product = {
  name: string;
  price: number;
  foundingPrice?: number;
  months: number;
};

export const PRODUCTS: Record<PlanProduct, Product> = {
  [PlanProduct.PRO_MONTH]: { name: 'Pro, 1 month', price: 4_500, months: 1 },
  [PlanProduct.EXAM_PASS]: { name: 'Exam Season Pass', price: 12_000, foundingPrice: 8_000, months: 3 },
};

export const FREE_LIMITS = {
  // Quizzes a free learner can start each Lagos day. The Daily and Arena
  // battles are always free and do not count.
  quizzesPerDay: 5,
  // Full UTME papers a free learner can start each Lagos calendar month.
  utmePapersPerMonth: 1,
} as const;

export function priceOf(product: PlanProduct, at = new Date()) {
  const { price, foundingPrice } = PRODUCTS[product];
  return foundingPrice !== undefined && at < FOUNDING_PASS_ENDS_AT ? foundingPrice : price;
}

/** The plans as the pricing page shows them. */
export function listProducts(at = new Date()) {
  return (Object.keys(PRODUCTS) as PlanProduct[]).map((product) => {
    const { name, price, months } = PRODUCTS[product];
    const current = priceOf(product, at);
    return {
      product,
      name,
      months,
      price: current,
      // The usual price, shown crossed out while the founding price applies.
      fullPrice: price,
      foundingEndsAt: current < price ? FOUNDING_PASS_ENDS_AT.toISOString() : null,
    };
  });
}

/** Same day of the month, `months` later (clamped to the month's last day). */
export function addMonths(from: Date, months: number) {
  const result = new Date(from);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}
