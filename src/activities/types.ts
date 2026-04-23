export type ActivityMode =
  | "bath"
  | "tummyTime"
  | "storyTime"
  | "screenTime"
  | "skinToSkin"
  | "outdoorPlay"
  | "indoorPlay"
  | "brushTeeth";

export interface FirebaseActivityIntervalData {
  mode: ActivityMode;
  start: number;
  offset: number;
  duration?: number;
  end_offset?: number;
  lastUpdated?: number;
  notes?: string;
}
