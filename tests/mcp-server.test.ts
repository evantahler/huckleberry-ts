import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Huckleberry } from "../src/client.ts";
import { createServer } from "../src/mcp-server.ts";
import { mockFirestore, resetMockStore, seedDoc } from "./mocks/firestore.ts";

let client: Client;
let huckleberry: Huckleberry;

beforeAll(async () => {
  huckleberry = new Huckleberry({
    email: "x",
    password: "x",
    firestoreOverride: mockFirestore as never,
    uidOverride: "user-abc",
    fetchOverride: (async (url: string | URL | Request) => {
      // Serve a tiny curated-foods catalog for list_curated_foods.
      if (String(url).includes("firebasestorage")) {
        return new Response(
          JSON.stringify({
            apple: { id: "apple", name: "Apple", source: "curated" },
          }),
          { status: 200 },
        );
      }
      return new Response("not found", { status: 404 });
    }) as unknown as typeof fetch,
  });
  const { server } = createServer({ client: huckleberry });

  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  client = new Client({ name: "test-client", version: "1.0.0" });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
});

afterAll(async () => {
  await client.close();
  await huckleberry.close();
});

beforeEach(() => {
  resetMockStore();
});

// biome-ignore lint/suspicious/noExplicitAny: test helper
function parseRaw(result: any) {
  return JSON.parse(result.content[0].text);
}
// biome-ignore lint/suspicious/noExplicitAny: test helper
function parseResult(result: any) {
  return parseRaw(result).data;
}
// biome-ignore lint/suspicious/noExplicitAny: test helper
function parseError(result: any) {
  return JSON.parse(result.content[0].text);
}

describe("server metadata", () => {
  test("exposes the expected tool set", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      "get_capabilities",
      "get_child",
      "get_latest_growth",
      "get_user",
      "list_activities",
      "list_children",
      "list_curated_foods",
      "list_custom_foods",
      "list_diapers",
      "list_feed",
      "list_health",
      "list_pump",
      "list_sleep",
    ]);
  });

  test("every tool has a useful description", async () => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      expect(tool.description).toBeTruthy();
      expect(tool.description?.length ?? 0).toBeGreaterThan(30);
    }
  });

  test("every tool is marked read-only", async () => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      // biome-ignore lint/suspicious/noExplicitAny: protocol shape
      const annotations = (tool as any).annotations;
      if (!annotations) continue;
      expect(annotations.readOnlyHint).toBe(true);
      expect(annotations.destructiveHint).toBe(false);
    }
  });
});

describe("get_capabilities", () => {
  test("aggregates all data sources", async () => {
    const result = await client.callTool({ name: "get_capabilities" });
    const data = parseResult(result);
    const names = data.dataSources.map((s: { name: string }) => s.name);
    expect(names).toEqual([
      "Huckleberry account & children",
      "Sleep",
      "Feeding",
      "Diapers",
      "Activities",
      "Pumping",
      "Health",
      "Solids (foods)",
    ]);
    expect(data.allToolsReadOnly).toBe(true);
    expect(data.requirement).toContain("HUCKLEBERRY_EMAIL");
  });
});

describe("response envelope", () => {
  test("list tools include totalResults + _next hints", async () => {
    seedDoc("users/user-abc", {
      childList: [
        { cid: "c1", nickname: "A" },
        { cid: "c2", nickname: "B" },
      ],
    });
    const result = await client.callTool({ name: "list_children" });
    const raw = parseRaw(result);
    expect(raw.totalResults).toBe(2);
    expect(raw._next).toBeDefined();
    expect((raw._next as Array<{ tool: string }>).length).toBeGreaterThan(0);
  });
});

describe("list_sleep (end-to-end)", () => {
  test("returns interval data through the MCP round trip", async () => {
    seedDoc("sleep/c1/intervals/a", {
      start: new Date("2026-04-02T12:00:00Z").getTime() / 1000,
      duration: 1200,
      offset: -300,
    });
    const result = await client.callTool({
      name: "list_sleep",
      arguments: {
        childId: "c1",
        start: "2026-04-01T00:00:00Z",
        end: "2026-04-08T00:00:00Z",
      },
    });
    const data = parseResult(result);
    expect(data).toHaveLength(1);
    expect(data[0]._id).toBe("a");
  });
});

describe("error envelope", () => {
  test("get_child returns structured error for missing doc", async () => {
    const result = await client.callTool({
      name: "get_child",
      arguments: { childId: "nope" },
    });
    expect(result.isError).toBe(true);
    const err = parseError(result);
    expect(err.error).toBe("ChildNotFoundError");
    expect(err.category).toBe("not_found");
    expect(err.retryable).toBe(false);
    expect(err.recovery).toContain("list_children");
  });

  test("list_sleep returns structured error for inverted range", async () => {
    const result = await client.callTool({
      name: "list_sleep",
      arguments: {
        childId: "c1",
        start: "2026-04-08T00:00:00Z",
        end: "2026-04-01T00:00:00Z",
      },
    });
    expect(result.isError).toBe(true);
    const err = parseError(result);
    expect(err.error).toBe("InvalidDateRangeError");
    expect(err.category).toBe("invalid_input");
  });
});

describe("list_curated_foods", () => {
  test("flows through the storage fetch override", async () => {
    const result = await client.callTool({ name: "list_curated_foods" });
    const data = parseResult(result);
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe("apple");
  });
});
