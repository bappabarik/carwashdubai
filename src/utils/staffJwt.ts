import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { hashToken } from "./jwt"; // SHA-256 hashing helper is generic, safe to reuse

export interface StaffAccessTokenPayload {
  staffId: string;
  role: string;
}

export interface StaffRefreshTokenPayload {
  staffId: string;
  deviceId: string;
  tokenId: string;
}

export function signStaffAccessToken(payload: StaffAccessTokenPayload): string {
  return jwt.sign(payload, env.STAFF_JWT_ACCESS_SECRET, {
    expiresIn: env.STAFF_JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function signStaffRefreshToken(payload: StaffRefreshTokenPayload): string {
  return jwt.sign(payload, env.STAFF_JWT_REFRESH_SECRET, {
    expiresIn: env.STAFF_JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyStaffAccessToken(token: string): StaffAccessTokenPayload {
  return jwt.verify(token, env.STAFF_JWT_ACCESS_SECRET) as StaffAccessTokenPayload;
}

export function verifyStaffRefreshToken(token: string): StaffRefreshTokenPayload {
  return jwt.verify(token, env.STAFF_JWT_REFRESH_SECRET) as StaffRefreshTokenPayload;
}

export { hashToken as hashStaffToken };