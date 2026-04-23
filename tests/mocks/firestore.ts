// In-memory stand-in for the subset of `firebase/firestore` that
// huckleberry-ts actually uses. Tests import `resetMockStore`, `seedDoc`, and
// `mockFirestore` from here; `tests/setup.ts` wires the matching exports into
// the `firebase/firestore` module graph via `mock.module`, so source files see
// this implementation transparently.

export type DocData = Record<string, unknown>;

interface Store {
  docs: Map<string, DocData>;
}

const store: Store = { docs: new Map() };

export function resetMockStore(): void {
  store.docs.clear();
}

export function seedDoc(path: string, data: DocData): void {
  store.docs.set(path, data);
}

export function listSeededPaths(): string[] {
  return [...store.docs.keys()];
}

// Opaque sentinel used where production code passes a `Firestore` instance.
export const mockFirestore = { __mockFirestore: true } as unknown;

// --- Reference shapes (minimal; shape-matches fb/firestore just enough) ---

export interface DocRef {
  __kind: "doc";
  path: string;
  id: string;
}

export interface CollRef {
  __kind: "collection";
  path: string;
}

export type QueryConstraintOp = "==" | "!=" | "<" | "<=" | ">" | ">=";

export interface WhereConstraint {
  __kind: "where";
  field: string;
  op: QueryConstraintOp;
  value: unknown;
}

export interface OrderByConstraint {
  __kind: "orderBy";
  field: string;
}

export type QueryConstraint = WhereConstraint | OrderByConstraint;

export interface QueryRef {
  __kind: "query";
  collectionPath: string;
  constraints: QueryConstraint[];
}

// --- Mock implementations of the firebase/firestore surface we consume ---

export function collection(
  _firestore: unknown,
  ...segments: string[]
): CollRef {
  return { __kind: "collection", path: segments.join("/") };
}

export function doc(...args: unknown[]): DocRef {
  // firebase/firestore overloads:
  //   doc(firestore, path, ...pathSegments)
  //   doc(collectionRef, id?)
  const first = args[0];
  if (
    first &&
    typeof first === "object" &&
    (first as CollRef).__kind === "collection"
  ) {
    const coll = first as CollRef;
    const id = (args[1] as string | undefined) ?? crypto.randomUUID();
    return { __kind: "doc", path: `${coll.path}/${id}`, id };
  }
  const segments = args.slice(1) as string[];
  const path = segments.join("/");
  const id = segments[segments.length - 1] ?? "";
  return { __kind: "doc", path, id };
}

export function query(
  ref: CollRef,
  ...constraints: QueryConstraint[]
): QueryRef {
  return {
    __kind: "query",
    collectionPath: ref.path,
    constraints,
  };
}

export function where(
  field: string,
  op: QueryConstraintOp,
  value: unknown,
): WhereConstraint {
  return { __kind: "where", field, op, value };
}

export function orderBy(field: string): OrderByConstraint {
  return { __kind: "orderBy", field };
}

export interface DocSnapshot {
  id: string;
  exists(): boolean;
  data(): DocData | undefined;
}

export interface QuerySnapshot {
  docs: DocSnapshot[];
}

export async function getDoc(ref: DocRef): Promise<DocSnapshot> {
  const data = store.docs.get(ref.path);
  return {
    id: ref.id,
    exists: () => data !== undefined,
    data: () => data,
  };
}

export async function getDocs(ref: QueryRef | CollRef): Promise<QuerySnapshot> {
  let collectionPath: string;
  let constraints: QueryConstraint[];
  if (ref.__kind === "query") {
    collectionPath = ref.collectionPath;
    constraints = ref.constraints;
  } else {
    collectionPath = ref.path;
    constraints = [];
  }

  const prefix = `${collectionPath}/`;
  const matches: { id: string; data: DocData }[] = [];
  for (const [path, data] of store.docs.entries()) {
    if (!path.startsWith(prefix)) continue;
    const tail = path.slice(prefix.length);
    // Skip deeper nesting: only direct children of the collection.
    if (tail.includes("/")) continue;
    matches.push({ id: tail, data });
  }

  let filtered = matches;
  for (const c of constraints) {
    if (c.__kind === "where") {
      filtered = filtered.filter((m) => applyWhere(m.data, c));
    } else if (c.__kind === "orderBy") {
      filtered = [...filtered].sort((a, b) => {
        const av = a.data[c.field];
        const bv = b.data[c.field];
        if (typeof av === "number" && typeof bv === "number") return av - bv;
        if (typeof av === "string" && typeof bv === "string")
          return av.localeCompare(bv);
        return 0;
      });
    }
  }

  return {
    docs: filtered.map((m) => ({
      id: m.id,
      exists: () => true,
      data: () => m.data,
    })),
  };
}

function applyWhere(data: DocData, c: WhereConstraint): boolean {
  const val = data[c.field];
  const v = c.value;
  switch (c.op) {
    case "==":
      return val === v;
    case "!=":
      return val !== v;
    case "<":
      return typeof val === "number" && typeof v === "number" && val < v;
    case "<=":
      return typeof val === "number" && typeof v === "number" && val <= v;
    case ">":
      return typeof val === "number" && typeof v === "number" && val > v;
    case ">=":
      return typeof val === "number" && typeof v === "number" && val >= v;
    default:
      return false;
  }
}

// Helpers used by tests to simulate FirestoreError paths.
export function makeFirestoreError(code: string, message: string): Error {
  const err = new Error(message);
  (err as unknown as { code: string }).code = code;
  return err;
}
