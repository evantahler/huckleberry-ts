import { z } from "zod";
import {
  type McpServerInstance,
  readOnlyAnnotations,
  wrapTool,
} from "../mcp-helpers.ts";
import type { HealthClient } from "./queries.ts";

export const healthCapability = {
  name: "Health",
  description:
    "Health tracker history (growth measurements, medication doses, temperature readings) and the latest growth snapshot.",
  tools: ["list_health", "get_latest_growth"],
  startWith:
    "get_latest_growth for a quick snapshot, or list_health for a range",
};

export function registerHealthTools(
  server: McpServerInstance,
  health: HealthClient,
): void {
  server.registerTool(
    "list_health",
    {
      title: "List health data entries",
      description:
        "List health entries (growth/medication/temperature) for a child within a date range. `mode` discriminates the shape; growth entries have weight/height/head with their own units.",
      annotations: readOnlyAnnotations,
      inputSchema: {
        childId: z.string().describe("Child id (`cid` from list_children)."),
        start: z
          .string()
          .datetime({ offset: true })
          .describe("Inclusive start, ISO 8601."),
        end: z
          .string()
          .datetime({ offset: true })
          .describe("Exclusive end, ISO 8601."),
      },
    },
    async ({ childId, start, end }) =>
      wrapTool(() =>
        health.list(childId, { start: new Date(start), end: new Date(end) }),
      ),
  );

  server.registerTool(
    "get_latest_growth",
    {
      title: "Get latest growth entry",
      description:
        "Return the most recent growth snapshot (weight, height, head circumference) for a child — taken from the child's health prefs, no range scan required.",
      annotations: readOnlyAnnotations,
      inputSchema: {
        childId: z.string().describe("Child id (`cid` from list_children)."),
      },
    },
    async ({ childId }) => wrapTool(() => health.getLatestGrowth(childId)),
  );
}
