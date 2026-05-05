/**
 * Create or promote a user to ADMIN role.
 * Usage: npx tsx scripts/create-admin.ts <email> <password>
 */
import { getPrismaClient } from "../src/db/client";
import { hashPassword } from "../src/lib/password";

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error("Usage: npx tsx scripts/create-admin.ts <email> <password>");
    process.exit(1);
  }

  const prisma = getPrismaClient();
  const normalized = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: normalized } });

  if (existing) {
    await prisma.user.update({
      where: { email: normalized },
      data: { role: "ADMIN" },
    });
    console.log(`Promoted existing user ${normalized} to ADMIN.`);
  } else {
    const passwordHash = await hashPassword(password);
    await prisma.user.create({
      data: {
        email: normalized,
        passwordHash,
        name: "Admin",
        role: "ADMIN",
      },
    });
    console.log(`Created new ADMIN user: ${normalized}`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
