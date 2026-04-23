export interface FirebaseSleepCondition {
  happy?: boolean;
  longTimeToFallAsleep?: boolean;
  upset?: boolean;
  wokeUpChild?: boolean;
  under_10_minutes?: boolean;
  // Alias for "10-20_minutes" — Python uses a field alias. The raw Firestore
  // field name has a dash, which isn't a valid identifier in TS either, so we
  // keep the alias form consistent.
  ten_to_twenty_minutes?: boolean;
}

export interface FirebaseSleepLocations {
  car?: boolean;
  nursing?: boolean;
  wornOrHeld?: boolean;
  stroller?: boolean;
  coSleep?: boolean;
  nextToCarer?: boolean;
  onOwnInBed?: boolean;
  bottle?: boolean;
  swing?: boolean;
}

export interface FirebaseSleepDetails {
  startSleepCondition?: FirebaseSleepCondition;
  sleepLocations?: FirebaseSleepLocations;
  endSleepCondition?: FirebaseSleepCondition;
  notes?: string;
}

// `start` is Unix seconds; `offset` is timezone-offset minutes sign-flipped
// (UTC+2 → -120). `duration` is seconds.
export interface FirebaseSleepIntervalData {
  _id?: string;
  start: number;
  duration: number;
  offset: number;
  end_offset?: number;
  details?: FirebaseSleepDetails;
  lastUpdated?: number;
}
