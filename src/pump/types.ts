import type { VolumeUnits } from "../feed/types.ts";

export type PumpEntryMode = "leftright" | "total";

export interface FirebasePumpIntervalData {
  start: number;
  entryMode: PumpEntryMode;
  leftAmount?: number;
  rightAmount?: number;
  units: VolumeUnits;
  offset: number;
  duration?: number;
  end_offset?: number;
  lastUpdated?: number;
  notes?: string;
}
