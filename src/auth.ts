import type { FirebaseApp } from "firebase/app";
import { getApp, getApps, initializeApp } from "firebase/app";
import type { Auth, UserCredential } from "firebase/auth";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import {
  FIREBASE_API_KEY,
  FIREBASE_APP_ID,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
} from "./constants.ts";
import { AuthenticationError } from "./errors.ts";

// Name the Firebase app so multiple Huckleberry clients don't collide with the
// default app other consumers of the `firebase` SDK might have initialized.
const HUCKLEBERRY_APP_NAME = "huckleberry-ts";

function getOrInitApp(): FirebaseApp {
  const existing = getApps().find((a) => a.name === HUCKLEBERRY_APP_NAME);
  if (existing) return existing;
  return initializeApp(
    {
      apiKey: FIREBASE_API_KEY,
      authDomain: FIREBASE_AUTH_DOMAIN,
      projectId: FIREBASE_PROJECT_ID,
      storageBucket: FIREBASE_STORAGE_BUCKET,
      appId: FIREBASE_APP_ID,
    },
    HUCKLEBERRY_APP_NAME,
  );
}

export interface AuthSession {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  uid: string;
  getIdToken: () => Promise<string>;
  signOut: () => Promise<void>;
}

export async function signInWithCredentials(
  email: string,
  password: string,
): Promise<AuthSession> {
  if (!email || !password) {
    throw new AuthenticationError(
      "Huckleberry requires a non-empty email and password.",
    );
  }

  const app = getOrInitApp();
  const auth = getAuth(app);
  let credential: UserCredential;
  try {
    credential = await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new AuthenticationError(
      `Failed to sign in to Huckleberry: ${message}`,
      err,
    );
  }

  const firestore = getFirestore(app);

  return {
    app,
    auth,
    firestore,
    uid: credential.user.uid,
    getIdToken: () => credential.user.getIdToken(),
    signOut: async () => {
      await signOut(auth);
    },
  };
}

// Internal helper: retrieve the initialized app without throwing. Tests that
// inject a mocked Firestore don't need this, but close() uses it defensively.
export function getInitializedAppIfAny(): FirebaseApp | undefined {
  try {
    return getApp(HUCKLEBERRY_APP_NAME);
  } catch {
    return undefined;
  }
}
