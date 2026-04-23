export type FeedMode = "breast" | "bottle" | "solids";
export type FeedSide = "left" | "right" | "none";
export type BottleType =
  | "Breast Milk"
  | "Formula"
  | "Tube Feeding"
  | "Cow Milk"
  | "Goat Milk"
  | "Soy Milk"
  | "Other";
export type VolumeUnits = "ml" | "oz";
export type SolidsReaction = "LOVED" | "MEH" | "HATED" | "ALLERGIC";
export type SolidsFoodSource = "custom" | "curated";

export interface SolidsFoodEntry {
  id: string;
  created_name: string;
  source: SolidsFoodSource;
  amount?: string | number;
}

export interface FirebaseBreastFeedIntervalData {
  mode: "breast";
  start: number;
  lastSide: FeedSide;
  lastUpdated?: number;
  leftDuration?: number;
  rightDuration?: number;
  offset: number;
  end_offset?: number;
  notes?: string;
}

export interface FirebaseBottleFeedIntervalData {
  mode: "bottle";
  start: number;
  lastUpdated?: number;
  bottleType: BottleType;
  amount: number;
  units: VolumeUnits;
  offset: number;
  end_offset?: number;
  notes?: string;
}

export interface FirebaseSolidsFeedIntervalData {
  mode: "solids";
  start: number;
  lastUpdated?: number;
  offset: number;
  foods?: Record<string, SolidsFoodEntry>;
  reactions?: Partial<Record<SolidsReaction, boolean>>;
  notes?: string;
  foodNoteImage?: string;
  multientry_key?: string;
  end_offset?: number;
}

export type FirebaseFeedIntervalData =
  | FirebaseBreastFeedIntervalData
  | FirebaseBottleFeedIntervalData
  | FirebaseSolidsFeedIntervalData;
