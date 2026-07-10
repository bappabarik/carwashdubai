import { PrismaClient, Prisma } from "@prisma/client";
import { NotFoundError, ConflictError } from "../../utils/errors";
import type { CreateTimeSlotBody, UpdateTimeSlotBody } from "./time-slots.schema";

// ── Admin CRUD ──────────────────────────────

export async function listTemplates(prisma: PrismaClient) {
  return prisma.timeSlotTemplate.findMany({
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
}

export async function createTemplate(prisma: PrismaClient, data: CreateTimeSlotBody) {
  try {
    return await prisma.timeSlotTemplate.create({ data });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ConflictError("A time slot with this day and start/end time already exists");
    }
    throw err;
  }
}

export async function updateTemplate(prisma: PrismaClient, id: string, data: UpdateTimeSlotBody) {
  const existing = await prisma.timeSlotTemplate.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Time slot not found");

  return prisma.timeSlotTemplate.update({ where: { id }, data });
}

export async function deleteTemplate(prisma: PrismaClient, id: string) {
  const existing = await prisma.timeSlotTemplate.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Time slot not found");

  try {
    await prisma.timeSlotTemplate.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      throw new ConflictError(
        "This time slot has existing bookings and can't be deleted. Deactivate it instead."
      );
    }
    throw err;
  }
}

// ── Availability (public) ──────────────────────────────

export interface SlotAvailability {
  id: string;
  startTime: string;
  endTime: string;
  capacity: number;
  remainingCapacity: number;
  isAvailable: boolean;
}

/** Parses a plain "YYYY-MM-DD" string into a UTC-midnight Date - no timezone
 * ambiguity here since there's no time-of-day component involved, unlike a
 * full ISO datetime. */
function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export async function getAvailabilityForDate(
  prisma: PrismaClient,
  dateStr: string
): Promise<SlotAvailability[]> {
  const date = parseDateOnly(dateStr);
  const dayOfWeek = date.getUTCDay();

  const templates = await prisma.timeSlotTemplate.findMany({
    where: { dayOfWeek, isActive: true },
    orderBy: { startTime: "asc" },
  });

  if (templates.length === 0) return [];

  const bookingCounts = await prisma.booking.groupBy({
    by: ["timeSlotTemplateId"],
    where: {
      scheduledDate: date,
      timeSlotTemplateId: { in: templates.map((t) => t.id) },
      status: { notIn: ["cancelled"] },
    },
    _count: { id: true },
  });

  const countMap = new Map(bookingCounts.map((row) => [row.timeSlotTemplateId, row._count.id]));

  return templates.map((template) => {
    const bookedCount = countMap.get(template.id) ?? 0;
    const remainingCapacity = Math.max(0, template.capacity - bookedCount);
    return {
      id: template.id,
      startTime: template.startTime,
      endTime: template.endTime,
      capacity: template.capacity,
      remainingCapacity,
      isAvailable: remainingCapacity > 0,
    };
  });
}

/**
 * Called at actual booking-creation time - re-validates capacity even if the
 * client's availability list was fetched moments ago, since someone else
 * could have taken the last spot in between.
 */
export async function assertSlotHasCapacity(
  prisma: PrismaClient,
  timeSlotTemplateId: string,
  scheduledDate: Date
): Promise<{ startTime: string; endTime: string }> {
  const template = await prisma.timeSlotTemplate.findUnique({
    where: { id: timeSlotTemplateId },
  });

  if (!template || !template.isActive) {
    throw new NotFoundError("This time slot is no longer available");
  }

  const expectedDayOfWeek = scheduledDate.getUTCDay();
  if (template.dayOfWeek !== expectedDayOfWeek) {
    throw new ConflictError("This time slot isn't offered on the selected date");
  }

  const bookedCount = await prisma.booking.count({
    where: {
      timeSlotTemplateId,
      scheduledDate,
      status: { notIn: ["cancelled"] },
    },
  });

  if (bookedCount >= template.capacity) {
    throw new ConflictError("This time slot is fully booked. Please choose another.");
  }

  return { startTime: template.startTime, endTime: template.endTime };
}