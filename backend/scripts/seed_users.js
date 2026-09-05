import { prisma } from '../src/utils/prisma.js';
import bcrypt from 'bcryptjs';

async function main() {
  const passwordHash = await bcrypt.hash('dealflow360', 4);
  
  const sales = await prisma.user.upsert({
    where: { email: 'sales@dealflow360.com' },
    update: { passwordHash },
    create: {
      name: 'Sales Rep',
      email: 'sales@dealflow360.com',
      passwordHash,
      role: 'SALESPERSON'
    }
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@dealflow360.com' },
    update: { passwordHash },
    create: {
      name: 'Sales Manager',
      email: 'manager@dealflow360.com',
      passwordHash,
      role: 'MANAGER'
    }
  });
  
  console.log('Test users ensured:');
  console.log('1. sales@dealflow360.com / dealflow360');
  console.log('2. manager@dealflow360.com / dealflow360');
}

main().catch(console.error).finally(() => prisma.$disconnect());
