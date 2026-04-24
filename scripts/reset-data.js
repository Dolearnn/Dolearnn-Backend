const { PrismaClient, Role } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const admins = await prisma.user.findMany({
    where: { role: Role.ADMIN },
    select: { id: true, email: true, role: true },
  });

  if (admins.length === 0) {
    throw new Error('Reset aborted: no admin accounts found to preserve');
  }

  const adminIds = admins.map((admin) => admin.id);

  await prisma.$transaction([
    prisma.lead.deleteMany({}),
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
    prisma.user.deleteMany({ where: { id: { notIn: adminIds } } }),
  ]);

  const remaining = await prisma.user.findMany({
    select: { email: true, role: true },
    orderBy: { email: 'asc' },
  });
  console.log(`Reset complete. Remaining users (${remaining.length}):`);
  for (const u of remaining) console.log(`  - ${u.email} (${u.role})`);

  const nonAdminsRemaining = remaining.filter((user) => user.role !== Role.ADMIN);
  if (nonAdminsRemaining.length > 0) {
    throw new Error('Expected only admin users to remain after reset');
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
