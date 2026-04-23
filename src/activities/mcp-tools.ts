import { z } from "zod";
import {
  type McpServerInstance,
  readOnlyAnnotations,
  wrapTool,
} from "../mcp-helpers.ts";
import type { ActivitiesClient } from "./queries.ts";

export const activitiesCapability = {
  name: "Activities",
  description:
    "Activity tracker history: bath, tummy time, story time, screen time, skin-to-skin, indoor/outdoor play, brushing teeth.",
  tools: ["list_activities"],
  startWith: "list_activities with a childId and date range",
};

export function registerActivitiesTools(
  server: McpServerInstance,
  activities: ActivitiesClient,
): void {
  server.registerTool(
    "list_activities",
    {
      title: "List activity intervals",
      description:
        "List tracked activity intervals for a child within a date range. `mode` is one of bath, tummyTime, storyTime, screenTime, skinToSkin, outdoorPlay, indoorPlay, brushTeeth.",
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
        activities.list(childId, {
          start: new Date(start),
          end: new Date(end),
        }),
      ),
  );
}
