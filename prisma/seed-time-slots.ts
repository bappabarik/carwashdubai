/**
 * Seeds a starting weekly schedule: every day, 09:00-21:00 in 1-hour slots,
 * capacity 2 (adjust to match how many wash teams you actually have).
 * Safe to re-run - skips any slot that already exists (same day+start+end).
 *
 * Run once: npx tsx prisma/seed-time-slots.ts
 * Customize via env vars if you want a different shape without editing code:
 *   SEED_SLOT_START_HOUR=9 SEED_SLOT_END_HOUR=21 SEED_SLOT_CAPACITY=2 npx tsx prisma/seed-time-slots.ts
 */
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

const START_HOUR = Number(process.env.SEED_SLOT_START_HOUR ?? 9);
const END_HOUR = Number(process.env.SEED_SLOT_END_HOUR ?? 21);
const CAPACITY = Number(process.env.SEED_SLOT_CAPACITY ?? 2);

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

async function main() {
  let created = 0;
  let skipped = 0;

  for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
    for (let hour = START_HOUR; hour < END_HOUR; hour++) {
      const startTime = `${pad(hour)}:00`;
      const endTime = `${pad(hour + 1)}:00`;

      const existing = await prisma.timeSlotTemplate.findUnique({
        where: { dayOfWeek_startTime_endTime: { dayOfWeek, startTime, endTime } },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.timeSlotTemplate.create({
        data: { dayOfWeek, startTime, endTime, capacity: CAPACITY },
      });
      created++;
    }
  }

  console.log(`✅ Done. Created ${created} slots, skipped ${skipped} that already existed.`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });