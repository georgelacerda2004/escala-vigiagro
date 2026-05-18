import { prisma } from './config/prisma.js';
import { env } from './config/env.js';
import { hashPassword } from './services/userService.js';
import { logger } from './config/logger.js';

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: env.admin.email } });
  if (existing) {
    logger.info(`[seed] admin ja existe (${env.admin.email})`);
  } else {
    await prisma.user.create({
      data: {
        name: env.admin.name,
        email: env.admin.email,
        role: 'ADMIN',
        passwordHash: await hashPassword(env.admin.password),
      },
    });
    logger.info(`[seed] admin criado: ${env.admin.email} / senha definida no .env`);
  }
}

main()
  .catch((e) => {
    logger.error(`[seed] ${e.message}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
