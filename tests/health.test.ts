import { beforeEach, describe, expect, test } from "bun:test";
import { Huckleberry } from "../src/client.ts";
import { mockFirestore, resetMockStore, seedDoc } from "./mocks/firestore.ts";

const CID = "child-1";
const RANGE_START = new Date("2026-04-01T00:00:00Z");
const RANGE_END = new Date("2026-04-08T00:00:00Z");
const RANGE_START_S = RANGE_START.getTime() / 1000;

beforeEach(() => resetMockStore());

function makeClient(): Huckleberry {
  return new Huckleberry({
    email: "x",
    password: "x",
    firestoreOverride: mockFirestore as never,
  });
}

describe("health.list — uses `data` subcollection", () => {
  test("returns growth, medication, and temperature entries", async () => {
    seedDoc(`health/${CID}/data/growth-1`, {
      mode: "growth",
      start: RANGE_START_S + 10,
      offset: 0,
      weight: 8.2,
      weightUnits: "kg",
      height: 72,
      heightUnits: "cm",
    });
    seedDoc(`health/${CID}/data/med-1`, {
      mode: "medication",
      start: RANGE_START_S + 20,
      offset: 0,
      medication_name: "Tylenol",
      amount: 2.5,
      units: "ml",
    });
    seedDoc(`health/${CID}/data/temp-1`, {
      mode: "temperature",
      start: RANGE_START_S + 30,
      offset: 0,
      amount: 37.5,
      units: "C",
    });

    const client = makeClient();
    const entries = await client.health.list(CID, {
      start: RANGE_START,
      end: RANGE_END,
    });
    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.mode).sort()).toEqual([
      "growth",
      "medication",
      "temperature",
    ]);
  });
});

describe("health.getLatestGrowth", () => {
  test("reads prefs.lastGrowthEntry from the root health doc", async () => {
    seedDoc(`health/${CID}`, {
      prefs: {
        lastGrowthEntry: {
          mode: "growth",
          start: RANGE_START_S + 99,
          offset: 0,
          weight: 9.1,
          weightUnits: "kg",
        },
      },
    });
    const client = makeClient();
    const growth = await client.health.getLatestGrowth(CID);
    expect(growth?.weight).toBe(9.1);
  });

  test("returns undefined when no health doc exists", async () => {
    const client = makeClient();
    const growth = await client.health.getLatestGrowth(CID);
    expect(growth).toBeUndefined();
  });
});
