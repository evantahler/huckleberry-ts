import { z } from "zod";
import {
  type McpServerInstance,
  readOnlyAnnotations,
  wrapTool,
} from "../mcp-helpers.ts";
import type { SleepClient } from "./queries.ts";

export const sleepCapability = {
  name: "Sleep",
  description: "Sleep interval history (naps and night sleep).",
  tools: ["list_sleep"],
  startWith: "list_sleep with a childId and date range",
};

const rangeSchema = {
  childId: z.string().describe("Child id (`cid` from list_children)."),
  start: z
    .string()
    .datetime({ offset: true })
    .describe(
      "Inclusive start of the range, ISO 8601 (e.g. 2026-04-01T00:00:00Z).",
    ),
  end: z
    .string()
    .datetime({ offset: true })
    .describe("Exclusive end of the range, ISO 8601."),
};

export function registerSleepTools(
  server: McpServerInstance,
  sleep: SleepClient,
): void {
  server.registerTool(
    "list_sleep",
    {
      title: "List sleep intervals",
      description:
        "List sleep interval records for a child within a date range. Results include start (Unix seconds), duration (seconds), offset (timezone-offset minutes, sign-flipped), and any details captured (conditions, locations, notes).",
      annotations: readOnlyAnnotations,
      inputSchema: rangeSchema,
    },
    async ({ childId, start, end }) =>
      wrapTool(() =>
        sleep.list(childId, { start: new Date(start), end: new Date(end) }),
      ),
  );
}
