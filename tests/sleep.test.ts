import { beforeEach, describe, expect, test } from "bun:test";
import { Huckleberry } from "../src/client.ts";
import { mockFirestore, resetMockStore, seedDoc } from "./mocks/firestore.ts";

const CID = "child-1";

function makeClient(): Huckleberry {
  return new Huckleberry({
    email: "x",
    password: "x",
    firestoreOverride: mockFirestore as never,
  });
}

// Fixed reference window: 2026-04-01T00:00:00Z .. 2026-04-08T00:00:00Z.
// start = 1774915200, end = 1775520000 (Unix seconds).
const RANGE_START = new Date("2026-04-01T00:00:00Z");
const RANGE_END = new Date("2026-04-08T00:00:00Z");
const RANGE_START_S = RANGE_START.getTime() / 1000;
const RANGE_END_S = RANGE_END.getTime() / 1000;

beforeEach(() => {
  resetMockStore();
});

describe("sleep.list — regular docs", () => {
  test("returns entries with start inside the range, ordered by start", async () => {
    // in-range
    seedDoc(`sleep/${CID}/intervals/a`, {
      start: RANGE_START_S + 3600,
      duration: 1800,
      offset: -300,
    });
    seedDoc(`sleep/${CID}/intervals/b`, {
      start: RANGE_START_S + 7200,
      duration: 1200,
      offset: -300,
    });
    // out of range (before)
    seedDoc(`sleep/${CID}/intervals/before`, {
      start: RANGE_START_S - 60,
      duration: 600,
      offset: -300,
    });
    // out of range (after)
    seedDoc(`sleep/${CID}/intervals/after`, {
      start: RANGE_END_S + 60,
      duration: 600,
      offset: -300,
    });

    const client = makeClient();
    const entries = await client.sleep.list(CID, {
      start: RANGE_START,
      end: RANGE_END,
    });

    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e._id)).toEqual(["a", "b"]);
    expect(entries[0]?.start).toBeLessThan(entries[1]?.start ?? 0);
  });
});

describe("sleep.list — multi containers", () => {
  test("merges nested entries within the range, skipping out-of-range ones", async () => {
    // Multi container straddling the range boundary: 3 entries, one pre-range,
    // one inside, one post-range.
    seedDoc(`sleep/${CID}/intervals/multi-1`, {
      multi: true,
      hasMoreRoom: true,
      data: {
        "pre-entry": {
          start: RANGE_START_S - 3600,
          duration: 600,
          offset: -300,
        },
        "in-entry": {
          start: RANGE_START_S + 1,
          duration: 600,
          offset: -300,
        },
        "post-entry": {
          start: RANGE_END_S + 10,
          duration: 600,
          offset: -300,
        },
      },
    });
    // Plus one regular doc inside the range
    seedDoc(`sleep/${CID}/intervals/regular`, {
      start: RANGE_START_S + 5000,
      duration: 600,
      offset: -300,
    });

    const client = makeClient();
    const entries = await client.sleep.list(CID, {
      start: RANGE_START,
      end: RANGE_END,
    });

    expect(entries).toHaveLength(2);
    const ids = entries.map((e) => e._id).sort();
    expect(ids).toEqual(["in-entry", "regular"]);
    // Results should be sorted by start
    expect(entries[0]?.start).toBeLessThan(entries[1]?.start ?? 0);
  });

  test("range boundary is half-open: start inclusive, end exclusive", async () => {
    seedDoc(`sleep/${CID}/intervals/exactly-start`, {
      start: RANGE_START_S,
      duration: 100,
      offset: 0,
    });
    seedDoc(`sleep/${CID}/intervals/exactly-end`, {
      start: RANGE_END_S,
      duration: 100,
      offset: 0,
    });
    const client = makeClient();
    const entries = await client.sleep.list(CID, {
      start: RANGE_START,
      end: RANGE_END,
    });
    expect(entries.map((e) => e._id)).toEqual(["exactly-start"]);
  });
});

describe("sleep.list — validation", () => {
  test("rejects an inverted range", async () => {
    const client = makeClient();
    await expect(
      client.sleep.list(CID, { start: RANGE_END, end: RANGE_START }),
    ).rejects.toMatchObject({
      name: "InvalidDateRangeError",
      category: "invalid_input",
    });
  });
});
