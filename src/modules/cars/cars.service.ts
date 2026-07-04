import { PrismaClient, Prisma } from "@prisma/client";
import { NotFoundError, ConflictError } from "../../utils/errors";
import type { CreateCarBody, UpdateCarBody } from "./cars.schema";

export async function listCars(prisma: PrismaClient, userId: string) {
  return prisma.car.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

export async function getCarById(prisma: PrismaClient, userId: string, id: string) {
  const car = await prisma.car.findFirst({ where: { id, userId } });
  if (!car) throw new NotFoundError("Car not found");
  return car;
}

export async function createCar(prisma: PrismaClient, userId: string, data: CreateCarBody) {
  return prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.car.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    }

    return tx.car.create({
      data: {
        userId,
        brand: data.brand,
        model: data.model,
        year: data.year ?? null,
        color: data.color ?? null,
        plateNumber: data.plateNumber,
        carType: data.carType,
        isDefault: data.isDefault,
      },
    });
  }, { timeout: 10000 });
}

export async function updateCar(
  prisma: PrismaClient,
  userId: string,
  id: string,
  data: UpdateCarBody
) {
  await getCarById(prisma, userId, id); // ownership + existence check

  return prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.car.updateMany({
        where: { userId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return tx.car.update({ where: { id }, data });
  }, { timeout: 10000 });
}

export async function deleteCar(prisma: PrismaClient, userId: string, id: string) {
  await getCarById(prisma, userId, id); // ownership + existence check

  try {
    await prisma.car.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      throw new ConflictError("This car is used in an existing booking and can't be deleted.");
    }
    throw err;
  }
}