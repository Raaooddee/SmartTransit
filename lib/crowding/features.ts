/**
 * Time and stop features for bus fullness heuristic.
 * Madison timezone (America/Chicago) for rush/dismissal.
 */

import { DISMISSAL_WINDOWS } from "./dismissal-windows"
import { getStopDensity, type StopDensityLevel } from "./stop-density"

// Rush hour windows (local 24h): morning 7–9, evening 17–18
const RUSH_HOURS = [
  [7, 9],
  [17, 18],
]

export type TimeFeatures = {
  hour: number
  minute: number
  day_of_week: number // 0 = Sunday, 5 = Saturday
  is_weekend: boolean
  in_rush_hour: boolean
  in_dismissal_window: boolean
}

export function getTimeFeatures(now: Date = new Date()): TimeFeatures {
  // Madison is America/Chicago
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    weekday: "short",
  })
  const parts = formatter.formatToParts(now)
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10)
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10)
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon"
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  const day_of_week = dayMap[weekday] ?? 1
  const is_weekend = day_of_week === 0 || day_of_week === 6

  const in_rush_hour = RUSH_HOURS.some(([start, end]) => hour >= start && hour < end)

  const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
  const in_dismissal_window =
    !is_weekend &&
    DISMISSAL_WINDOWS.some((w) => timeStr >= w.start && timeStr <= w.end)

  return {
    hour,
    minute,
    day_of_week,
    is_weekend,
    in_rush_hour,
    in_dismissal_window,
  }
}

export function getStopDensityFeature(stopNameOrId: string): StopDensityLevel {
  return getStopDensity(stopNameOrId)
}
