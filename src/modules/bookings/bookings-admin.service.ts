import { PrismaClient, BookingStatus } from "@prisma/client";
import { NotFoundError, ConflictError } from "../../utils/errors";
import type { ListAllBookingsQuery } from "./bookings-admin.schema";

const ADMIN_BOOKING_INCLUDE = {
  items: { include: { serviceCategory: true } },
  address: true,
  car: true,
  user: { select: { id: true, phoneNumber: true, name: true } },
} as const;

// Defines which status changes are legal - prevents e.g. jumping straight
// from "pending" to "completed", or reviving a cancelled/completed booking.
const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["staff_assigned", "cancelled"],
  staff_assigned: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export async function listAllBookings(prisma: PrismaClient, query: ListAllBookingsQuery) {
  const where = {
    ...(query.status ? { status: query.status as BookingStatus } : {}),
    ...(query.date ? { scheduledDate: new Date(`${query.date}T00:00:00.000Z`) } : {}),
  };

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: [{ scheduledDate: "asc" }, { scheduledSlot: "asc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: ADMIN_BOOKING_INCLUDE,
    }),
    prisma.booking.count({ where }),
  ]);

  return { bookings, total, page: query.page, pageSize: query.pageSize };
}

export async function getBookingByIdAdmin(prisma: PrismaClient, id: string) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: ADMIN_BOOKING_INCLUDE,
  });
  if (!booking) throw new NotFoundError("Booking not found");
  return booking;
}

export async function updateBookingStatus(
  prisma: PrismaClient,
  id: string,
  newStatus: BookingStatus
) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new NotFoundError("Booking not found");

  const allowed = VALID_TRANSITIONS[booking.status];
  if (!allowed.includes(newStatus)) {
    throw new ConflictError(
      `Can't move a booking from "${booking.status}" to "${newStatus}". Allowed next steps: ${
        allowed.length > 0 ? allowed.join(", ") : "none - this is a final status"
      }.`
    );
  }

  return prisma.booking.update({
    where: { id },
    data: { status: newStatus },
    include: ADMIN_BOOKING_INCLUDE,
  });
}