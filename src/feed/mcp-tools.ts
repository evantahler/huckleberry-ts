import { z } from "zod";
import {
  type McpServerInstance,
  readOnlyAnnotations,
  wrapTool,
} from "../mcp-helpers.ts";
import type { FeedClient } from "./queries.ts";

export const feedCapability = {
  name: "Feeding",
  description: "Feeding interval history (breast, bottle, and solids).",
  tools: ["list_feed"],
  startWith: "list_feed with a childId and date range",
};

export function registerFeedTools(
  server: McpServerInstance,
  feed: FeedClient,
): void {
  server.registerTool(
    "list_feed",
    {
      title: "List feeding intervals",
      description:
        "List feeding interval records for a child within a date range. Each entry's `mode` discriminates the shape: `breast` (leftDuration/rightDuration/lastSide), `bottle` (bottleType/amount/units), or `solids` (foods/reactions/notes).",
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
        feed.list(childId, { start: new Date(start), end: new Date(end) }),
      ),
  );
}
