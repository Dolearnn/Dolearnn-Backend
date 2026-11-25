-- Paid learner plans: Pro (monthly) and the Exam Season Pass, paid through
-- Paystack or recorded by an admin. Also marks full UTME papers, which free
-- accounts get once a month. Additive and safe to run more than once.

DO $$ BEGIN
  CREATE TYPE "PlanProduct" AS ENUM ('PRO_MONTH', 'EXAM_PASS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PlanPurchaseStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TYPE "PaymentGateway" ADD VALUE IF NOT EXISTS 'PAYSTACK';

ALTER TABLE "QuizAttempt" ADD COLUMN IF NOT EXISTS "isUtme" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "PlanPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "product" "PlanProduct" NOT NULL,
    "amount" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "PlanPurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "gateway" "PaymentGateway" NOT NULL,
    "channel" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "recordedById" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlanPurchase_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PlanPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlanPurchase_reference_key" ON "PlanPurchase"("reference");
CREATE INDEX IF NOT EXISTS "PlanPurchase_userId_status_endsAt_idx" ON "PlanPurchase"("userId", "status", "endsAt");
CREATE INDEX IF NOT EXISTS "PlanPurchase_status_paidAt_idx" ON "PlanPurchase"("status", "paidAt");
