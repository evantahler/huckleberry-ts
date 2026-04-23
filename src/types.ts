import { InvalidDateRangeError } from "./errors.ts";

// Child ID in Firestore (`childs/{cid}`). String alias; no runtime overhead.
export type ChildId = string;

// Half-open date range: `start <= t < end`. Inclusive/exclusive mirrors the
// py-huckleberry-api semantics (`start_timestamp <= t < end_timestamp`).
export interface DateRange {
  start: Date;
  end: Date;
}

// Firestore timestamp payload (`{seconds, nanos}`). Distinct from the Unix
// seconds numbers used on interval `start` fields — keep them separate in types.
export interface FirebaseTimestamp {
  seconds: number;
  nanos?: number;
}

// Convert an IANA timezone name to Huckleberry's sign-flipped offset-minutes
// convention (UTC+2 → -120). Exposed for future write support; reads surface
// `offset` verbatim.
export function tzOffsetMinutesFromIanaAt(
  timezone: string,
  at: Date = new Date(),
): number {
  // Derive the offset by formatting `at` in the target zone and comparing to
  // the UTC equivalent. Intl.DateTimeFormat.formatToParts gives the civil time
  // in `timezone`; we assemble it as a UTC Date and diff.
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(at).map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour === "24" ? "0" : parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  const offsetMinutes = Math.round((asUtc - at.getTime()) / 60000);
  return -offsetMinutes;
}

export function assertValidRange(range: DateRange): void {
  if (!(range.start instanceof Date) || Number.isNaN(range.start.getTime())) {
    throw new InvalidDateRangeError("DateRange.start must be a valid Date");
  }
  if (!(range.end instanceof Date) || Number.isNaN(range.end.getTime())) {
    throw new InvalidDateRangeError("DateRange.end must be a valid Date");
  }
  if (range.start.getTime() >= range.end.getTime()) {
    throw new InvalidDateRangeError(
      `DateRange.start (${range.start.toISOString()}) must be strictly before DateRange.end (${range.end.toISOString()})`,
    );
  }
}

export function rangeToUnixSeconds(range: DateRange): {
  startSeconds: number;
  endSeconds: number;
} {
  return {
    startSeconds: range.start.getTime() / 1000,
    endSeconds: range.end.getTime() / 1000,
  };
}
