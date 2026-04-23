export type WeightUnits = "kg" | "lbs.oz";
export type HeightUnits = "cm" | "ft.in";
export type HeadUnits = "hcm" | "hin";
export type MedicationUnits = "ml" | "oz" | "tsp" | "drops";
export type TemperatureUnits = "C" | "F";
export type HealthDataMode = "growth" | "medication" | "temperature";

export interface FirebaseGrowthData {
  _id?: string;
  type?: "health";
  mode: "growth";
  start: number;
  lastUpdated?: number;
  offset: number;
  isNight?: boolean;
  multientry_key?: string;
  weight?: number;
  weightUnits?: WeightUnits;
  height?: number;
  heightUnits?: HeightUnits;
  head?: number;
  headUnits?: HeadUnits;
}

export interface FirebaseMedicationData {
  type?: "health";
  mode: "medication";
  start: number;
  lastUpdated?: number;
  offset: number;
  medication_id?: string;
  medication_name?: string;
  amount?: number;
  units?: MedicationUnits;
  notes?: string;
  multientry_key?: string;
}

export interface FirebaseTemperatureData {
  type?: "health";
  mode: "temperature";
  start: number;
  lastUpdated?: number;
  offset: number;
  amount?: number;
  units?: TemperatureUnits;
  multientry_key?: string;
}

export type HealthDataEntry =
  | FirebaseGrowthData
  | FirebaseMedicationData
  | FirebaseTemperatureData;

export interface FirebaseHealthPrefs {
  lastGrowthEntry?: FirebaseGrowthData;
  lastMedication?: FirebaseMedicationData;
  lastTemperature?: FirebaseTemperatureData;
}

export interface FirebaseHealthDocumentData {
  prefs?: FirebaseHealthPrefs;
}
