import { PrismaClient, Prisma } from "@prisma/client";
import { NotFoundError, ConflictError } from "../../utils/errors";
import type { CreateAddressBody, UpdateAddressBody } from "./addresses.schema";

export async function listAddresses(prisma: PrismaClient, userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

export async function getAddressById(prisma: PrismaClient, userId: string, id: string) {
  const address = await prisma.address.findFirst({ where: { id, userId } });
  if (!address) throw new NotFoundError("Address not found");
  return address;
}

export async function createAddress(
  prisma: PrismaClient,
  userId: string,
  data: CreateAddressBody
) {
  return prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    }

    return tx.address.create({
      data: {
        userId,
        label: data.label,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2 ?? null,
        city: data.city,
        area: data.area ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        isDefault: data.isDefault,
      },
    });
  });
}

export async function updateAddress(
  prisma: PrismaClient,
  userId: string,
  id: string,
  data: UpdateAddressBody
) {
  await getAddressById(prisma, userId, id); // ownership + existence check

  return prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.address.updateMany({
        where: { userId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return tx.address.update({ where: { id }, data });
  });
}

export async function deleteAddress(prisma: PrismaClient, userId: string, id: string) {
  await getAddressById(prisma, userId, id); // ownership + existence check

  try {
    await prisma.address.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      throw new ConflictError("This address is used in an existing booking and can't be deleted.");
    }
    throw err;
  }
}