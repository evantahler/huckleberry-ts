import type {
  CollectionReference,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { getDocs, orderBy, query, where } from "firebase/firestore";
import { wrapFirestoreError } from "../errors.ts";

// Every Huckleberry interval subcollection (sleep, feed, diaper, activities,
// pump, health/data) stores history two ways:
//
//   1. Regular docs: `{ start: number, ... }` — the `start` field is a top-level
//      Unix-seconds number and is Firestore-filterable.
//   2. Multi-container docs: `{ multi: true, data: { <entryId>: {start, ...}, ... } }`
//      where entries are nested and NOT Firestore-filterable on their `start`.
//
// The reference Python client (api.py:1994-2055 for sleep, similar shape for
// every other list_*_intervals method) runs two queries and merges:
//   A. regular docs range-filtered by start, ordered by start (skip `multi` docs)
//   B. every doc where `multi == true`, iterate `.data` values, filter by start
//
// Centralising this here keeps each feature's queries.ts small. Entries must be
// parseable into the caller's `TEntry` shape; invalid shapes throw (we
// deliberately don't copy the Python client's swallow-and-return-empty pattern —
// silent empty lists hide real bugs).
export async function listIntervalsInRange<TEntry>(args: {
  intervalsRef: CollectionReference<DocumentData>;
  startSeconds: number;
  endSeconds: number;
  context: string;
  parse: (raw: DocumentData, docId: string) => TEntry;
  startOf: (entry: TEntry) => number;
}): Promise<TEntry[]> {
  const { intervalsRef, startSeconds, endSeconds, context, parse, startOf } =
    args;

  let regularSnaps: QueryDocumentSnapshot<DocumentData>[];
  let multiSnaps: QueryDocumentSnapshot<DocumentData>[];
  try {
    const regularQuery = query(
      intervalsRef,
      where("start", ">=", startSeconds),
      where("start", "<", endSeconds),
      orderBy("start"),
    );
    const multiQuery = query(intervalsRef, where("multi", "==", true));

    const [regularResult, multiResult] = await Promise.all([
      getDocs(regularQuery),
      getDocs(multiQuery),
    ]);
    regularSnaps = regularResult.docs;
    multiSnaps = multiResult.docs;
  } catch (err) {
    throw wrapFirestoreError(err, context);
  }

  const entries: TEntry[] = [];
  for (const snap of regularSnaps) {
    const raw = snap.data();
    if (raw.multi === true) continue; // belt-and-suspenders
    entries.push(parse(raw, snap.id));
  }
  for (const snap of multiSnaps) {
    const raw = snap.data();
    const nested = raw.data;
    if (!nested || typeof nested !== "object") continue;
    for (const [nestedId, nestedRaw] of Object.entries(
      nested as Record<string, DocumentData>,
    )) {
      if (!nestedRaw || typeof nestedRaw !== "object") continue;
      const entry = parse(nestedRaw, nestedId);
      const s = startOf(entry);
      if (s >= startSeconds && s < endSeconds) entries.push(entry);
    }
  }

  entries.sort((a, b) => startOf(a) - startOf(b));
  return entries;
}
