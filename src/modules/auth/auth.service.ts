import { randomUUID } from "crypto";
import { PrismaClient, DeviceType } from "@prisma/client";
import { env } from "../../config/env";
import { generateOtp, hashOtp, verifyOtpHash } from "../../utils/otp";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} from "../../utils/jwt";
import { sendOtpSms } from "../../services/sms.service";
import {
  BadRequestError,
  TooManyRequestsError,
  UnauthorizedError,
} from "../../utils/errors";
import jwt from "jsonwebtoken";

function msFromExpiry(expiresIn: string): number {
  // Supports formats like "15m", "30d", "1h" used in our env config
  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!match) return 15 * 60 * 1000; // sane fallback: 15 minutes
  const value = Number(match[1]);
  const unit = match[2];
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit]!;
  return value * unitMs;
}

export async function requestOtp(prisma: PrismaClient, phoneNumber: string): Promise<void> {
  const cooldownMs = env.OTP_RESEND_COOLDOWN_SECONDS * 1000;

  const lastOtp = await prisma.otpVerification.findFirst({
    where: { phoneNumber, purpose: "login" },
    orderBy: { createdAt: "desc" },
  });

  if (lastOtp && Date.now() - lastOtp.createdAt.getTime() < cooldownMs) {
    const waitSeconds = Math.ceil(
      (cooldownMs - (Date.now() - lastOtp.createdAt.getTime())) / 1000
    );
    throw new TooManyRequestsError(`Please wait ${waitSeconds}s before requesting another OTP`);
  }

  const otpCode = generateOtp();
  const otpHash = await hashOtp(otpCode);
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.otpVerification.create({
    data: { phoneNumber, otpHash, purpose: "login", expiresAt },
  });

  await sendOtpSms(phoneNumber, otpCode);
}

export interface VerifyOtpResult {
  accessToken: string;
  refreshToken: string;
  isNewUser: boolean;
  user: { id: string; phoneNumber: string; name: string | null };
}

export async function verifyOtp(
  prisma: PrismaClient,
  params: { phoneNumber: string; otpCode: string; deviceId: string; deviceType: DeviceType }
): Promise<VerifyOtpResult> {
  const { phoneNumber, otpCode, deviceId, deviceType } = params;

  const otpRecord = await prisma.otpVerification.findFirst({
    where: { phoneNumber, purpose: "login", isUsed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!otpRecord) {
    throw new BadRequestError("OTP is invalid or expired. Please request a new one.");
  }

  if (otpRecord.attempts >= env.OTP_MAX_ATTEMPTS) {
    throw new TooManyRequestsError("Too many incorrect attempts. Please request a new OTP.");
  }

  const isValid = await verifyOtpHash(otpRecord.otpHash, otpCode);

  if (!isValid) {
    await prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } },
    });
    throw new BadRequestError("Incorrect OTP.");
  }

  await prisma.otpVerification.update({
    where: { id: otpRecord.id },
    data: { isUsed: true },
  });

  let user = await prisma.user.findUnique({ where: { phoneNumber } });
  const isNewUser = !user;

  if (!user) {
    user = await prisma.user.create({
      data: { phoneNumber, isVerified: true },
    });
  }

  const { accessToken, refreshToken } = await issueTokenPair(prisma, {
    userId: user.id,
    phoneNumber: user.phoneNumber,
    deviceId,
    deviceType,
  });

  return {
    accessToken,
    refreshToken,
    isNewUser,
    user: { id: user.id, phoneNumber: user.phoneNumber, name: user.name },
  };
}

async function issueTokenPair(
  prisma: PrismaClient,
  params: { userId: string; phoneNumber: string; deviceId: string; deviceType: DeviceType }
): Promise<{ accessToken: string; refreshToken: string }> {
  const { userId, phoneNumber, deviceId, deviceType } = params;
  const tokenId = randomUUID();

  const refreshToken = signRefreshToken({ userId, deviceId, tokenId });
  const accessToken = signAccessToken({ userId, phoneNumber });

  const expiresAt = new Date(Date.now() + msFromExpiry(env.JWT_REFRESH_EXPIRES_IN));

  await prisma.refreshToken.create({
    data: {
      id: tokenId,
      userId,
      deviceId,
      deviceType,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
}

export async function refreshAccessToken(
  prisma: PrismaClient,
  refreshTokenJwt: string
): Promise<{ accessToken: string; refreshToken: string }> {
  let payload;
  try {
    payload = verifyRefreshToken(refreshTokenJwt);
  } catch {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }

  const tokenRecord = await prisma.refreshToken.findUnique({ where: { id: payload.tokenId } });

  if (
    !tokenRecord ||
    tokenRecord.revoked ||
    tokenRecord.expiresAt < new Date() ||
    tokenRecord.tokenHash !== hashToken(refreshTokenJwt)
  ) {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }

  const user = await prisma.user.findUnique({ where: { id: tokenRecord.userId } });
  if (!user || user.status === "blocked") {
    throw new UnauthorizedError("Account is not active");
  }

  // Rotate: revoke the used refresh token, issue a fresh pair
  await prisma.refreshToken.update({
    where: { id: tokenRecord.id },
    data: { revoked: true },
  });

  return issueTokenPair(prisma, {
    userId: user.id,
    phoneNumber: user.phoneNumber,
    deviceId: tokenRecord.deviceId,
    deviceType: tokenRecord.deviceType,
  });
}

export async function logout(prisma: PrismaClient, refreshTokenJwt: string): Promise<void> {
  // Best-effort revoke: even if the token is expired/malformed we don't
  // want to leak that via an error - logout should always look like it worked.
  let tokenId: string | undefined;

  try {
    tokenId = verifyRefreshToken(refreshTokenJwt).tokenId;
  } catch {
    const decoded = jwt.decode(refreshTokenJwt) as { tokenId?: string } | null;
    tokenId = decoded?.tokenId;
  }

  if (tokenId) {
    await prisma.refreshToken.updateMany({
      where: { id: tokenId },
      data: { revoked: true },
    });
  }
}
