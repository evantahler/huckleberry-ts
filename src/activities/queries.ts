import { collection } from "firebase/firestore";
import type { ContextResolver } from "../client.ts";
import { listIntervalsInRange } from "../firestore/range-query.ts";
import type { ChildId, DateRange } from "../types.ts";
import { assertValidRange, rangeToUnixSeconds } from "../types.ts";
import type { FirebaseActivityIntervalData } from "./types.ts";

export class ActivitiesClient {
  constructor(private readonly ctx: ContextResolver) {}

  async list(
    childId: ChildId,
    range: DateRange,
  ): Promise<FirebaseActivityIntervalData[]> {
    assertValidRange(range);
    const { firestore } = await this.ctx();
    const { startSeconds, endSeconds } = rangeToUnixSeconds(range);
    const intervalsRef = collection(
      firestore,
      "activities",
      childId,
      "intervals",
    );
    return listIntervalsInRange<FirebaseActivityIntervalData>({
      intervalsRef,
      startSeconds,
      endSeconds,
      context: `list activity intervals for child ${childId}`,
      parse: (raw) => raw as FirebaseActivityIntervalData,
      startOf: (entry) => entry.start,
    });
  }
}
