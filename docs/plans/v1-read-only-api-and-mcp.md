# huckleberry-ts — TypeScript/Bun client + MCP server for Huckleberry childcare

## Context

Build a TypeScript/Bun package that wraps the [Huckleberry childcare app](https://huckleberrycare.com/) API, exposing **both** a typed library and a local MCP server. Modeled on the author's [`macos-ts`](/Users/evan/workspace/macos-ts) project for style, packaging, testing, and MCP conventions. Huckleberry has no public API — we port the reverse-engineered surface from [`py-huckleberry-api`](https://github.com/Woyken/py-huckleberry-api).

v1 scope: **read-only endpoints only**. Writes/creates/deletes are explicitly out of scope.

Target directory: `/Users/evan/workspace/hucklebaby` (currently empty).

---

## Key design decisions (user-confirmed)

- **Firestore client**: `firebase` JS SDK. Huckleberry is a Firebase app (project `simpleintervals`) and its Security Rules **block direct REST** (403). The Firebase SDK uses WebChannel under the hood and passes the rules. It also handles `idToken`/refresh lifecycle automatically, avoiding the custom `FirebaseTokenCredentials` shim the Python client carries.
- **API shape**: namespaced sub-clients — `client.user.get()`, `client.sleep.list(...)`, `client.feed.list(...)`, etc. Mirrors `macos-ts`'s per-feature modularity while sharing one auth session and one Firestore handle.
- **Tests**: mocked only (no live integration). Fixtures are JSON files shaped after `py-huckleberry-api`'s Pydantic models.
- **Runtime**: Bun only. ESM-only. No build step — publish TypeScript source (matches `macos-ts`).

---

## Stack

| Area        | Choice |
|-------------|--------|
| Runtime     | Bun (strict, type-checked via `tsc --noEmit`) |
| Modules     | ESM only (`"type": "module"`) |
| Lint/format | Biome (copy `biome.json` from macos-ts) |
| Tests       | `bun:test` |
| Deps        | `firebase`, `@modelcontextprotocol/sdk`, `zod` |
| DevDeps     | `@biomejs/biome`, `@types/bun` |

---

## Package manifest (`package.json`)

```json
{
  "name": "huckleberry-ts",
  "version": "0.1.0",
  "description": "TypeScript client and MCP server for the Huckleberry childcare app — read sleep, feed, diaper, activity, pump, health, and solids data.",
  "module": "src/index.ts",
  "bin": { "huckleberry-mcp": "src/mcp-server.ts" },
  "type": "module",
  "license": "MIT",
  "files": ["src", "README.md", "LICENSE"],
  "publishConfig": { "access": "public" },
  "keywords": ["huckleberry", "childcare", "baby", "sleep", "feeding", "firebase", "mcp", "typescript"],
  "scripts": {
    "test": "bun test",
    "lint": "tsc --noEmit && biome check .",
    "format": "biome check --write .",
    "mcp": "bun run src/mcp-server.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.29.0",
    "firebase": "^11.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.4.11",
    "@types/bun": "latest"
  },
  "peerDependencies": { "typescript": "^5" }
}
```

Copy `tsconfig.json` and `biome.json` verbatim from `/Users/evan/workspace/macos-ts`.

---

## Project layout

```
hucklebaby/
├── src/
│   ├── index.ts              # barrel: re-exports Huckleberry, error classes, types
│   ├── client.ts             # Huckleberry class (auth + namespaced sub-clients)
│   ├── auth.ts               # initializeApp + signInWithEmailAndPassword wrapper
│   ├── constants.ts          # FIREBASE_API_KEY, PROJECT_ID, APP_ID (from py const.py)
│   ├── errors.ts             # HuckleberryError base + AuthenticationError, ChildNotFoundError, ApiError
│   ├── types.ts              # shared primitives: ChildId, DateRange, Timestamp unions
│   ├── firestore/
│   │   └── range-query.ts    # shared helper: regular + multi-container merge (see "Critical porting details")
│   ├── mcp-server.ts         # #!/usr/bin/env bun — createServer(), stdio transport, env-var credentials
│   ├── mcp-helpers.ts        # wrapTool, toolError, readOnlyAnnotations (port from macos-ts)
│   ├── user/
│   │   ├── index.ts          # UserClient class + exports
│   │   ├── types.ts          # FirebaseUserDocument, FirebaseChildDocument, ChildListEntry
│   │   ├── queries.ts        # get(), getChild(childId), listChildren() (derived from user.childList)
│   │   └── mcp-tools.ts      # userCapability + registerUserTools
│   ├── sleep/
│   │   ├── index.ts
│   │   ├── types.ts          # FirebaseSleepIntervalData, FirebaseSleepMultiContainer
│   │   ├── queries.ts        # list(childId, {start, end})
│   │   └── mcp-tools.ts
│   ├── feed/                 # FirebaseFeedIntervalData (discriminated union: breast/bottle/solids)
│   ├── diapers/              # FirebaseDiaperData
│   ├── activities/           # FirebaseActivityIntervalData (mode: bath/tummyTime/…)
│   ├── pump/                 # FirebasePumpIntervalData
│   ├── health/               # HealthDataEntry (growth/medication/temperature) + getLatestGrowth
│   └── solids/               # listCuratedFoods (Firebase Storage) + listCustomFoods (Firestore)
├── tests/
│   ├── fixtures/
│   │   ├── user.json
│   │   ├── child.json
│   │   ├── sleep-regular.json
│   │   ├── sleep-multi.json          # exercises the multi-container merge path
│   │   ├── feed-mixed-modes.json
│   │   ├── diapers.json
│   │   ├── activities.json
│   │   ├── pump.json
│   │   ├── health-growth.json
│   │   ├── solids-curated.json
│   │   └── solids-custom.json
│   ├── mocks/
│   │   └── firestore.ts              # in-memory mock of the firebase/firestore surface we use
│   ├── client.test.ts                # auth, lazy connect, close
│   ├── sleep.test.ts                 # regular + multi merge, range filtering
│   ├── feed.test.ts
│   ├── diapers.test.ts
│   ├── activities.test.ts
│   ├── pump.test.ts
│   ├── health.test.ts
│   ├── solids.test.ts
│   ├── user.test.ts
│   └── mcp-server.test.ts            # InMemoryTransport, tool listing, end-to-end tool calls
├── .github/workflows/ci.yml          # copy macos-ts: setup-bun, lint, test
├── biome.json                        # copy from macos-ts
├── tsconfig.json                     # copy from macos-ts
├── package.json
├── README.md
├── LICENSE
└── .gitignore
```

---

## TypeScript public API (read-only)

```ts
import { Huckleberry } from "huckleberry-ts";

const client = new Huckleberry({
  email: process.env.HUCKLEBERRY_EMAIL!,
  password: process.env.HUCKLEBERRY_PASSWORD!,
  timezone: "America/New_York", // optional, IANA; used to compute offset fields
});

await client.connect(); // lazy-signs-in on first call if you skip this

// User & children
const user = await client.user.get();              // FirebaseUserDocument
const kids = client.user.listChildren();           // from user.childList
const child = await client.user.getChild(kids[0].cid);

// Intervals (all take { start: Date, end: Date })
const range = { start: new Date("2026-04-01"), end: new Date() };
await client.sleep.list(child.id, range);          // FirebaseSleepIntervalData[]
await client.feed.list(child.id, range);
await client.diapers.list(child.id, range);
await client.activities.list(child.id, range);
await client.pump.list(child.id, range);
await client.health.list(child.id, range);
await client.health.getLatestGrowth(child.id);

// Solids
await client.solids.listCuratedFoods();            // Firebase Storage JSON
await client.solids.listCustomFoods(child.id, { includeArchived: false });

await client.close();
```

### Naming conventions (matching macos-ts)

- Main class: `Huckleberry` (exported from `src/client.ts`, re-exported from `src/index.ts`).
- Sub-client classes: `UserClient`, `SleepClient`, etc. — instantiated once by `Huckleberry` and exposed as `client.user`, `client.sleep`, etc. Constructor receives the shared `Firestore` handle + auth state.
- Options types: `HuckleberryOptions`, `DateRange`, etc.
- IDs: `type ChildId = string` (branded-ish alias; no runtime overhead).

---

## Critical porting details (do not skip)

These are the non-obvious bits from `py-huckleberry-api`. If any are missed, the client silently returns wrong data.

1. **Collection name is `childs`** — not `children`. Load-bearing typo. Same for `feed`, `diaper` (singular).
2. **Multi-entry containers**: every interval subcollection stores history two ways:
   - Regular docs — `start` is a top-level field and Firestore-filterable.
   - Container docs — `{ multi: true, data: { entryId: {...}, ... } }` where nested entries have their own `start`s.
   Every `list_*_intervals` method in `api.py` runs **two queries** and merges:
   - Query A: `where("start", ">=", start).where("start", "<", end).orderBy("start")` — filter out docs where `multi === true`.
   - Query B: `where("multi", "==", true)` — iterate each container's `data` map and in-memory filter by `start`.
   Centralize this in `src/firestore/range-query.ts` so each feature `queries.ts` stays short. Reference: `api.py:1994-2055`.
3. **Timestamps have mixed units** — document in `types.ts`:
   - Interval `start`: Unix **seconds** (float).
   - `timerStartTime`: **milliseconds** on sleep/pump/activity; **seconds** on feed.
   - `FirebaseTimestamp` ({seconds, nanos}) is a separate thing — Firestore's native timestamp.
4. **`offset` fields** are timezone-offset minutes, **sign-flipped** (UTC+2 stored as -120). We don't write timestamps in v1, so we only need to expose these verbatim on reads — but add a `tzOffsetMinutesFromIsoOffset()` helper anyway in `src/types.ts` for future write support.
5. **Firebase config** (verbatim from `py-huckleberry-api/src/huckleberry_api/const.py`, safe to embed — public Web API key, security is enforced by rules):
   ```ts
   export const FIREBASE_API_KEY = "AIzaSyApGVHktXeekGyAt-G6dIeWHUkq2oXqcjg";
   export const FIREBASE_PROJECT_ID = "simpleintervals";
   export const FIREBASE_APP_ID = "1:219218185774:android:a3e215cc246b92b0";
   ```
6. **Curated foods** live in Firebase **Storage**, not Firestore: `GET https://firebasestorage.googleapis.com/v0/b/simpleintervals.appspot.com/o/foods%2Ffooddb.json?alt=media` with `Authorization: Bearer <idToken>`. Pull the ID token from the Firebase Auth `currentUser.getIdToken()` and plain-`fetch` this one.
7. **Error surfaces** from Firestore SDK are `FirestoreError` with `.code` (e.g. `"permission-denied"`, `"unauthenticated"`). Wrap into our `HuckleberryError` hierarchy.
8. **Resilience choice to skip**: the Python client swallows `GoogleAPICallError`/`ValidationError` inside `list_*` methods and returns `[]`. **We will not copy this** — surface errors instead. Silent empty returns caused debugging pain historically and the MCP wrapper needs to report errors to the agent.

---

## MCP server

Mirrors `macos-ts/src/mcp-server.ts` closely.

- Bin: `huckleberry-mcp` → `src/mcp-server.ts` with `#!/usr/bin/env bun` shebang.
- Transport: `StdioServerTransport`.
- Credentials come from env vars: `HUCKLEBERRY_EMAIL`, `HUCKLEBERRY_PASSWORD`, `HUCKLEBERRY_TIMEZONE` (optional). If email/password are missing, fail fast with a `HuckleberryError` whose `recovery` explains the env var names.
- `createServer(options)` returns `{ server, client }` — takes an optional `HuckleberryOptions` so tests can inject a pre-built mocked client (matches `createServer(options?)` in macos-ts).
- Tools — all `readOnlyAnnotations`, all responses go through `wrapTool`:
  | Tool name            | Maps to                                  | Input schema (zod)            |
  |----------------------|------------------------------------------|-------------------------------|
  | `get_capabilities`   | aggregates feature capabilities          | (none)                        |
  | `get_user`           | `client.user.get()`                      | (none)                        |
  | `list_children`      | `client.user.listChildren()`             | (none)                        |
  | `get_child`          | `client.user.getChild(id)`               | `{ childId: string }`         |
  | `list_sleep`         | `client.sleep.list(id, range)`           | `{ childId, start, end }`     |
  | `list_feed`          | `client.feed.list(id, range)`            | `{ childId, start, end }`     |
  | `list_diapers`       | `client.diapers.list(id, range)`         | `{ childId, start, end }`     |
  | `list_activities`    | `client.activities.list(id, range)`      | `{ childId, start, end }`     |
  | `list_pump`          | `client.pump.list(id, range)`            | `{ childId, start, end }`     |
  | `list_health`        | `client.health.list(id, range)`          | `{ childId, start, end }`     |
  | `get_latest_growth`  | `client.health.getLatestGrowth(id)`      | `{ childId: string }`         |
  | `list_curated_foods` | `client.solids.listCuratedFoods()`       | (none)                        |
  | `list_custom_foods`  | `client.solids.listCustomFoods(id, opts)`| `{ childId, includeArchived? }` |

- `_next` hints drive discovery (macos-ts pattern): `get_capabilities` → `list_children` → per-interval tools; each `list_children` response hints at `list_sleep`/`list_feed`/etc.
- Dates in MCP tool input accepted as ISO 8601 strings (`z.string().datetime()`), parsed to `Date` internally. The TS library takes `Date` objects directly.

---

## Errors

Port `macos-ts/src/errors.ts` with renaming. `src/errors.ts`:

```ts
export type ErrorCategory = "not_found" | "access_denied" | "invalid_input" | "auth" | "network" | "internal";

export class HuckleberryError extends Error {
  readonly category: ErrorCategory;
  readonly retryable: boolean;
  readonly recovery: string;
  // constructor mirrors MacOSError
}

export class AuthenticationError extends HuckleberryError { /* category: "auth" */ }
export class ChildNotFoundError extends HuckleberryError { /* category: "not_found" */ }
export class InvalidDateRangeError extends HuckleberryError { /* category: "invalid_input" */ }
export class ApiError extends HuckleberryError { /* wraps Firestore/network errors, retryable:true for network */ }
```

Every error includes a `recovery` string with actionable guidance, e.g. `AuthenticationError.recovery = "Check HUCKLEBERRY_EMAIL / HUCKLEBERRY_PASSWORD env vars, or call new Huckleberry({email, password}) with valid credentials."`.

---

## Testing

- `tests/mocks/firestore.ts` exposes a minimal shim of the `firebase/firestore` functions we actually call: `collection`, `doc`, `query`, `where`, `orderBy`, `getDocs`, `getDoc`. Backed by the JSON fixtures under `tests/fixtures/`. Injected into `Huckleberry` via an optional `firestoreFactory` option (for prod: real `getFirestore`; for tests: mock).
- Feature tests verify:
  - Range filter correctness (regular-docs-only fixture).
  - Multi-container merge correctness (`sleep-multi.json` — multi doc with entries straddling the range boundary; assert in-range ones are returned, out-of-range skipped).
  - Error paths (simulated `FirestoreError` → mapped to `ApiError` with correct category).
- `tests/mcp-server.test.ts` uses `InMemoryTransport.createLinkedPair()` (macos-ts pattern at `tests/mcp-server.test.ts`) — asserts tool count, every tool has a description, a sample tool call returns the expected shape via the mocked Huckleberry.
- No live Huckleberry calls anywhere. CI runs `bun install --frozen-lockfile && bun run lint && bun test` — fully offline.

---

## README (structure to match macos-ts)

1. 1-line tagline.
2. Requirements (Bun, a Huckleberry account).
3. Install (`bun add huckleberry-ts`).
4. Usage — library examples per feature (user, sleep, feed, diaper, etc.).
5. MCP Server section — Claude Desktop JSON config with env vars, tool list, response envelope, error format.
6. API reference — constructor options, error classes.
7. Development (`bun test`, `bun run lint`, `bun run mcp`).
8. Limitations — read-only, relies on reverse-engineered API, Firebase Security Rules block REST so only the Firebase SDK works.
9. Credits to `py-huckleberry-api` + License.

---

## Files to reference while implementing

### From `macos-ts` (style/patterns — port verbatim where noted):
- `package.json` — structure, scripts, engines, publishConfig
- `tsconfig.json`, `biome.json` — copy directly
- `src/mcp-server.ts` — `createServer()` shape, `import.meta.main` guard, `beforeExit` cleanup
- `src/mcp-helpers.ts` — `wrapTool`, `toolError`, `readOnlyAnnotations`, `NextAction` (port)
- `src/errors.ts` — `MacOSError` hierarchy (port as `HuckleberryError`)
- `src/notes/mcp-tools.ts` — tool-registration pattern, capability object, zod input schemas, `_next` hints
- `src/notes/index.ts` — feature module barrel shape
- `tests/mcp-server.test.ts` — `InMemoryTransport` setup, tool assertions
- `tests/notes.test.ts` — `beforeAll`/`afterAll` lifecycle, `describe`/`test` layout
- `.github/workflows/ci.yml` — setup-bun + lint + test

### From `py-huckleberry-api` (semantics — translate to TS):
- `src/huckleberry_api/const.py` — Firebase constants (copy verbatim into `src/constants.ts`)
- `src/huckleberry_api/firebase_types.py` — **the schema bible**. Translate each model to a TS interface; use zod only for MCP input validation, not for response parsing (trust Firestore shapes, fail loud on mismatch).
- `src/huckleberry_api/api.py`:
  - `185-326` — auth flow (reference only; Firebase SDK handles most of this)
  - `340-381` — `get_user`/`get_child` shape
  - `1197-1248` — solids lookups (curated + custom)
  - `1994-2375` — every `list_*_intervals` method; especially `1994-2055` for the two-query merge pattern
- `README.md` — gotchas, the REST-is-blocked warning
- `tests/test_*.py` — fixture data shapes (copy representative JSON into our `tests/fixtures/`)

---

## Verification

End-to-end checks after implementation:

1. `bun install` in `/Users/evan/workspace/hucklebaby` — installs `firebase`, `@modelcontextprotocol/sdk`, `zod`, Biome.
2. `bun run lint` — passes `tsc --noEmit` and Biome.
3. `bun test` — all fixture-backed tests pass; MCP in-memory round-trip passes.
4. Manual smoke test (requires a real Huckleberry account, performed by user):
   ```bash
   export HUCKLEBERRY_EMAIL=...
   export HUCKLEBERRY_PASSWORD=...
   bun run src/mcp-server.ts
   ```
   Wire into Claude Desktop / Claude Code via MCP config, call `list_children`, then `list_sleep` for a recent date range — confirm real data returns.
5. `git init` + initial commit; push to a new GitHub repo matching the `macos-ts` repo conventions.

---

## Out of scope for v1 (explicitly)

- Any write endpoints (create sleep/feed/diaper/activity, edit profile, etc.).
- Real-time Firestore listeners (`onSnapshot`) — the Python client has these; defer to v2.
- TUI layer (macos-ts has `tui/` — skip for now).
- Live integration tests.
- CJS builds / dual-module publishing.
