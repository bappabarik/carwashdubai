import { randomInt } from "crypto";
import argon2 from "argon2";

/** Generates a 6-digit numeric OTP as a string, e.g. "042837". */
export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function hashOtp(otp: string): Promise<string> {
  return argon2.hash(otp);
}

export async function verifyOtpHash(hash: string, otp: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, otp);
  } catch {
    return false;
  }
}
