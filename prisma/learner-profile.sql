-- Additive schema required by the student-first account flow.
-- Review and apply to the configured database before enabling student signup.
CREATE TABLE IF NOT EXISTS "LearnerProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "stage" TEXT,
  "externalExams" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "subjectIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "examDate" TIMESTAMP(3),
  "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
  "guestBaseline" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LearnerProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LearnerProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "LearnerProfile_userId_key"
  ON "LearnerProfile"("userId");
