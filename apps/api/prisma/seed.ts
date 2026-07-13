import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@minitms.dev';
  const password = process.env.ADMIN_PASSWORD ?? 'admin12345';

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log(`Admin seeded: ${admin.email}`);

  // DeliveryModality is reference data (DESIGN.md § 10) — a fixed catalog,
  // not something an admin CRUDs through a screen (none is speced), so it's
  // seeded rather than exposed via a write endpoint.
  const modalities = [
    { code: 'STANDARD', name: 'Standard', slaHours: 72 },
    { code: 'FULL', name: 'Full', slaHours: 48 },
    { code: 'EXPRESS', name: 'Express', slaHours: 24 },
  ];

  for (const modality of modalities) {
    await prisma.deliveryModality.upsert({
      where: { code: modality.code },
      update: {},
      create: modality,
    });
  }

  console.log(
    `Delivery modalities seeded: ${modalities.map((m) => m.code).join(', ')}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
