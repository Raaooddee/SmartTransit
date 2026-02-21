/**
 * Stop-area density: relative demand at each stop (high/medium/low).
 * Used for bus fullness heuristic. Key by stop name or stop ID.
 */
export type StopDensityLevel = "high" | "medium" | "low"

export const STOP_DENSITY: Record<string, StopDensityLevel> = {
  "University & Lake": "high",
  "University Ave & Lake St": "high",
  "State St & Lake St": "high",
  "Langdon St & Park St": "high",
  "Observatory & Charter": "high",
  "University Bay & Marsh": "medium",
  "Highland & University": "medium",
  "Mills & University": "medium",
  "Randall & Charter": "medium",
  "Dayton & State": "high",
  "Johnson & State": "high",
  "Babcock & University": "medium",
  "Camp Randall": "medium",
}

const DEFAULT_DENSITY: StopDensityLevel = "medium"

export function getStopDensity(stopNameOrId: string): StopDensityLevel {
  const normalized = stopNameOrId.trim()
  return STOP_DENSITY[normalized] ?? DEFAULT_DENSITY
}
