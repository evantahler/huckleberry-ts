// Schemas ported from py-huckleberry-api/src/huckleberry_api/firebase_types.py.
// All fields are optional where the Python client marks them so — Huckleberry
// Firestore docs have organically grown keys, so we mirror the Pydantic model's
// `extra="ignore"` stance by typing only the fields we care about.

export type GenderType = "M" | "F" | "";

export interface FirebaseUserChildRef {
  cid: string;
  nickname?: string;
  picture?: string;
  color?: string;
}

export interface FirebaseUserSubscriptionData {
  type?: number;
  free_trial_entitlement?: string;
  free_trial_plan?: string;
  trial_expired_modal?: boolean;
  free_trial_time?: number;
  expiration?: number;
  free_trial_expiration?: number;
}

export interface FirebaseUserDocument {
  email?: string;
  firstname?: string;
  lastname?: string;
  childList: FirebaseUserChildRef[];
  lastChild?: string;
  childrenUpdatedAt?: number;
  isOnboardingCompleted?: boolean;
  latestTimezone?: string;
  onboarding_platform?: string;
  subscription?: FirebaseUserSubscriptionData;
  tokens?: Record<string, string>;
  tooltips?: Record<string, boolean>;
}

export interface FirebaseChildSweetspot {
  selectedNapDay?: number;
  sweetSpotTimes?: Record<string, number>;
  uuid?: string;
}

export interface FirebaseChildDocument {
  // Collection is `childs` (sic) — not `children`. See py const/README.
  childsName?: string;
  birthdate?: string | number;
  createdAt?: number;
  gender?: GenderType;
  picture?: string;
  color?: string;
  nightStart?: string | number;
  morningCutoff?: string | number;
  naps?: string;
  sweetspot?: FirebaseChildSweetspot;
  pre?: number;
  singleIntervalCount?: number;
  lastInsightRequest?: number;
  categories?: Record<string, boolean>;
  disabledInsights?: Record<string, boolean>;
  questionnaireProgress?: number;
  lastQuestionnaireAppVersion?: string;
  lastQuestionnaireCompleteTime?: number;
}
