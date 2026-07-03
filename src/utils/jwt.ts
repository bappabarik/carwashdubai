import jwt from "jsonwebtoken";
import { randomBytes, createHash } from "crypto";
import { env } from "../config/env";

export interface AccessTokenPayload {
  userId: string;
  phoneNumber: string;
}

export interface RefreshTokenPayload {
  userId: string;
  deviceId: string;
  tokenId: string; // matches RefreshToken.id in the DB, so we can revoke by id
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

/**
 * Refresh tokens are stored in the DB as a SHA-256 hash (not argon2 - we need
 * a fast, deterministic lookup by hash, not a per-call verify). The JWT
 * signature already protects against forgery; this hash just means a DB leak
 * doesn't hand out valid bearer tokens directly.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateDeviceBoundId(): string {
  return randomBytes(16).toString("hex");
}
