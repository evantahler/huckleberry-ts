import { z } from "zod";
import {
  type McpServerInstance,
  readOnlyAnnotations,
  wrapTool,
} from "../mcp-helpers.ts";
import type { SolidsClient } from "./queries.ts";

export const solidsCapability = {
  name: "Solids (foods)",
  description:
    "Solids food catalog: curated foods (shipped by Huckleberry) and custom foods added by the user.",
  tools: ["list_curated_foods", "list_custom_foods"],
  startWith:
    "list_curated_foods for the global catalog, list_custom_foods per child",
};

export function registerSolidsTools(
  server: McpServerInstance,
  solids: SolidsClient,
): void {
  server.registerTool(
    "list_curated_foods",
    {
      title: "List curated foods catalog",
      description:
        "List Huckleberry's curated foods catalog (fetched from Firebase Storage). Each entry has an `id` usable as a food reference in solids feed entries, plus metadata like allergens and choking hazards.",
      annotations: readOnlyAnnotations,
    },
    async () => wrapTool(() => solids.listCuratedFoods()),
  );

  server.registerTool(
    "list_custom_foods",
    {
      title: "List custom foods",
      description:
        "List user-created custom foods for a child. By default archived foods are omitted; pass includeArchived=true to include them.",
      annotations: readOnlyAnnotations,
      inputSchema: {
        childId: z.string().describe("Child id (`cid` from list_children)."),
        includeArchived: z
          .boolean()
          .optional()
          .describe("Include foods marked archived. Defaults to false."),
      },
    },
    async ({ childId, includeArchived }) =>
      wrapTool(() => solids.listCustomFoods(childId, { includeArchived })),
  );
}
