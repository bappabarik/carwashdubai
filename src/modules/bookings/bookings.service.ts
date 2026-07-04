import { PrismaClient, CarType, BookingStatus } from "@prisma/client";
import { NotFoundError, BadRequestError, ForbiddenError } from "../../utils/errors";
import { resolvePrice } from "../../utils/pricing";
import { generateBookingNumber } from "../../utils/bookingNumber";
import type { CreateBookingBody, ValidateBookingBody, ListBookingsQuery } from "./bookings.schema";

interface ResolvedItem {
  serviceCategoryId: string;
  name: string;
  price: number;
  durationMinutes: number;
}

/**
 * Looks up the correct price for each requested service category, given the
 * car's type and the scheduled date (for weekend pricing). Prefers a
 * car-type-specific pricing row over a generic (carType: null) one.
 * Throws if any service has no active pricing at all for this car type.
 */
async function resolveBookingItems(
  prisma: PrismaClient,
  serviceIds: string[],
  carType: CarType,
  scheduledDate: Date
): Promise<{ items: ResolvedItem[]; subtotal: number }> {
  const categories = await prisma.serviceCategory.findMany({
    where: { id: { in: serviceIds }, isActive: true },
  });

  if (categories.length !== serviceIds.length) {
    throw new NotFoundError("One or more selected services could not be found or are inactive");
  }

  const pricingRows = await prisma.servicePricing.findMany({
    where: {
      serviceCategoryId: { in: serviceIds },
      isActive: true,
      OR: [{ carType }, { carType: null }],
    },
  });

  const items: ResolvedItem[] = [];

  for (const category of categories) {
    const specific = pricingRows.find(
      (p) => p.serviceCategoryId === category.id && p.carType === carType
    );
    const generic = pricingRows.find(
      (p) => p.serviceCategoryId === category.id && p.carType === null
    );
    const pricing = specific ?? generic;

    if (!pricing) {
      throw new BadRequestError(
        `"${category.name}" has no pricing configured for this car type yet`
      );
    }

    items.push({
      serviceCategoryId: category.id,
      name: category.name,
      price: resolvePrice(pricing, scheduledDate),
      durationMinutes: pricing.durationMinutes,
    });
  }

  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  return { items, subtotal };
}

export interface ValidateBookingResult {
  addressRequired: boolean;
  carRequired: boolean;
  items: ResolvedItem[];
  subtotal: number;
  total: number;
}

export async function validateBooking(
  prisma: PrismaClient,
  userId: string,
  data: ValidateBookingBody
): Promise<ValidateBookingResult> {
  const addressRequired = !data.addressId;
  const carRequired = !data.carId;

  if (data.addressId) {
    const address = await prisma.address.findFirst({
      where: { id: data.addressId, userId },
    });
    if (!address) throw new NotFoundError("Address not found");
  }

  let car = null;
  if (data.carId) {
    car = await prisma.car.findFirst({ where: { id: data.carId, userId } });
    if (!car) throw new NotFoundError("Car not found");
  }

  // Can't price anything without knowing the car type - return early with
  // just the missing-field flags so the app can prompt the user.
  if (!car) {
    return { addressRequired, carRequired, items: [], subtotal: 0, total: 0 };
  }

  const scheduledDate = data.scheduledDate ? new Date(data.scheduledDate) : new Date();
  const { items, subtotal } = await resolveBookingItems(
    prisma,
    data.serviceIds,
    car.carType,
    scheduledDate
  );

  return { addressRequired, carRequired, items, subtotal, total: subtotal };
}

export async function createBooking(
  prisma: PrismaClient,
  userId: string,
  data: CreateBookingBody
) {
  const address = await prisma.address.findFirst({ where: { id: data.addressId, userId } });
  if (!address) throw new NotFoundError("Address not found");

  const car = await prisma.car.findFirst({ where: { id: data.carId, userId } });
  if (!car) throw new NotFoundError("Car not found");

  const scheduledDate = new Date(data.scheduledDate);
  if (scheduledDate.getTime() < Date.now() - 24 * 60 * 60 * 1000) {
    // Small grace window rather than a strict ">= now" check, since the
    // client's "today" and the server's "now" can differ by a few hours
    // around midnight depending on timezone.
    throw new BadRequestError("Scheduled date can't be in the past");
  }

  const { items, subtotal } = await resolveBookingItems(
    prisma,
    data.serviceIds,
    car.carType,
    scheduledDate
  );

  const bookingNumber = generateBookingNumber();

  const createdBookingId = await prisma.$transaction(
    async (tx) => {
      const booking = await tx.booking.create({
        data: {
          bookingNumber,
          userId,
          addressId: data.addressId,
          carId: data.carId,
          status: "pending",
          scheduledDate,
          scheduledSlot: data.scheduledTimeSlot,
          subtotal,
          discount: 0,
          total: subtotal,
          paymentMethod: data.paymentMethod,
          paymentStatus: "pending",
          notes: data.notes ?? null,
        },
      });

      await tx.bookingItem.createMany({
        data: items.map((item) => ({
          bookingId: booking.id,
          serviceCategoryId: item.serviceCategoryId,
          price: item.price,
          durationMinutes: item.durationMinutes,
        })),
      });

      return booking.id;
    },
    { timeout: 15000 } // generous headroom for Neon cold-start / pooled-connection latency
  );

  // Fetched outside the transaction on purpose: this is a read of data that's
  // already committed, so it doesn't need to be atomic with the writes above.
  // Keeping it out of the transaction also keeps the transaction itself short,
  // which is what actually avoids the timeout - not just raising the limit.
  return prisma.booking.findUniqueOrThrow({
    where: { id: createdBookingId },
    include: { items: { include: { serviceCategory: true } }, address: true, car: true },
  });
}

export async function listBookings(
  prisma: PrismaClient,
  userId: string,
  query: ListBookingsQuery
) {
  const where = { userId, ...(query.status ? { status: query.status as BookingStatus } : {}) };

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { items: { include: { serviceCategory: true } }, address: true, car: true },
    }),
    prisma.booking.count({ where }),
  ]);

  return { bookings, total, page: query.page, pageSize: query.pageSize };
}

export async function getBookingById(prisma: PrismaClient, userId: string, id: string) {
  const booking = await prisma.booking.findFirst({
    where: { id, userId },
    include: { items: { include: { serviceCategory: true } }, address: true, car: true },
  });
  if (!booking) throw new NotFoundError("Booking not found");
  return booking;
}

const CANCELLABLE_STATUSES: BookingStatus[] = ["pending", "confirmed"];

export async function cancelBooking(prisma: PrismaClient, userId: string, id: string) {
  const booking = await prisma.booking.findFirst({ where: { id, userId } });
  if (!booking) throw new NotFoundError("Booking not found");

  if (!CANCELLABLE_STATUSES.includes(booking.status)) {
    throw new ForbiddenError(
      `Booking can't be cancelled once it's ${booking.status.replace("_", " ")}`
    );
  }

  return prisma.booking.update({ where: { id }, data: { status: "cancelled" } });
}