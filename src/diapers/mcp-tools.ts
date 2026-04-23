import { z } from "zod";
import {
  type McpServerInstance,
  readOnlyAnnotations,
  wrapTool,
} from "../mcp-helpers.ts";
import type { DiapersClient } from "./queries.ts";

export const diapersCapability = {
  name: "Diapers",
  description: "Diaper-change and potty history.",
  tools: ["list_diapers"],
  startWith: "list_diapers with a childId and date range",
};

export function registerDiapersTools(
  server: McpServerInstance,
  diapers: DiapersClient,
): void {
  server.registerTool(
    "list_diapers",
    {
      title: "List diaper events",
      description:
        "List diaper change / potty entries for a child within a date range. `mode` is one of pee/poo/both/dry (or `isPotty: true` with `howItHappened` for potty training events).",
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
        diapers.list(childId, { start: new Date(start), end: new Date(end) }),
      ),
  );
}
