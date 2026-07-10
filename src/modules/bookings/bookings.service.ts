import { PrismaClient, CarType, BookingStatus } from "@prisma/client";
import { NotFoundError, BadRequestError, ForbiddenError } from "../../utils/errors";
import { resolvePrice } from "../../utils/pricing";
import { assertSlotHasCapacity } from "../time-slots/time-slots.service";
import { generateBookingNumber } from "../../utils/bookingNumber";
import type { CreateBookingBody, ValidateBookingBody, ListBookingsQuery } from "./bookings.schema";

interface ResolvedItem {
  serviceCategoryId: string;
  name: string;
  price: number;
  durationMinutes: number;
}

interface ResolvedCarGroup {
  carId: string;
  brand: string;
  model: string;
  carType: CarType;
  items: ResolvedItem[];
  subtotal: number;
  durationMinutes: number;
}

async function resolveItemsForCar(
  prisma: PrismaClient,
  serviceIds: string[],
  carType: CarType,
  scheduledDate: Date
): Promise<{ items: ResolvedItem[]; subtotal: number; durationMinutes: number }> {
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
  const durationMinutes = items.reduce((sum, item) => sum + item.durationMinutes, 0);
  return { items, subtotal, durationMinutes };
}

async function resolveCarGroups(
  prisma: PrismaClient,
  userId: string,
  cars: { carId: string; serviceIds: string[] }[],
  scheduledDate: Date
): Promise<{ carGroups: ResolvedCarGroup[]; subtotal: number }> {
  const carGroups: ResolvedCarGroup[] = [];

  for (const carInput of cars) {
    const car = await prisma.car.findFirst({ where: { id: carInput.carId, userId } });
    if (!car) throw new NotFoundError(`Car not found`);

    const { items, subtotal, durationMinutes } = await resolveItemsForCar(
      prisma,
      carInput.serviceIds,
      car.carType,
      scheduledDate
    );

    carGroups.push({
      carId: car.id,
      brand: car.brand,
      model: car.model,
      carType: car.carType,
      items,
      subtotal,
      durationMinutes,
    });
  }

  const subtotal = carGroups.reduce((sum, group) => sum + group.subtotal, 0);
  return { carGroups, subtotal };
}

export interface ValidateBookingResult {
  addressRequired: boolean;
  carGroups: ResolvedCarGroup[];
  subtotal: number;
  total: number;
  totalDurationMinutes: number;
  slotAvailable: boolean | null;
}

export async function validateBooking(
  prisma: PrismaClient,
  userId: string,
  data: ValidateBookingBody
): Promise<ValidateBookingResult> {
  const addressRequired = !data.addressId;

  if (data.addressId) {
    const address = await prisma.address.findFirst({
      where: { id: data.addressId, userId },
    });
    if (!address) throw new NotFoundError("Address not found");
  }

  let slotAvailable: boolean | null = null;
  if (data.timeSlotTemplateId && data.scheduledDate) {
    try {
      await assertSlotHasCapacity(prisma, data.timeSlotTemplateId, new Date(data.scheduledDate));
      slotAvailable = true;
    } catch {
      slotAvailable = false;
    }
  }

  const scheduledDate = data.scheduledDate ? new Date(data.scheduledDate) : new Date();
  const { carGroups, subtotal } = await resolveCarGroups(prisma, userId, data.cars, scheduledDate);
  const totalDurationMinutes = carGroups.reduce((sum, g) => sum + g.durationMinutes, 0);

  return {
    addressRequired,
    carGroups,
    subtotal,
    total: subtotal,
    totalDurationMinutes,
    slotAvailable,
  };
}

export async function createBooking(
  prisma: PrismaClient,
  userId: string,
  data: CreateBookingBody
) {
  const address = await prisma.address.findFirst({ where: { id: data.addressId, userId } });
  if (!address) throw new NotFoundError("Address not found");

  const scheduledDate = new Date(data.scheduledDate);
  if (scheduledDate.getTime() < Date.now() - 24 * 60 * 60 * 1000) {
    throw new BadRequestError("Scheduled date can't be in the past");
  }

  const { carGroups, subtotal } = await resolveCarGroups(prisma, userId, data.cars, scheduledDate);

  const { startTime, endTime } = await assertSlotHasCapacity(
    prisma,
    data.timeSlotTemplateId,
    scheduledDate
  );
  const scheduledSlotDisplay = `${startTime} - ${endTime}`;

  const bookingNumber = generateBookingNumber();

  const createdBookingId = await prisma.$transaction(
    async (tx) => {
      const booking = await tx.booking.create({
        data: {
          bookingNumber,
          userId,
          addressId: data.addressId,
          timeSlotTemplateId: data.timeSlotTemplateId,
          status: "pending",
          scheduledDate,
          scheduledSlot: scheduledSlotDisplay,
          subtotal,
          discount: 0,
          total: subtotal,
          paymentMethod: data.paymentMethod,
          paymentStatus: "pending",
          notes: data.notes ?? null,
        },
      });

      for (const group of carGroups) {
        const bookingCar = await tx.bookingCar.create({
          data: {
            bookingId: booking.id,
            carId: group.carId,
            subtotal: group.subtotal,
            durationMinutes: group.durationMinutes,
          },
        });

        await tx.bookingItem.createMany({
          data: group.items.map((item) => ({
            bookingCarId: bookingCar.id,
            serviceCategoryId: item.serviceCategoryId,
            price: item.price,
            durationMinutes: item.durationMinutes,
          })),
        });
      }

      return booking.id;
    },
    { timeout: 15000 }
  );

  return prisma.booking.findUniqueOrThrow({
    where: { id: createdBookingId },
    include: {
      address: true,
      cars: { include: { car: true, items: { include: { serviceCategory: true } } } },
    },
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
      include: {
        address: true,
        cars: { include: { car: true, items: { include: { serviceCategory: true } } } },
      },
    }),
    prisma.booking.count({ where }),
  ]);

  return { bookings, total, page: query.page, pageSize: query.pageSize };
}

export async function getBookingById(prisma: PrismaClient, userId: string, id: string) {
  const booking = await prisma.booking.findFirst({
    where: { id, userId },
    include: {
      address: true,
      cars: { include: { car: true, items: { include: { serviceCategory: true } } } },
    },
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