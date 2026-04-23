import { beforeEach, describe, expect, test } from "bun:test";
import { Huckleberry } from "../src/client.ts";
import { mockFirestore, resetMockStore, seedDoc } from "./mocks/firestore.ts";

const CID = "child-1";
const RANGE_START = new Date("2026-04-01T00:00:00Z");
const RANGE_END = new Date("2026-04-08T00:00:00Z");
const RANGE_START_S = RANGE_START.getTime() / 1000;

function makeClient(): Huckleberry {
  return new Huckleberry({
    email: "x",
    password: "x",
    firestoreOverride: mockFirestore as never,
  });
}

beforeEach(() => {
  resetMockStore();
});

describe("feed.list — mode discrimination", () => {
  test("returns breast, bottle, and solids entries together", async () => {
    seedDoc(`feed/${CID}/intervals/breast-1`, {
      mode: "breast",
      start: RANGE_START_S + 10,
      lastSide: "left",
      leftDuration: 300,
      rightDuration: 0,
      offset: -300,
    });
    seedDoc(`feed/${CID}/intervals/bottle-1`, {
      mode: "bottle",
      start: RANGE_START_S + 20,
      bottleType: "Breast Milk",
      amount: 120,
      units: "ml",
      offset: -300,
    });
    seedDoc(`feed/${CID}/intervals/solids-1`, {
      mode: "solids",
      start: RANGE_START_S + 30,
      offset: -300,
      foods: {
        food1: { id: "food1", created_name: "banana", source: "curated" },
      },
      reactions: { LOVED: true },
    });

    const client = makeClient();
    const entries = await client.feed.list(CID, {
      start: RANGE_START,
      end: RANGE_END,
    });
    expect(entries).toHaveLength(3);
    const modes = entries.map((e) => e.mode).sort();
    expect(modes).toEqual(["bottle", "breast", "solids"]);
  });

  test("multi container with solids entries flows through", async () => {
    seedDoc(`feed/${CID}/intervals/multi-1`, {
      multi: true,
      data: {
        s1: {
          mode: "solids",
          start: RANGE_START_S + 100,
          offset: -300,
          notes: "breakfast",
        },
        s2: {
          mode: "solids",
          start: RANGE_START_S + 200,
          offset: -300,
          notes: "lunch",
        },
      },
    });
    const client = makeClient();
    const entries = await client.feed.list(CID, {
      start: RANGE_START,
      end: RANGE_END,
    });
    expect(entries).toHaveLength(2);
    for (const e of entries) expect(e.mode).toBe("solids");
  });
});
