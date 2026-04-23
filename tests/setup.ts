// Bun test preload — swaps `firebase/firestore` with our in-memory mock for
// every test file. Source code continues to `import ... from "firebase/firestore"`
// unchanged and transparently picks up the mock.
import { mock } from "bun:test";
import * as fsMock from "./mocks/firestore.ts";

// `getFirestore` is imported by src/auth.ts — tests never call sign-in, but the
// import is static so the symbol must exist. Stub it to the mock sentinel.
mock.module("firebase/firestore", () => ({
  collection: fsMock.collection,
  doc: fsMock.doc,
  getDoc: fsMock.getDoc,
  getDocs: fsMock.getDocs,
  query: fsMock.query,
  where: fsMock.where,
  orderBy: fsMock.orderBy,
  getFirestore: () => fsMock.mockFirestore,
}));

// src/auth.ts also imports from firebase/app and firebase/auth. Tests using
// `firestoreOverride` never call those, but ESM still needs the named exports
// to resolve.
mock.module("firebase/app", () => ({
  initializeApp: () => ({ name: "mock" }),
  getApp: () => ({ name: "mock" }),
  getApps: () => [],
}));

mock.module("firebase/auth", () => ({
  getAuth: () => ({}),
  signInWithEmailAndPassword: () => {
    throw new Error("signIn not available in tests; use firestoreOverride");
  },
  signOut: async () => {},
}));
