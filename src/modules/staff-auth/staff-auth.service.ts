import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";
import { env } from "../../config/env";
import { verifyPassword } from "../../utils/password";
import {
  signStaffAccessToken,
  signStaffRefreshToken,
  verifyStaffRefreshToken,
  hashStaffToken,
} from "../../utils/staffJwt";
import { UnauthorizedError } from "../../utils/errors";
import jwt from "jsonwebtoken";

function msFromExpiry(expiresIn: string): number {
  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!match) return 30 * 60 * 1000; // fallback: 30 minutes
  const value = Number(match[1]);
  const unit = match[2];
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit]!;
  return value * unitMs;
}

export interface StaffLoginResult {
  accessToken: string;
  refreshToken: string;
  staff: { id: string; email: string; name: string; role: string };
}

export async function staffLogin(
  prisma: PrismaClient,
  params: { email: string; password: string; deviceId: string }
): Promise<StaffLoginResult> {
  const { email, password, deviceId } = params;

  const staff = await prisma.staffMember.findUnique({ where: { email } });

  // Same error for "no such account" and "wrong password" - don't leak
  // which one it was.
  if (!staff || staff.status === "blocked") {
    throw new UnauthorizedError("Invalid email or password");
  }

  const isValid = await verifyPassword(staff.passwordHash, password);
  if (!isValid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const { accessToken, refreshToken } = await issueStaffTokenPair(prisma, {
    staffId: staff.id,
    role: staff.role,
    deviceId,
  });

  return {
    accessToken,
    refreshToken,
    staff: { id: staff.id, email: staff.email, name: staff.name, role: staff.role },
  };
}

async function issueStaffTokenPair(
  prisma: PrismaClient,
  params: { staffId: string; role: string; deviceId: string }
): Promise<{ accessToken: string; refreshToken: string }> {
  const { staffId, role, deviceId } = params;
  const tokenId = randomUUID();

  const refreshToken = signStaffRefreshToken({ staffId, deviceId, tokenId });
  const accessToken = signStaffAccessToken({ staffId, role });

  const expiresAt = new Date(Date.now() + msFromExpiry(env.STAFF_JWT_REFRESH_EXPIRES_IN));

  await prisma.staffRefreshToken.create({
    data: {
      id: tokenId,
      staffId,
      deviceId,
      deviceType: "web",
      tokenHash: hashStaffToken(refreshToken),
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
}

export async function refreshStaffAccessToken(
  prisma: PrismaClient,
  refreshTokenJwt: string
): Promise<{ accessToken: string; refreshToken: string }> {
  let payload;
  try {
    payload = verifyStaffRefreshToken(refreshTokenJwt);
  } catch {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }

  const tokenRecord = await prisma.staffRefreshToken.findUnique({
    where: { id: payload.tokenId },
  });

  if (
    !tokenRecord ||
    tokenRecord.revoked ||
    tokenRecord.expiresAt < new Date() ||
    tokenRecord.tokenHash !== hashStaffToken(refreshTokenJwt)
  ) {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }

  const staff = await prisma.staffMember.findUnique({ where: { id: tokenRecord.staffId } });
  if (!staff || staff.status === "blocked") {
    throw new UnauthorizedError("Account is not active");
  }

  // Rotate: revoke the used refresh token, issue a fresh pair
  await prisma.staffRefreshToken.update({
    where: { id: tokenRecord.id },
    data: { revoked: true },
  });

  return issueStaffTokenPair(prisma, {
    staffId: staff.id,
    role: staff.role,
    deviceId: tokenRecord.deviceId,
  });
}

export async function staffLogout(prisma: PrismaClient, refreshTokenJwt: string): Promise<void> {
  let tokenId: string | undefined;

  try {
    tokenId = verifyStaffRefreshToken(refreshTokenJwt).tokenId;
  } catch {
    const decoded = jwt.decode(refreshTokenJwt) as { tokenId?: string } | null;
    tokenId = decoded?.tokenId;
  }

  if (tokenId) {
    await prisma.staffRefreshToken.updateMany({
      where: { id: tokenId },
      data: { revoked: true },
    });
  }
}