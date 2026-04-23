# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

TypeScript + Bun client and local MCP server for the Huckleberry childcare app. Read-only in v1. Models the style, packaging, and MCP conventions of [`macos-ts`](https://github.com/evantahler/macos-ts).

## Stack

- **Runtime**: Bun 1.3+ (strict, type-checked via `tsc --noEmit`)
- **Modules**: ESM only (`"type": "module"`). No build step — TypeScript source is published as-is.
- **Lint/format**: Biome
- **Tests**: `bun:test`
- **Deps**: `firebase` (client SDK), `@modelcontextprotocol/sdk`, `zod`

## Architecture

### Auth + transport

Huckleberry is a Firebase app (project `simpleintervals`). Its Firebase Security Rules **block direct REST calls** (returns 403), so all data reads go through the `firebase` JS SDK: sign in via `signInWithEmailAndPassword`, then `getFirestore(app)` → collection/doc reads. `src/auth.ts` owns this. Firebase handles ID token refresh automatically; we never touch the token directly except for one Firebase Storage fetch (curated foods).

### Client shape

`Huckleberry` (in `src/client.ts`) is the main class. It holds one auth session and one `Firestore` handle, and exposes **namespaced sub-clients**:

- `client.user` — `users/{uid}` + `childs/{cid}` (collection name `childs` is a Huckleberry-side typo and is load-bearing).
- `client.sleep` / `feed` / `diapers` / `activities` / `pump` / `health` — `list(childId, dateRange)` over interval subcollections.
- `client.solids` — `listCuratedFoods()` (Firebase Storage JSON) + `listCustomFoods(childId)` (Firestore).

Sub-clients receive a `ContextResolver` (`() => Promise<ClientContext>`) that lazy-connects on first call. This means callers can do `await client.sleep.list(...)` without explicitly calling `connect()` first.

### The critical helper: `src/firestore/range-query.ts`

Every Huckleberry interval subcollection stores history **two ways** in the same subcollection:

1. **Regular docs**: `{ start: number, ... }` where `start` is a Firestore-filterable Unix-seconds number.
2. **Multi-container docs**: `{ multi: true, data: { entryId: { start, ... }, ... } }` — batched writes. The nested `start`s are **not** Firestore-filterable.

`listIntervalsInRange()` runs both queries in parallel and merges:
- Query A: `where("start", ">=", s).where("start", "<", e).orderBy("start")`
- Query B: `where("multi", "==", true)` → iterate each container's `data` values → in-memory filter by start.

Every feature `queries.ts` calls this helper. If you add a new interval-style feature, use it.

### Errors

`HuckleberryError` (in `src/errors.ts`) is the base class. Every error has `category`, `retryable`, and a human-readable `recovery` string. The `wrapFirestoreError(err, context)` helper maps Firestore error codes (`permission-denied`, `unauthenticated`, `not-found`, `invalid-argument`) into our hierarchy by string `code`, not `instanceof FirestoreError` — module boundaries in mocked tests don't preserve `instanceof`.

**We deliberately do not copy the Python client's swallow-and-return-empty pattern** (which silently returns `[]` on Firestore errors). Errors surface; the MCP wrapper converts them to structured error envelopes.

### MCP server

`src/mcp-server.ts` is the bin entry (`huckleberry-mcp`). `createServer(options?)` is exported so tests can inject a pre-built `Huckleberry` via `options.client`. Each feature module has a `mcp-tools.ts` that exports a `capability` object + a `register*Tools(server, subClient)` function.

All tools use `wrapTool` from `src/mcp-helpers.ts`, which:
- Wraps results as `{ data, totalResults?, _next? }`.
- Converts `HuckleberryError` into the standard error envelope.
- Annotates every tool `readOnlyHint: true`.

Dates on the MCP wire are ISO 8601 strings validated by zod's `.datetime({ offset: true })`.

## Testing

Tests never talk to a real Firebase. `tests/setup.ts` is a Bun test preload that uses `mock.module()` to swap `firebase/firestore`, `firebase/app`, and `firebase/auth` for in-memory implementations (see `tests/mocks/firestore.ts`). Source files import `firebase/firestore` normally and transparently pick up the mock.

`Huckleberry` accepts a `firestoreOverride` option (plus `uidOverride`, `idTokenProvider`, `fetchOverride`) that short-circuits the real sign-in flow. Tests always use these.

To add a feature:
1. Put the module under `src/<feature>/` with `types.ts`, `queries.ts`, `mcp-tools.ts`, `index.ts`.
2. Add a sub-client to `Huckleberry`.
3. Register tools in `src/mcp-server.ts` and add the capability to `get_capabilities`.
4. Add a test file under `tests/<feature>.test.ts` using `seedDoc()` + `resetMockStore()`.
5. Update the barrel exports in `src/index.ts`.

## Commands

```bash
bun install
bun test                           # full suite (mocked)
bun test tests/sleep.test.ts       # single test file
bun test -t "lists sleep"          # filter by test name
bun run lint                       # tsc --noEmit + biome check
bun run format                     # biome check --write
bun run mcp                        # run the MCP server against real creds (needs HUCKLEBERRY_EMAIL/PASSWORD; optional HUCKLEBERRY_TIMEZONE)
```

## Non-obvious gotchas (worth re-reading before edits)

- **Collection names**: `users`, `childs` (sic), `sleep`, `feed` (singular), `diaper` (singular), `activities`, `pump`, `health`, `types`. Health's history subcollection is `data`, not `intervals`.
- **Timestamps**: `start` on intervals is Unix **seconds** (float). Sleep/pump/activity `timerStartTime` is **milliseconds**; feed `timerStartTime` is **seconds**. `FirebaseTimestamp` (`{seconds, nanos}`) is a separate thing.
- **`offset` field**: timezone-offset minutes, **sign-flipped** (UTC+2 → -120). We surface it verbatim on reads; `tzOffsetMinutesFromIanaAt(...)` exists in `src/types.ts` for future write support.
- **Firebase config constants** (`src/constants.ts`) are public and safe to embed. The security boundary is Firebase Rules + the user's password.
- **Curated foods** are in Firebase **Storage**, not Firestore. `src/solids/queries.ts` does a plain `fetch` with a `Bearer <idToken>` header.

## Reference

- Python client ported from: `py-huckleberry-api` (https://github.com/Woyken/py-huckleberry-api). `firebase_types.py` is the schema bible.
- Style model: `macos-ts` (`/Users/evan/workspace/macos-ts`). Copy its patterns when adding new features.
- Plan files for past/future work are in `docs/plans/`.
