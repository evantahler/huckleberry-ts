import { describe, expect, test } from "bun:test";
import { Huckleberry } from "../src/client.ts";
import { mockFirestore } from "./mocks/firestore.ts";

describe("Huckleberry construction", () => {
  test("firestoreOverride short-circuits sign-in", async () => {
    const client = new Huckleberry({
      email: "x",
      password: "x",
      firestoreOverride: mockFirestore as never,
    });
    // Should be connected already — no throw.
    await client.connect();
  });

  test("missing credentials without override throws AuthenticationError", async () => {
    const client = new Huckleberry({ email: "", password: "" });
    await expect(client.connect()).rejects.toMatchObject({
      name: "AuthenticationError",
    });
  });

  test("close() is safe to call repeatedly", async () => {
    const client = new Huckleberry({
      email: "x",
      password: "x",
      firestoreOverride: mockFirestore as never,
    });
    await client.close();
    await client.close();
  });
});

describe("Huckleberry shape", () => {
  test("exposes every sub-client", () => {
    const client = new Huckleberry({
      email: "x",
      password: "x",
      firestoreOverride: mockFirestore as never,
    });
    expect(client.user).toBeDefined();
    expect(client.sleep).toBeDefined();
    expect(client.feed).toBeDefined();
    expect(client.diapers).toBeDefined();
    expect(client.activities).toBeDefined();
    expect(client.pump).toBeDefined();
    expect(client.health).toBeDefined();
    expect(client.solids).toBeDefined();
  });
});
