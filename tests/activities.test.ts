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

describe("activities.list", () => {
  test("returns activity intervals of varied modes", async () => {
    seedDoc(`activities/${CID}/intervals/a1`, {
      mode: "bath",
      start: RANGE_START_S + 10,
      offset: 0,
      duration: 900,
    });
    seedDoc(`activities/${CID}/intervals/a2`, {
      mode: "tummyTime",
      start: RANGE_START_S + 50,
      offset: 0,
      duration: 300,
    });
    const client = makeClient();
    const entries = await client.activities.list(CID, {
      start: RANGE_START,
      end: RANGE_END,
    });
    expect(entries.map((e) => e.mode).sort()).toEqual(["bath", "tummyTime"]);
  });
});
