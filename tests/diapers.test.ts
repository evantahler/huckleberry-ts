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

describe("diapers.list", () => {
  test("returns diaper events (collection is singular `diaper`)", async () => {
    seedDoc(`diaper/${CID}/intervals/d1`, {
      mode: "both",
      start: RANGE_START_S + 10,
      offset: -300,
      quantity: { pee: 1, poo: 1 },
      color: "yellow",
      consistency: "solid",
    });
    seedDoc(`diaper/${CID}/intervals/d2`, {
      mode: "pee",
      start: RANGE_START_S + 20,
      offset: -300,
    });
    seedDoc(`diaper/${CID}/intervals/potty`, {
      mode: "dry",
      start: RANGE_START_S + 30,
      offset: -300,
      isPotty: true,
      howItHappened: "wentPotty",
    });

    const client = makeClient();
    const entries = await client.diapers.list(CID, {
      start: RANGE_START,
      end: RANGE_END,
    });
    expect(entries).toHaveLength(3);
    expect(entries.find((e) => e.isPotty)?.howItHappened).toBe("wentPotty");
  });
});
