const bcrypt = require('bcryptjs');
const { AccountStatus, AuthProvider, PrismaClient, Role } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('PDDolearnn1#', 12);

  await prisma.user.upsert({
    where: { email: 'dolearnnn@gmail.com' },
    update: {
      name: 'DoLearn Admin',
      passwordHash,
      role: Role.ADMIN,
      status: AccountStatus.ACTIVE,
      authProvider: AuthProvider.EMAIL,
      mustChangePassword: false,
    },
    create: {
      email: 'dolearnnn@gmail.com',
      name: 'DoLearn Admin',
      passwordHash,
      role: Role.ADMIN,
      status: AccountStatus.ACTIVE,
      authProvider: AuthProvider.EMAIL,
      mustChangePassword: false,
    },
  });

  console.log('Seed complete');
  console.log('Admin: dolearnnn@gmail.com / PDDolearnn1#');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
