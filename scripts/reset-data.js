const { PrismaClient } = require('@prisma/client');

const ADMIN_EMAIL = 'dolearnnn@gmail.com';

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction([
    prisma.cancellationRequest.deleteMany({}),
    prisma.sessionNote.deleteMany({}),
    prisma.attendance.deleteMany({}),
    prisma.session.deleteMany({}),
    prisma.sessionProposal.deleteMany({}),
    prisma.sessionBookingRequest.deleteMany({}),
    prisma.studentLessonPackage.deleteMany({}),
    prisma.studentSubjectAssignment.deleteMany({}),
    prisma.goal.deleteMany({}),
    prisma.intakeSchedule.deleteMany({}),
    prisma.intake.deleteMany({}),
    prisma.notification.deleteMany({}),
    prisma.payment.deleteMany({}),
    prisma.teacherPayout.deleteMany({}),
    prisma.student.deleteMany({}),
    prisma.parentProfile.deleteMany({}),
    prisma.teacherProfile.deleteMany({}),
    prisma.user.deleteMany({ where: { email: { not: ADMIN_EMAIL } } }),
  ]);

  const remaining = await prisma.user.findMany({ select: { email: true, role: true } });
  console.log(`Reset complete. Remaining users (${remaining.length}):`);
  for (const u of remaining) console.log(`  - ${u.email} (${u.role})`);

  if (remaining.length !== 1 || remaining[0].email !== ADMIN_EMAIL) {
    throw new Error(`Expected only ${ADMIN_EMAIL} to remain`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
