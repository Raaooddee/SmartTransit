/**
 * Class dismissal time windows (weekdays) when more students head to buses.
 * Times in local (Madison) 24h "HH:mm" format. Used for bus fullness heuristic.
 */
export type DismissalWindow = {
  start: string // e.g. "09:50"
  end: string   // e.g. "10:10"
}

export const DISMISSAL_WINDOWS: DismissalWindow[] = [
  { start: "07:45", end: "08:15" },
  { start: "09:50", end: "10:10" },
  { start: "11:50", end: "12:15" },
  { start: "14:20", end: "14:40" },
  { start: "15:50", end: "16:15" },
  { start: "17:00", end: "17:30" },
]
