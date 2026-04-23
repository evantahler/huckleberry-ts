#!/usr/bin/env bun

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  activitiesCapability,
  registerActivitiesTools,
} from "./activities/mcp-tools.ts";
import { Huckleberry, type HuckleberryOptions } from "./client.ts";
import {
  diapersCapability,
  registerDiapersTools,
} from "./diapers/mcp-tools.ts";
import { HuckleberryError } from "./errors.ts";
import { feedCapability, registerFeedTools } from "./feed/mcp-tools.ts";
import { healthCapability, registerHealthTools } from "./health/mcp-tools.ts";
import { readOnlyAnnotations, wrapTool } from "./mcp-helpers.ts";
import { pumpCapability, registerPumpTools } from "./pump/mcp-tools.ts";
import { registerSleepTools, sleepCapability } from "./sleep/mcp-tools.ts";
import { registerSolidsTools, solidsCapability } from "./solids/mcp-tools.ts";
import { registerUserTools, userCapability } from "./user/mcp-tools.ts";

export interface ServerOptions {
  // When set, the server uses this pre-built client instead of building one
  // from env vars. Tests rely on this; production should leave it undefined.
  client?: Huckleberry;
  // Optional override for the client options. Email/password default to
  // HUCKLEBERRY_EMAIL / HUCKLEBERRY_PASSWORD env vars.
  clientOptions?: Partial<HuckleberryOptions>;
}

export function createServer(options?: ServerOptions): {
  server: McpServer;
  client: Huckleberry;
} {
  const client = options?.client ?? buildClientFromEnv(options?.clientOptions);

  const server = new McpServer({
    name: "huckleberry",
    version: "0.1.0",
  });

  server.registerTool(
    "get_capabilities",
    {
      title: "Get server capabilities",
      description:
        "Discover available Huckleberry data sources and their tools. Call this first to understand what this server can read. All tools are read-only.",
      annotations: readOnlyAnnotations,
    },
    async () =>
      wrapTool(() => ({
        dataSources: [
          userCapability,
          sleepCapability,
          feedCapability,
          diapersCapability,
          activitiesCapability,
          pumpCapability,
          healthCapability,
          solidsCapability,
        ],
        allToolsReadOnly: true,
        requirement:
          "Huckleberry account credentials via HUCKLEBERRY_EMAIL and HUCKLEBERRY_PASSWORD env vars",
      })),
  );

  registerUserTools(server, client.user);
  registerSleepTools(server, client.sleep);
  registerFeedTools(server, client.feed);
  registerDiapersTools(server, client.diapers);
  registerActivitiesTools(server, client.activities);
  registerPumpTools(server, client.pump);
  registerHealthTools(server, client.health);
  registerSolidsTools(server, client.solids);

  return { server, client };
}

function buildClientFromEnv(
  overrides?: Partial<HuckleberryOptions>,
): Huckleberry {
  const email = overrides?.email ?? process.env.HUCKLEBERRY_EMAIL;
  const password = overrides?.password ?? process.env.HUCKLEBERRY_PASSWORD;
  const timezone = overrides?.timezone ?? process.env.HUCKLEBERRY_TIMEZONE;

  if (!email || !password) {
    throw new HuckleberryError(
      "Missing Huckleberry credentials. Set HUCKLEBERRY_EMAIL and HUCKLEBERRY_PASSWORD.",
      {
        category: "auth",
        recovery:
          "Export HUCKLEBERRY_EMAIL and HUCKLEBERRY_PASSWORD before launching the MCP server. HUCKLEBERRY_TIMEZONE (IANA tz, e.g. America/New_York) is optional.",
      },
    );
  }

  return new Huckleberry({ email, password, timezone, ...overrides });
}

if (import.meta.main) {
  const { server, client } = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.on("beforeExit", () => {
    void client.close();
  });
}
