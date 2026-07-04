import { randomBytes } from "crypto";

/**
 * Generates a human-readable, sufficiently-unique booking number,
 * e.g. "BK-260704-8F2A1C". Date prefix helps support staff eyeball
 * roughly when it was made; the random suffix avoids collisions
 * without needing a DB round-trip to check a sequence.
 */
export function generateBookingNumber(): string {
  const now = new Date();
  const yy = String(now.getUTCFullYear()).slice(2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `BK-${yy}${mm}${dd}-${suffix}`;
}