import { beforeEach, describe, expect, test } from "bun:test";
import { Huckleberry } from "../src/client.ts";
import { mockFirestore, resetMockStore, seedDoc } from "./mocks/firestore.ts";

const UID = "user-abc";

function makeClient(): Huckleberry {
  return new Huckleberry({
    email: "x",
    password: "x",
    firestoreOverride: mockFirestore as never,
    uidOverride: UID,
  });
}

beforeEach(() => {
  resetMockStore();
});

describe("user.get", () => {
  test("returns the user document", async () => {
    seedDoc(`users/${UID}`, {
      email: "parent@example.com",
      firstname: "Alex",
      childList: [{ cid: "child-1", nickname: "Robin" }],
    });
    const client = makeClient();
    const user = await client.user.get();
    expect(user.email).toBe("parent@example.com");
    expect(user.firstname).toBe("Alex");
    expect(user.childList).toHaveLength(1);
    expect(user.childList[0]?.cid).toBe("child-1");
  });

  test("throws ChildNotFoundError when users doc is missing", async () => {
    const client = makeClient();
    await expect(client.user.get()).rejects.toThrow(/users\/user-abc/);
  });
});

describe("user.listChildren", () => {
  test("returns the childList array", async () => {
    seedDoc(`users/${UID}`, {
      childList: [
        { cid: "c1", nickname: "A" },
        { cid: "c2", nickname: "B" },
      ],
    });
    const client = makeClient();
    const kids = await client.user.listChildren();
    expect(kids.map((k) => k.cid)).toEqual(["c1", "c2"]);
  });
});

describe("user.getChild", () => {
  test("reads from the `childs` collection (sic)", async () => {
    seedDoc("childs/c1", { childsName: "Robin", gender: "F" });
    const client = makeClient();
    const child = await client.user.getChild("c1");
    expect(child.childsName).toBe("Robin");
    expect(child.gender).toBe("F");
  });

  test("throws ChildNotFoundError for unknown id", async () => {
    const client = makeClient();
    await expect(client.user.getChild("missing")).rejects.toMatchObject({
      name: "ChildNotFoundError",
      category: "not_found",
    });
  });

  test("throws ChildNotFoundError for empty id", async () => {
    const client = makeClient();
    await expect(client.user.getChild("")).rejects.toMatchObject({
      name: "ChildNotFoundError",
    });
  });
});
