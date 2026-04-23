import { collection } from "firebase/firestore";
import type { ContextResolver } from "../client.ts";
import { listIntervalsInRange } from "../firestore/range-query.ts";
import type { ChildId, DateRange } from "../types.ts";
import { assertValidRange, rangeToUnixSeconds } from "../types.ts";
import type { FirebaseDiaperData } from "./types.ts";

export class DiapersClient {
  constructor(private readonly ctx: ContextResolver) {}

  async list(
    childId: ChildId,
    range: DateRange,
  ): Promise<FirebaseDiaperData[]> {
    assertValidRange(range);
    const { firestore } = await this.ctx();
    const { startSeconds, endSeconds } = rangeToUnixSeconds(range);
    // Collection is `diaper` (singular).
    const intervalsRef = collection(firestore, "diaper", childId, "intervals");
    return listIntervalsInRange<FirebaseDiaperData>({
      intervalsRef,
      startSeconds,
      endSeconds,
      context: `list diaper intervals for child ${childId}`,
      parse: (raw) => raw as FirebaseDiaperData,
      startOf: (entry) => entry.start,
    });
  }
}
