const DUBAI_UTC_OFFSET_HOURS = 4;

/**
 * Returns true if the given date falls on Fri, Sat, or Sun in Dubai local
 * time (UTC+4, no DST) - our higher-demand pricing window.
 *
 * We deliberately compute this from the UTC offset rather than relying on
 * server-local Date methods, since the API may run on a server in any
 * timezone (e.g. Render/Railway default to UTC).
 */
export function isWeekendInDubai(date: Date): boolean {
  const dubaiTime = new Date(date.getTime() + DUBAI_UTC_OFFSET_HOURS * 60 * 60 * 1000);
  const day = dubaiTime.getUTCDay(); // 0 = Sun, 5 = Fri, 6 = Sat
  return day === 0 || day === 5 || day === 6;
}

/**
 * Resolves the price to charge for a given service pricing row and date.
 * Falls back to the base price if no weekend override is set.
 */
export function resolvePrice(
  pricing: { price: number | string; weekendPrice: number | string | null },
  scheduledDate: Date
): number {
  const base = Number(pricing.price);
  const weekend = pricing.weekendPrice !== null ? Number(pricing.weekendPrice) : null;

  if (weekend !== null && isWeekendInDubai(scheduledDate)) {
    return weekend;
  }
  return base;
}