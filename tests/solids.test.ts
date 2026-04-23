import { beforeEach, describe, expect, test } from "bun:test";
import { Huckleberry } from "../src/client.ts";
import { mockFirestore, resetMockStore, seedDoc } from "./mocks/firestore.ts";

const CID = "child-1";

beforeEach(() => resetMockStore());

describe("solids.listCuratedFoods", () => {
  test("fetches from Firebase Storage with a bearer id token", async () => {
    let seenUrl = "";
    let seenAuth = "";
    const mockFetch = (async (
      url: string | URL | Request,
      init?: RequestInit,
    ) => {
      seenUrl = String(url);
      seenAuth = String(
        (init?.headers as Record<string, string>)?.Authorization,
      );
      return new Response(
        JSON.stringify({
          apple: {
            id: "apple",
            name: "Apple",
            source: "curated",
            is_common_allergen: false,
          },
          peanut: {
            id: "peanut",
            name: "Peanut",
            source: "curated",
            is_common_allergen: true,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    const client = new Huckleberry({
      email: "x",
      password: "x",
      firestoreOverride: mockFirestore as never,
      idTokenProvider: () => Promise.resolve("tok-123"),
      fetchOverride: mockFetch,
    });

    const foods = await client.solids.listCuratedFoods();
    expect(foods).toHaveLength(2);
    expect(seenUrl).toContain("firebasestorage.googleapis.com");
    expect(seenUrl).toContain("simpleintervals.appspot.com");
    expect(seenUrl).toContain("foods");
    expect(seenAuth).toBe("Bearer tok-123");
  });

  test("throws ApiError when storage returns non-2xx", async () => {
    const mockFetch = (async () =>
      new Response("nope", { status: 500 })) as unknown as typeof fetch;
    const client = new Huckleberry({
      email: "x",
      password: "x",
      firestoreOverride: mockFirestore as never,
      fetchOverride: mockFetch,
    });
    await expect(client.solids.listCuratedFoods()).rejects.toMatchObject({
      name: "ApiError",
      retryable: true,
    });
  });
});

describe("solids.listCustomFoods", () => {
  test("returns non-archived foods by default", async () => {
    seedDoc(`types/${CID}/custom/food-1`, {
      id: "food-1",
      name: "Mango",
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
      archived: false,
      type: "solids",
      source: "custom",
      image: "",
    });
    seedDoc(`types/${CID}/custom/food-2`, {
      id: "food-2",
      name: "Archived",
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
      archived: true,
      type: "solids",
      source: "custom",
      image: "",
    });
    const client = new Huckleberry({
      email: "x",
      password: "x",
      firestoreOverride: mockFirestore as never,
    });
    const foods = await client.solids.listCustomFoods(CID);
    expect(foods).toHaveLength(1);
    expect(foods[0]?.name).toBe("Mango");
  });

  test("includeArchived=true returns archived foods", async () => {
    seedDoc(`types/${CID}/custom/food-1`, {
      id: "food-1",
      name: "Mango",
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
      archived: false,
      type: "solids",
      source: "custom",
      image: "",
    });
    seedDoc(`types/${CID}/custom/food-2`, {
      id: "food-2",
      name: "Archived",
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
      archived: true,
      type: "solids",
      source: "custom",
      image: "",
    });
    const client = new Huckleberry({
      email: "x",
      password: "x",
      firestoreOverride: mockFirestore as never,
    });
    const foods = await client.solids.listCustomFoods(CID, {
      includeArchived: true,
    });
    expect(foods).toHaveLength(2);
  });
});
