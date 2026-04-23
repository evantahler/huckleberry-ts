import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HuckleberryError } from "./errors.ts";

export interface NextAction {
  tool: string;
  description: string;
}

export const readOnlyAnnotations = {
  readOnlyHint: true as const,
  destructiveHint: false as const,
  idempotentHint: true as const,
  openWorldHint: false as const,
};

export function toolError(e: HuckleberryError) {
  return {
    isError: true as const,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          error: e.name,
          message: e.message,
          category: e.category,
          retryable: e.retryable,
          recovery: e.recovery,
        }),
      },
    ],
  };
}

// Wraps tool handlers in our standard envelope. `fn` may be sync or async.
// Arrays get a `totalResults` count; callers can provide `_next` hints so the
// agent knows likely follow-up tools without extra prompting.
export async function wrapTool<T>(
  fn: () => T | Promise<T>,
  hints?: NextAction[],
) {
  try {
    const data = await fn();
    const result: Record<string, unknown> = { data };
    if (Array.isArray(data)) result.totalResults = data.length;
    if (hints?.length) result._next = hints;
    return {
      content: [
        { type: "text" as const, text: JSON.stringify(result, null, 2) },
      ],
    };
  } catch (e) {
    if (e instanceof HuckleberryError) return toolError(e);
    throw e;
  }
}

export type McpServerInstance = InstanceType<typeof McpServer>;
