import { collection } from "firebase/firestore";
import type { ContextResolver } from "../client.ts";
import { listIntervalsInRange } from "../firestore/range-query.ts";
import type { ChildId, DateRange } from "../types.ts";
import { assertValidRange, rangeToUnixSeconds } from "../types.ts";
import type { FirebasePumpIntervalData } from "./types.ts";

export class PumpClient {
  constructor(private readonly ctx: ContextResolver) {}

  async list(
    childId: ChildId,
    range: DateRange,
  ): Promise<FirebasePumpIntervalData[]> {
    assertValidRange(range);
    const { firestore } = await this.ctx();
    const { startSeconds, endSeconds } = rangeToUnixSeconds(range);
    const intervalsRef = collection(firestore, "pump", childId, "intervals");
    return listIntervalsInRange<FirebasePumpIntervalData>({
      intervalsRef,
      startSeconds,
      endSeconds,
      context: `list pump intervals for child ${childId}`,
      parse: (raw) => raw as FirebasePumpIntervalData,
      startOf: (entry) => entry.start,
    });
  }
}
