import { doc, getDoc } from "firebase/firestore";
import type { ContextResolver } from "../client.ts";
import { ChildNotFoundError, wrapFirestoreError } from "../errors.ts";
import type {
  FirebaseChildDocument,
  FirebaseUserChildRef,
  FirebaseUserDocument,
} from "./types.ts";

export class UserClient {
  constructor(private readonly ctx: ContextResolver) {}

  async get(): Promise<FirebaseUserDocument> {
    const { firestore, uid } = await this.ctx();
    try {
      const snap = await getDoc(doc(firestore, "users", uid));
      if (!snap.exists()) {
        // Huckleberry creates users/{uid} on first app launch; if we got here
        // with a valid auth session but no doc, something is genuinely wrong.
        throw new ChildNotFoundError(`users/${uid}`);
      }
      const data = snap.data() as Partial<FirebaseUserDocument>;
      return { childList: [], ...data };
    } catch (err) {
      throw wrapFirestoreError(err, `get user ${uid}`);
    }
  }

  // Convenience: returns the `childList` array. Requires the user doc fetch
  // so we hit Firestore once per call — consumers can cache if needed.
  async listChildren(): Promise<FirebaseUserChildRef[]> {
    const user = await this.get();
    return user.childList ?? [];
  }

  async getChild(childId: string): Promise<FirebaseChildDocument> {
    if (!childId) throw new ChildNotFoundError("<empty>");
    const { firestore } = await this.ctx();
    try {
      // Collection is `childs` (typo preserved from the Huckleberry schema).
      const snap = await getDoc(doc(firestore, "childs", childId));
      if (!snap.exists()) throw new ChildNotFoundError(childId);
      return snap.data() as FirebaseChildDocument;
    } catch (err) {
      if (err instanceof ChildNotFoundError) throw err;
      throw wrapFirestoreError(err, `get child ${childId}`);
    }
  }
}
