import { z } from "zod";
import {
  type McpServerInstance,
  readOnlyAnnotations,
  wrapTool,
} from "../mcp-helpers.ts";
import type { PumpClient } from "./queries.ts";

export const pumpCapability = {
  name: "Pumping",
  description: "Breast pump session history.",
  tools: ["list_pump"],
  startWith: "list_pump with a childId and date range",
};

export function registerPumpTools(
  server: McpServerInstance,
  pump: PumpClient,
): void {
  server.registerTool(
    "list_pump",
    {
      title: "List pumping sessions",
      description:
        "List pump session entries for a child within a date range. Amounts are split into leftAmount/rightAmount (for leftright entryMode; total mode stores half the total in each side so leftAmount+rightAmount equals the entered total).",
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
        pump.list(childId, { start: new Date(start), end: new Date(end) }),
      ),
  );
}
