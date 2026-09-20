-- AI explanations: one table caching an AI-written explanation per question.
-- Purely additive. Apply once (e.g. npx prisma db execute --file prisma/ai-explanations.sql --schema prisma/schema.prisma).

BEGIN;

-- CreateTable
CREATE TABLE "QuestionExplanation" (
    "questionId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionExplanation_pkey" PRIMARY KEY ("questionId")
);

-- AddForeignKey
ALTER TABLE "QuestionExplanation" ADD CONSTRAINT "QuestionExplanation_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;


COMMIT;
