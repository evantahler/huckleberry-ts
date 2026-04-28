# huckleberry-ts

TypeScript client and local MCP server for the [Huckleberry childcare app](https://huckleberrycare.com/). Read sleep, feed, diaper, activity, pump, health, and solids data from your Huckleberry account — from a TypeScript/Bun library or via a Model Context Protocol server for AI assistants.

Read-only. No writes in v1. Ports the reverse-engineered API surface from [`py-huckleberry-api`](https://github.com/Woyken/py-huckleberry-api).

## Requirements

- [Bun](https://bun.sh/) 1.3+ — the package ships TypeScript source with no build step, so it must be run on Bun (not Node).
- A Huckleberry account (email + password)

## Install

Add to a project:

```bash
bun add huckleberry-ts
```

Or run the MCP server with no install via `bunx` (see [MCP server](#mcp-server) below).

## Library usage

```ts
import { Huckleberry } from "huckleberry-ts";

const client = new Huckleberry({
  email: process.env.HUCKLEBERRY_EMAIL!,
  password: process.env.HUCKLEBERRY_PASSWORD!,
});

// Account & children
const user = await client.user.get();
const kids = await client.user.listChildren();
const child = await client.user.getChild(kids[0].cid);

// History (all take a DateRange)
const range = {
  start: new Date("2026-04-01T00:00:00Z"),
  end: new Date("2026-04-08T00:00:00Z"),
};
await client.sleep.list(child.cid, range);
await client.feed.list(child.cid, range);          // breast | bottle | solids, discriminated by `mode`
await client.diapers.list(child.cid, range);
await client.activities.list(child.cid, range);    // bath, tummy time, story time, screen time, etc.
await client.pump.list(child.cid, range);
await client.health.list(child.cid, range);        // growth | medication | temperature
await client.health.getLatestGrowth(child.cid);

// Solids food catalog
await client.solids.listCuratedFoods();                                 // global curated catalog
await client.solids.listCustomFoods(child.cid);                         // per-child custom foods
await client.solids.listCustomFoods(child.cid, { includeArchived: true });

await client.close();
```

## MCP server

`huckleberry-ts` ships a local MCP server as the `huckleberry-mcp` bin. It wraps the library as a set of read-only MCP tools an AI agent can call.

### Claude Desktop / Claude Code config

The recommended setup uses `bunx` so there's nothing to install or keep up to date:

```json
{
  "mcpServers": {
    "huckleberry": {
      "command": "bunx",
      "args": ["huckleberry-ts"],
      "env": {
        "HUCKLEBERRY_EMAIL": "you@example.com",
        "HUCKLEBERRY_PASSWORD": "your-password",
        "HUCKLEBERRY_TIMEZONE": "America/New_York"
      }
    }
  }
}
```

If you've added `huckleberry-ts` as a dependency in a project, you can instead point at the installed bin:

```json
{
  "mcpServers": {
    "huckleberry": {
      "command": "bun",
      "args": ["run", "huckleberry-mcp"],
      "cwd": "/absolute/path/to/your/project",
      "env": { "HUCKLEBERRY_EMAIL": "...", "HUCKLEBERRY_PASSWORD": "...", "HUCKLEBERRY_TIMEZONE": "..." }
    }
  }
}
```

> **Note:** the command must be `bun`/`bunx` — not `node`/`npx`. The package is published as raw TypeScript, which Bun executes directly.

### Tools

| Tool                 | Purpose                                                                           |
|----------------------|-----------------------------------------------------------------------------------|
| `get_capabilities`   | Discovery: what data sources and tools are available                              |
| `get_user`           | Account profile (email, subscription, child list)                                 |
| `list_children`      | Child roster (`cid` is the id passed to every other tool)                         |
| `get_child`          | Child document (birthdate, sweetspot prefs, etc.)                                 |
| `list_sleep`         | Sleep intervals for a child in a date range                                       |
| `list_feed`          | Feeding intervals (breast/bottle/solids)                                          |
| `list_diapers`       | Diaper and potty events                                                           |
| `list_activities`    | Activity intervals (bath, tummy time, story time, screen time, etc.)              |
| `list_pump`          | Pump session entries                                                              |
| `list_health`        | Growth, medication, and temperature entries                                       |
| `get_latest_growth`  | Most recent growth snapshot, from the child's health prefs                        |
| `list_curated_foods` | Huckleberry's global curated foods catalog                                        |
| `list_custom_foods`  | User-created custom foods for a child                                             |

All tools are annotated `readOnlyHint: true` and `destructiveHint: false`.

### Response envelope

```json
{
  "data": [...],
  "totalResults": 12,
  "_next": [
    { "tool": "list_sleep", "description": "List sleep intervals for a child" }
  ]
}
```

### Error envelope

```json
{
  "error": "ChildNotFoundError",
  "message": "Child not found: abc",
  "category": "not_found",
  "retryable": false,
  "recovery": "Use client.user.listChildren() (or the list_children MCP tool) to get valid child IDs for this account."
}
```

## API reference

### `new Huckleberry(options)`

| Option              | Type      | Notes                                                                              |
|---------------------|-----------|------------------------------------------------------------------------------------|
| `email`             | `string`  | Required (unless `firestoreOverride` is set)                                       |
| `password`          | `string`  | Required (unless `firestoreOverride` is set)                                       |
| `timezone`          | `string?` | IANA tz, used for offset calculations in future write support                      |
| `firestoreOverride` | `Firestore?` | **Advanced/tests**: skip sign-in and use an injected Firestore                  |
| `uidOverride`       | `string?` | With `firestoreOverride`: user UID to use in queries                               |
| `idTokenProvider`   | `() => Promise<string>?` | With `firestoreOverride`: provider for the curated-foods storage fetch |
| `fetchOverride`     | `typeof fetch?` | With `firestoreOverride`: fetch implementation for tests                     |

### Error classes

- `HuckleberryError` — base class with `category`, `retryable`, `recovery`
- `AuthenticationError` — missing or bad credentials
- `ChildNotFoundError` — unknown child id
- `InvalidDateRangeError` — `start >= end`, or non-Date input
- `ApiError` — wraps Firestore errors / network failures (exposes `.code` when available)

## Development

```bash
bun install
bun test               # run the test suite
bun run lint           # tsc --noEmit + biome check
bun run format         # biome write mode
bun run mcp            # start the MCP server locally against your env credentials
```

## Limitations

- **Read-only.** No create/update/delete in v1.
- **Reverse-engineered.** Huckleberry has no public API — field shapes and behaviors are documented inside `py-huckleberry-api` and mirrored here. Breaking changes on the Huckleberry side can break this client.
- **Firebase SDK only.** Huckleberry's Firebase Security Rules block direct REST calls, so a raw `fetch` against `firestore.googleapis.com` will not work. This package uses the `firebase` JS SDK, which passes the rules.
- No real-time listeners (`onSnapshot`). Snapshot reads only.

## Credits

- [`py-huckleberry-api`](https://github.com/Woyken/py-huckleberry-api) — the reverse-engineered Python client this project is modelled on.
- [`macos-ts`](https://github.com/evantahler/macos-ts) — style, testing, and MCP packaging conventions.

## License

MIT
