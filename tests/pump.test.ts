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

describe("pump.list", () => {
  test("returns pump session entries with both entry modes", async () => {
    seedDoc(`pump/${CID}/intervals/leftright`, {
      start: RANGE_START_S + 10,
      entryMode: "leftright",
      leftAmount: 60,
      rightAmount: 80,
      units: "ml",
      offset: 0,
      duration: 900,
    });
    seedDoc(`pump/${CID}/intervals/total`, {
      start: RANGE_START_S + 20,
      entryMode: "total",
      leftAmount: 75,
      rightAmount: 75,
      units: "ml",
      offset: 0,
      duration: 600,
    });

    const client = makeClient();
    const entries = await client.pump.list(CID, {
      start: RANGE_START,
      end: RANGE_END,
    });
    expect(entries).toHaveLength(2);
    const total = entries.find((e) => e.entryMode === "total");
    expect((total?.leftAmount ?? 0) + (total?.rightAmount ?? 0)).toBe(150);
  });
});
