import { collection } from "firebase/firestore";
import type { ContextResolver } from "../client.ts";
import { listIntervalsInRange } from "../firestore/range-query.ts";
import type { ChildId, DateRange } from "../types.ts";
import { assertValidRange, rangeToUnixSeconds } from "../types.ts";
import type { FirebaseFeedIntervalData } from "./types.ts";

export class FeedClient {
  constructor(private readonly ctx: ContextResolver) {}

  async list(
    childId: ChildId,
    range: DateRange,
  ): Promise<FirebaseFeedIntervalData[]> {
    assertValidRange(range);
    const { firestore } = await this.ctx();
    const { startSeconds, endSeconds } = rangeToUnixSeconds(range);
    // Collection is `feed` (singular) — Huckleberry convention.
    const intervalsRef = collection(firestore, "feed", childId, "intervals");
    return listIntervalsInRange<FirebaseFeedIntervalData>({
      intervalsRef,
      startSeconds,
      endSeconds,
      context: `list feed intervals for child ${childId}`,
      parse: (raw) => raw as FirebaseFeedIntervalData,
      startOf: (entry) => entry.start,
    });
  }
}
