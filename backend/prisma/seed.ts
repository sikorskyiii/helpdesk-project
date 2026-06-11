import { PrismaClient, RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Seed Roles
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: RoleName.SUPER_ADMIN },
      update: {},
      create: { name: RoleName.SUPER_ADMIN, description: 'Full system access' },
    }),
    prisma.role.upsert({
      where: { name: RoleName.ORG_ADMIN },
      update: {},
      create: { name: RoleName.ORG_ADMIN, description: 'Organization administrator' },
    }),
    prisma.role.upsert({
      where: { name: RoleName.AGENT },
      update: {},
      create: { name: RoleName.AGENT, description: 'Support agent' },
    }),
    prisma.role.upsert({
      where: { name: RoleName.CUSTOMER },
      update: {},
      create: { name: RoleName.CUSTOMER, description: 'Customer / end user' },
    }),
  ]);

  console.log(`✅ Roles seeded: ${roles.map((r) => r.name).join(', ')}`);

  // Seed Super Admin user
  const superAdminRole = roles.find((r) => r.name === RoleName.SUPER_ADMIN)!;
  const passwordHash = await bcrypt.hash('Admin123!', 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@helpdesk.com' },
    update: {},
    create: {
      email: 'admin@helpdesk.com',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      isEmailVerified: true,
      isActive: true,
    },
  });

  console.log(`✅ Super Admin seeded: ${superAdmin.email}`);

  // Seed demo organization
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo-org',
      description: 'Demo organization for testing',
      ownerId: superAdmin.id,
      isActive: true,
    },
  });

  console.log(`✅ Organization seeded: ${org.name}`);

  // Add super admin as member
  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: superAdmin.id } },
    update: {},
    create: {
      organizationId: org.id,
      userId: superAdmin.id,
      roleId: superAdminRole.id,
    },
  });

  console.log('✅ Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
