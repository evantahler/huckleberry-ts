import { z } from "zod";
import {
  type McpServerInstance,
  readOnlyAnnotations,
  wrapTool,
} from "../mcp-helpers.ts";
import type { UserClient } from "./queries.ts";

export const userCapability = {
  name: "Huckleberry account & children",
  description:
    "Account profile and child roster for the signed-in Huckleberry user.",
  tools: ["get_user", "list_children", "get_child"],
  startWith: "list_children",
};

export function registerUserTools(
  server: McpServerInstance,
  user: UserClient,
): void {
  server.registerTool(
    "get_user",
    {
      title: "Get Huckleberry user profile",
      description:
        "Return the authenticated user's profile (email, name, subscription, child list). Prefer list_children if you only need the children.",
      annotations: readOnlyAnnotations,
    },
    async () =>
      wrapTool(
        () => user.get(),
        [
          {
            tool: "list_children",
            description: "Get the child roster directly",
          },
        ],
      ),
  );

  server.registerTool(
    "list_children",
    {
      title: "List children",
      description:
        "List all children on the account. Returns `cid` (use this as `childId` for interval tools), nickname, color, and picture.",
      annotations: readOnlyAnnotations,
    },
    async () =>
      wrapTool(
        () => user.listChildren(),
        [
          { tool: "get_child", description: "Load a child's detail document" },
          {
            tool: "list_sleep",
            description: "List sleep intervals for a child",
          },
          { tool: "list_feed", description: "List feed intervals for a child" },
          {
            tool: "list_diapers",
            description: "List diaper events for a child",
          },
        ],
      ),
  );

  server.registerTool(
    "get_child",
    {
      title: "Get child profile",
      description:
        "Return the full child document (birthdate, sleep prefs, sweetspot data, etc.) for a given child id (the `cid` from list_children).",
      annotations: readOnlyAnnotations,
      inputSchema: {
        childId: z.string().describe("Child id (`cid` from list_children)."),
      },
    },
    async ({ childId }) => wrapTool(() => user.getChild(childId)),
  );
}
