import { collection } from "firebase/firestore";
import type { ContextResolver } from "../client.ts";
import { listIntervalsInRange } from "../firestore/range-query.ts";
import type { ChildId, DateRange } from "../types.ts";
import { assertValidRange, rangeToUnixSeconds } from "../types.ts";
import type { FirebaseSleepIntervalData } from "./types.ts";

export class SleepClient {
  constructor(private readonly ctx: ContextResolver) {}

  async list(
    childId: ChildId,
    range: DateRange,
  ): Promise<FirebaseSleepIntervalData[]> {
    assertValidRange(range);
    const { firestore } = await this.ctx();
    const { startSeconds, endSeconds } = rangeToUnixSeconds(range);
    const intervalsRef = collection(firestore, "sleep", childId, "intervals");
    return listIntervalsInRange<FirebaseSleepIntervalData>({
      intervalsRef,
      startSeconds,
      endSeconds,
      context: `list sleep intervals for child ${childId}`,
      parse: (raw, docId) => ({
        _id: docId,
        ...(raw as FirebaseSleepIntervalData),
      }),
      startOf: (entry) => entry.start,
    });
  }
}
