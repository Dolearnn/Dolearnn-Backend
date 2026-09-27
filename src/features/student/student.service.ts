import { Prisma, Role } from '@prisma/client';
import { AppError } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import type { GuestBaselineInput, UpdateLearnerProfileInput } from './student.schemas';

type StudentUser = { id: string; role: Role };

function jsonValue(value: NonNullable<UpdateLearnerProfileInput['guestBaseline']>) {
  return value as Prisma.InputJsonValue;
}

function assertStudent(user: StudentUser) {
  if (user.role !== Role.STUDENT) {
    throw new AppError(403, 'This area is for learner accounts');
  }
}

async function profileView(userId: string) {
  const profile = await prisma.learnerProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  const subjects = profile.subjectIds.length
    ? await prisma.subject.findMany({
        where: { id: { in: profile.subjectIds }, isActive: true },
        select: { id: true, slug: true, name: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      })
    : [];

  return { ...profile, subjects };
}

export async function getLearnerProfile(user: StudentUser) {
  assertStudent(user);
  return profileView(user.id);
}

export async function updateLearnerProfile(user: StudentUser, input: UpdateLearnerProfileInput) {
  assertStudent(user);

  const uniqueSubjectIds = [...new Set(input.subjectIds)];
  const subjectCount = await prisma.subject.count({
    where: { id: { in: uniqueSubjectIds }, isActive: true },
  });
  if (subjectCount !== uniqueSubjectIds.length) {
    throw new AppError(400, 'One or more selected subjects are unavailable');
  }

  await prisma.learnerProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      stage: input.stage,
      externalExams: [...new Set(input.externalExams)],
      subjectIds: uniqueSubjectIds,
      examDate: input.examDate ? new Date(`${input.examDate}T00:00:00.000Z`) : null,
      guestBaseline:
        input.guestBaseline === null
          ? Prisma.JsonNull
          : input.guestBaseline
            ? jsonValue(input.guestBaseline)
            : undefined,
      onboardingCompleted: true,
    },
    update: {
      stage: input.stage,
      externalExams: [...new Set(input.externalExams)],
      subjectIds: uniqueSubjectIds,
      examDate: input.examDate ? new Date(`${input.examDate}T00:00:00.000Z`) : null,
      ...(input.guestBaseline !== undefined
        ? {
            guestBaseline:
              input.guestBaseline === null ? Prisma.JsonNull : jsonValue(input.guestBaseline),
          }
        : {}),
      onboardingCompleted: true,
    },
  });

  return profileView(user.id);
}

export async function saveGuestBaseline(user: StudentUser, input: GuestBaselineInput) {
  assertStudent(user);
  return prisma.learnerProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, guestBaseline: input.guestBaseline },
    update: { guestBaseline: input.guestBaseline },
  });
}
