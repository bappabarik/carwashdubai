import { PrismaClient, Prisma } from "@prisma/client";
import { NotFoundError, ConflictError } from "../../utils/errors";
import { isPointInPolygon, GeoJSONPolygon } from "../../utils/geo";
import type { CreateZoneBody, UpdateZoneBody } from "./zones.schema";

export async function listZones(prisma: PrismaClient) {
  return prisma.zone.findMany({ orderBy: { name: "asc" } });
}

export async function getZoneById(prisma: PrismaClient, id: string) {
  const zone = await prisma.zone.findUnique({ where: { id } });
  if (!zone) throw new NotFoundError("Zone not found");
  return zone;
}

export async function createZone(prisma: PrismaClient, data: CreateZoneBody) {
  try {
    return await prisma.zone.create({
      data: { name: data.name, code: data.code, boundary: data.boundary },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ConflictError("A zone with this code already exists");
    }
    throw err;
  }
}

export async function updateZone(prisma: PrismaClient, id: string, data: UpdateZoneBody) {
  const existing = await prisma.zone.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Zone not found");

  return prisma.zone.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.boundary !== undefined ? { boundary: data.boundary } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });
}

export async function deleteZone(prisma: PrismaClient, id: string) {
  const existing = await prisma.zone.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Zone not found");

  try {
    await prisma.zone.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      throw new ConflictError(
        "This zone has time slots, bookings, pilots, or assets tied to it and can't be deleted. Deactivate it instead."
      );
    }
    throw err;
  }
}

export interface ResolveZoneResult {
  isServiceable: boolean;
  zone: { id: string; name: string } | null;
}

/**
 * Checks which active zone (if any) a given lat/lng falls inside. Used both
 * by the public "can I book here" check and internally at booking
 * validate/create time. Assumes zones don't overlap - returns the first
 * match found.
 */
export async function resolveZoneForPoint(
  prisma: PrismaClient,
  lat: number,
  lng: number
): Promise<ResolveZoneResult> {
  const zones = await prisma.zone.findMany({ where: { isActive: true } });

  for (const zone of zones) {
    if (isPointInPolygon(lng, lat, zone.boundary as unknown as GeoJSONPolygon)) {
      return { isServiceable: true, zone: { id: zone.id, name: zone.name } };
    }
  }

  return { isServiceable: false, zone: null };
}