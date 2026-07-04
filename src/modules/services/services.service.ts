import { PrismaClient, CarType } from "@prisma/client";
import { NotFoundError, ConflictError } from "../../utils/errors";
import type { CreateCategoryBody, UpdateCategoryBody, CreatePricingBody, UpdatePricingBody } from "./services.schema";

// ── Categories (public reads) ──────────────────────────────

export async function listTopLevelCategories(prisma: PrismaClient) {
  return prisma.serviceCategory.findMany({
    where: { parentId: null, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function listSubCategories(prisma: PrismaClient, parentId: string) {
  const parent = await prisma.serviceCategory.findUnique({ where: { id: parentId } });
  if (!parent) throw new NotFoundError("Service category not found");

  return prisma.serviceCategory.findMany({
    where: { parentId, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getCategoryPricing(
  prisma: PrismaClient,
  categoryId: string,
  carType?: CarType
) {
  const category = await prisma.serviceCategory.findUnique({ where: { id: categoryId } });
  if (!category) throw new NotFoundError("Service category not found");

  return prisma.servicePricing.findMany({
    where: {
      serviceCategoryId: categoryId,
      isActive: true,
      ...(carType ? { OR: [{ carType }, { carType: null }] } : {}),
    },
  });
}

// ── Categories (admin writes) ──────────────────────────────

export async function listAllCategoriesAdmin(prisma: PrismaClient) {
  return prisma.serviceCategory.findMany({
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
    include: { children: true },
  });
}

export async function createCategory(prisma: PrismaClient, data: CreateCategoryBody) {
  if (data.parentId) {
    const parent = await prisma.serviceCategory.findUnique({ where: { id: data.parentId } });
    if (!parent) throw new NotFoundError("Parent category not found");
  }

  return prisma.serviceCategory.create({
    data: {
      parentId: data.parentId ?? null,
      name: data.name,
      description: data.description ?? null,
      iconUrl: data.iconUrl ?? null,
      imageUrl: data.imageUrl ?? null,
      sortOrder: data.sortOrder,
    },
  });
}

export async function updateCategory(
  prisma: PrismaClient,
  id: string,
  data: UpdateCategoryBody
) {
  const existing = await prisma.serviceCategory.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Service category not found");

  if (data.parentId !== undefined && data.parentId === id) {
    throw new ConflictError("A category cannot be its own parent");
  }

  return prisma.serviceCategory.update({
    where: { id },
    data,
  });
}

// ── Pricing (admin writes) ──────────────────────────────

export async function createPricing(prisma: PrismaClient, data: CreatePricingBody) {
  const category = await prisma.serviceCategory.findUnique({
    where: { id: data.serviceCategoryId },
  });
  if (!category) throw new NotFoundError("Service category not found");

  const existing = await prisma.servicePricing.findFirst({
    where: { serviceCategoryId: data.serviceCategoryId, carType: data.carType ?? null },
  });
  if (existing) {
    throw new ConflictError(
      "A pricing row already exists for this category and car type. Update it instead."
    );
  }

  return prisma.servicePricing.create({
    data: {
      serviceCategoryId: data.serviceCategoryId,
      carType: data.carType ?? null,
      price: data.price,
      weekendPrice: data.weekendPrice ?? null,
      durationMinutes: data.durationMinutes,
    },
  });
}

export async function updatePricing(prisma: PrismaClient, id: string, data: UpdatePricingBody) {
  const existing = await prisma.servicePricing.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Pricing row not found");

  return prisma.servicePricing.update({ where: { id }, data });
}

export async function deletePricing(prisma: PrismaClient, id: string) {
  const existing = await prisma.servicePricing.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Pricing row not found");

  await prisma.servicePricing.delete({ where: { id } });
}