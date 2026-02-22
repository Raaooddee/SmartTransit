/**
 * Route 80 variant and segment-based ETA: infer variant from BusTime destination,
 * snap vehicle to variant sequence, estimate minutes to a stop, and apply loop rule
 * (exclude bus that has passed the stop until it passes Langdon at N Park).
 */

import type { Route80Variant, Route80ScheduleSegments } from "./route80-types"

const LANGDON_STOP_ID = "1"

/** Infer route 80 variant id from BusTime destination (des). */
export function inferVariantFromDes(des: string | undefined): string | null {
  if (!des || typeof des !== "string") return null
  const d = des.toUpperCase()
  if (d.includes("EAGLE HEIGHTS") && !d.includes("MEMORIAL UNION")) return "80_eagle_west"
  if (d.includes("MEMORIAL UNION") && d.includes("EAGLE HEIGHTS")) return "80_eagle_east"
  if (d === "MEMORIAL UNION" || (d.includes("MEMORIAL UNION") && !d.includes("EAGLE")))
    return "80_uw_hospital_east"
  if (d.includes("U.W. HOSPITAL") || d.includes("UNIVERSITY BAY") || d.includes("MARSH"))
    return "80_uw_hospital_west"
  return null
}

function timepointByStopId(segments: Route80ScheduleSegments): Map<string, string> {
  const m = new Map<string, string>()
  const t2s = segments.timepoint_to_stop_ids || {}
  for (const [name, ids] of Object.entries(t2s)) {
    for (const id of ids || []) m.set(String(id), name)
  }
  return m
}

function segmentMinutesMap(segments: Route80ScheduleSegments): Map<string, number> {
  const m = new Map<string, number>()
  for (const s of segments.segments || []) {
    m.set(`${s.from_timepoint}\t${s.to_timepoint}`, s.minutes)
    m.set(`${s.to_timepoint}\t${s.from_timepoint}`, s.minutes)
  }
  return m
}

function getStopId(entry: { stop_id: string } | string): string {
  return typeof entry === "object" && entry !== null && "stop_id" in entry
    ? entry.stop_id
    : String(entry)
}

/** Per-variant: edge index i = minutes from stop_sequence[i] to stop_sequence[i+1]. */
export function buildVariantEdgeMinutes(
  variant: Route80Variant,
  segments: Route80ScheduleSegments
): number[] {
  const seq = variant.stop_sequence || []
  const tByStop = timepointByStopId(segments)
  const segMin = segmentMinutesMap(segments)
  const edgeMin: number[] = []
  if (seq.length < 2) return edgeMin

  const timepointIndices: number[] = []
  for (let i = 0; i < seq.length; i++) {
    if (tByStop.has(getStopId(seq[i]))) timepointIndices.push(i)
  }

  const getMinutes = (fromIdx: number, toIdx: number): number => {
    const fromId = getStopId(seq[fromIdx])
    const toId = getStopId(seq[toIdx])
    const fromTp = tByStop.get(fromId)
    const toTp = tByStop.get(toId)
    if (fromTp && toTp) {
      const min = segMin.get(`${fromTp}\t${toTp}`)
      if (min != null) return min
    }
    return 2
  }

  let i = 0
  while (i < seq.length - 1) {
    const nextTp = timepointIndices.find((idx) => idx > i)
    const endIdx = nextTp != null ? nextTp : seq.length - 1
    const segmentMinutes = getMinutes(i, endIdx)
    const numEdges = endIdx - i
    const minutesPerEdge = numEdges > 0 ? segmentMinutes / numEdges : 2
    for (let k = i; k < endIdx && k < seq.length - 1; k++) {
      edgeMin[k] = minutesPerEdge
    }
    if (nextTp != null) i = nextTp
    else break
  }
  while (edgeMin.length < seq.length - 1) edgeMin.push(2)
  return edgeMin
}

export function minutesFromStopToStop(
  stopSequence: { stop_id: string }[],
  edgeMinutes: number[],
  fromStopId: string,
  toStopId: string
): number | null {
  const fromIdx = stopSequence.findIndex((s) => getStopId(s) === String(fromStopId))
  const toIdx = stopSequence.findIndex((s) => getStopId(s) === String(toStopId))
  if (fromIdx < 0 || toIdx < 0 || fromIdx >= toIdx) return null
  let sum = 0
  for (let i = fromIdx; i < toIdx; i++) {
    sum += edgeMinutes[i] ?? 2
  }
  return Math.round(sum)
}

/** Minutes per stop used for average ETA when using stops-between. */
export const MINUTES_PER_STOP_AVERAGE = 1.25

/**
 * Number of segment hops (stops to pass) from bus stop to target stop, and
 * estimated minutes using a fixed average per stop (e.g. 1.5 min).
 */
export function stopsBetweenAndMinutes(
  stopSequence: { stop_id: string }[],
  fromStopId: string,
  toStopId: string,
  minutesPerStop: number = MINUTES_PER_STOP_AVERAGE
): { stopsBetween: number; minutes: number } | null {
  const fromIdx = stopSequence.findIndex((s) => getStopId(s) === String(fromStopId))
  const toIdx = stopSequence.findIndex((s) => getStopId(s) === String(toStopId))
  if (fromIdx < 0 || toIdx < 0 || fromIdx >= toIdx) return null
  const stopsBetween = toIdx - fromIdx
  return {
    stopsBetween,
    minutes: Math.round(stopsBetween * minutesPerStop),
  }
}

/** Haversine distance in km. */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * When the bus is between two stops, the geographically nearest stop is often the
 * *next* stop (e.g. Eagle Heights at Lot M), so we over-estimate progress and the
 * ETA keeps increasing until the bus actually reaches that stop. To fix: among stops
 * that are within a small factor of the minimum distance, pick the one with the
 * *smallest index* (earliest in the sequence), i.e. the last stop we've passed.
 */
const SNAP_DISTANCE_FACTOR = 1.4

export function snapVehicleToVariantSequence(
  variant: Route80Variant,
  stopsWithCoords: { stop_id: string; stop_lat: string; stop_lon: string }[],
  lat: number,
  lon: number
): string | null {
  const seq = variant.stop_sequence || []
  const coordsByStop = new Map(
    stopsWithCoords.map((s) => [
      s.stop_id,
      { lat: parseFloat(s.stop_lat), lon: parseFloat(s.stop_lon) },
    ])
  )
  let minDist = Infinity
  const candidates: { idx: number; dist: number }[] = []
  for (let i = 0; i < seq.length; i++) {
    const stopId = getStopId(seq[i])
    const c = coordsByStop.get(stopId)
    if (!c || isNaN(c.lat) || isNaN(c.lon)) continue
    const d = haversineKm(lat, lon, c.lat, c.lon)
    if (d < minDist) minDist = d
    candidates.push({ idx: i, dist: d })
  }
  if (minDist === Infinity || candidates.length === 0) return null
  const threshold = minDist * SNAP_DISTANCE_FACTOR
  const closeEnough = candidates.filter((c) => c.dist <= threshold)
  const best = closeEnough.length > 0
    ? closeEnough.reduce((a, b) => (a.idx <= b.idx ? a : b))
    : candidates.reduce((a, b) => (a.dist <= b.dist ? a : b))
  return getStopId(seq[best.idx])
}

/**
 * Loop rule: once a bus has passed the stop, it cannot be the closest again until it
 * reaches and passes Langdon at N Park (stop_id "1"). So include the bus for this stop
 * only if: (1) bus has not yet passed the stop, or (2) bus has passed the stop and has
 * already passed Langdon at Park in this variant (eastbound: Langdon at end).
 */
export function shouldIncludeBusForStop(
  variant: Route80Variant,
  busSnappedStopId: string,
  targetStopId: string
): boolean {
  const seq = variant.stop_sequence || []
  const busIdx = seq.findIndex((s) => getStopId(s) === String(busSnappedStopId))
  const stopIdx = seq.findIndex((s) => getStopId(s) === String(targetStopId))
  if (busIdx < 0 || stopIdx < 0) return false
  if (busIdx <= stopIdx) return true
  const langdonIdx = seq.findIndex((s) => getStopId(s) === LANGDON_STOP_ID)
  if (langdonIdx < 0) return false
  if (langdonIdx > stopIdx && busIdx >= langdonIdx) return true
  return false
}
