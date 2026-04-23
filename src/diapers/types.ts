export type DiaperMode = "pee" | "poo" | "both" | "dry";
export type PooColor = "yellow" | "brown" | "black" | "green" | "red" | "gray";
export type PooConsistency =
  | "solid"
  | "loose"
  | "runny"
  | "mucousy"
  | "hard"
  | "pebbles"
  | "diarrhea";
export type PottyResult = "satButDry" | "wentPotty" | "accident";

export interface FirebaseDiaperQuantity {
  pee?: number;
  poo?: number;
}

export interface FirebaseDiaperData {
  mode: DiaperMode;
  start: number;
  lastUpdated?: number;
  offset: number;
  quantity?: FirebaseDiaperQuantity;
  color?: PooColor;
  consistency?: PooConsistency;
  diaperRash?: boolean;
  notes?: string;
  isPotty?: boolean;
  howItHappened?: PottyResult;
}
