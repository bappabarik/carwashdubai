import { PrismaClient, CancellationRequestStatus } from "@prisma/client";
import { NotFoundError, ConflictError } from "../../utils/errors";
import type { ListCancellationRequestsQuery } from "./cancellation-requests.schema";

const REQUEST_INCLUDE = {
  booking: {
    include: {
      user: { select: { id: true, phoneNumber: true, name: true } },
      cars: { include: { car: true } },
    },
  },
  reviewedByStaff: { select: { id: true, name: true } },
} as const;

const TERMINAL_BOOKING_STATUSES = ["completed", "cancelled"];

export async function listCancellationRequests(
  prisma: PrismaClient,
  query: ListCancellationRequestsQuery
) {
  const where = {
    status: (query.status ?? "pending") as CancellationRequestStatus,
  };

  const [requests, total] = await Promise.all([
    prisma.cancellationRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: REQUEST_INCLUDE,
    }),
    prisma.cancellationRequest.count({ where }),
  ]);

  return { requests, total, page: query.page, pageSize: query.pageSize };
}

export async function reviewCancellationRequest(
  prisma: PrismaClient,
  id: string,
  staffId: string,
  action: "approve" | "reject",
  reviewNote?: string | null
) {
  const request = await prisma.cancellationRequest.findUnique({
    where: { id },
    include: { booking: true },
  });
  if (!request) throw new NotFoundError("Cancellation request not found");

  if (request.status !== "pending") {
    throw new ConflictError(`This request was already ${request.status}`);
  }

  if (action === "approve") {
    if (TERMINAL_BOOKING_STATUSES.includes(request.booking.status)) {
      throw new ConflictError(
        `Can't approve - the booking is already ${request.booking.status.replace("_", " ")}`
      );
    }

    await prisma.$transaction([
      prisma.booking.update({ where: { id: request.bookingId }, data: { status: "cancelled" } }),
      prisma.bookingStatusEvent.create({
        data: {
          bookingId: request.bookingId,
          status: "cancelled",
          changedByStaffId: staffId,
          note: `Cancellation approved: ${request.reason}${request.customReason ? ` - ${request.customReason}` : ""}`,
        },
      }),
      prisma.cancellationRequest.update({
        where: { id },
        data: {
          status: "approved",
          reviewedByStaffId: staffId,
          reviewNote: reviewNote ?? null,
          reviewedAt: new Date(),
        },
      }),
    ]);
  } else {
    await prisma.cancellationRequest.update({
      where: { id },
      data: {
        status: "rejected",
        reviewedByStaffId: staffId,
        reviewNote: reviewNote ?? null,
        reviewedAt: new Date(),
      },
    });
  }

  return prisma.cancellationRequest.findUniqueOrThrow({
    where: { id },
    include: REQUEST_INCLUDE,
  });
}