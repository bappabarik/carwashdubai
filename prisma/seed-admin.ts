/**
 * Seeds the first admin account. Run once, manually:
 *   npx tsx prisma/seed-admin.ts
 *
 * There is no public API for creating admin/staff accounts on purpose -
 * a self-serve "create an admin" endpoint is a security hole. Once this
 * first admin exists, they can create further staff accounts through a
 * backoffice-only, admin-protected endpoint (to be added).
 */
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@example.com";
  const password = "ChangeMe123!";
  const name = "Super Admin";

  const existing = await prisma.staffMember.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin with email ${email} already exists. Nothing to do.`);
    return;
  }

  const passwordHash = await argon2.hash(password);

  const admin = await prisma.staffMember.create({
    data: { email, passwordHash, name, role: "admin" },
  });

  console.log("✅ Admin account created:");
  console.log(`   email: ${admin.email}`);
  console.log(`   password: ${password}  (change this after first login)`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    // process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });