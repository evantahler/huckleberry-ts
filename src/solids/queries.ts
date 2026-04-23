import {
  collection,
  query as fsQuery,
  getDocs,
  where,
} from "firebase/firestore";
import type { ContextResolver } from "../client.ts";
import {
  CURATED_FOODS_STORAGE_PATH,
  FIREBASE_STORAGE_BUCKET,
} from "../constants.ts";
import { ApiError, wrapFirestoreError } from "../errors.ts";
import type { ChildId } from "../types.ts";
import type {
  FirebaseCuratedFoodDocument,
  FirebaseCustomFoodTypeDocument,
} from "./types.ts";

const CURATED_FOODS_URL = `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_STORAGE_BUCKET}/o/${encodeURIComponent(
  CURATED_FOODS_STORAGE_PATH,
)}?alt=media`;

export interface ListCustomFoodsOptions {
  includeArchived?: boolean;
}

export class SolidsClient {
  constructor(private readonly ctx: ContextResolver) {}

  // Curated foods live in Firebase Storage, not Firestore. Plain HTTPS with a
  // bearer ID token from Firebase Auth. The response is an object keyed by
  // food id; we return it as an array for ergonomics.
  async listCuratedFoods(): Promise<FirebaseCuratedFoodDocument[]> {
    const ctx = await this.ctx();
    const token = await ctx.getIdToken();
    let response: Response;
    try {
      response = await ctx.fetch(CURATED_FOODS_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      throw new ApiError("Failed to fetch curated foods", { cause: err });
    }
    if (!response.ok) {
      throw new ApiError(`Curated foods request returned ${response.status}`, {
        code: String(response.status),
        retryable: response.status >= 500,
      });
    }
    const body = (await response.json()) as
      | Record<string, FirebaseCuratedFoodDocument>
      | FirebaseCuratedFoodDocument[];
    if (Array.isArray(body)) return body;
    return Object.values(body);
  }

  async listCustomFoods(
    childId: ChildId,
    options: ListCustomFoodsOptions = {},
  ): Promise<FirebaseCustomFoodTypeDocument[]> {
    const { firestore } = await this.ctx();
    const customRef = collection(firestore, "types", childId, "custom");
    try {
      // Match py-huckleberry-api: filter to `type == "solids"`. Custom foods
      // are the only solids type stored here, but the field is explicit.
      const q = fsQuery(customRef, where("type", "==", "solids"));
      const snap = await getDocs(q);
      const foods: FirebaseCustomFoodTypeDocument[] = [];
      for (const d of snap.docs) {
        const food = d.data() as FirebaseCustomFoodTypeDocument;
        if (!options.includeArchived && food.archived) continue;
        foods.push(food);
      }
      return foods;
    } catch (err) {
      throw wrapFirestoreError(err, `list custom foods for child ${childId}`);
    }
  }
}
