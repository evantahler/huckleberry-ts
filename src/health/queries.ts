import { collection, doc, getDoc } from "firebase/firestore";
import type { ContextResolver } from "../client.ts";
import { wrapFirestoreError } from "../errors.ts";
import { listIntervalsInRange } from "../firestore/range-query.ts";
import type { ChildId, DateRange } from "../types.ts";
import { assertValidRange, rangeToUnixSeconds } from "../types.ts";
import type {
  FirebaseGrowthData,
  FirebaseHealthDocumentData,
  HealthDataEntry,
} from "./types.ts";

export class HealthClient {
  constructor(private readonly ctx: ContextResolver) {}

  async list(childId: ChildId, range: DateRange): Promise<HealthDataEntry[]> {
    assertValidRange(range);
    const { firestore } = await this.ctx();
    const { startSeconds, endSeconds } = rangeToUnixSeconds(range);
    // Health uses the `data` subcollection, not `intervals`.
    const dataRef = collection(firestore, "health", childId, "data");
    return listIntervalsInRange<HealthDataEntry>({
      intervalsRef: dataRef,
      startSeconds,
      endSeconds,
      context: `list health data for child ${childId}`,
      parse: (raw, docId) => {
        const entry = raw as HealthDataEntry;
        if (entry.mode === "growth")
          return { _id: docId, ...entry } as FirebaseGrowthData;
        return entry;
      },
      startOf: (entry) => entry.start,
    });
  }

  async getLatestGrowth(
    childId: ChildId,
  ): Promise<FirebaseGrowthData | undefined> {
    const { firestore } = await this.ctx();
    try {
      const snap = await getDoc(doc(firestore, "health", childId));
      if (!snap.exists()) return undefined;
      const data = snap.data() as FirebaseHealthDocumentData;
      return data.prefs?.lastGrowthEntry;
    } catch (err) {
      throw wrapFirestoreError(err, `get latest growth for child ${childId}`);
    }
  }
}
