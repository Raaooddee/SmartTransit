/**
 * Walk vs bus: resolve building name to coords, walking time, and recommendation.
 */

type Building = { name: string; lat: number; lon: number }

/** Normalize location string for matching (lowercase, collapse spaces). */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

/** Resolve a schedule location string to coordinates using UW buildings list. */
export function resolveBuildingCoords(
  location: string,
  buildings: Building[]
): { lat: number; lon: number } | null {
  if (!location || typeof location !== "string") return null
  const norm = normalize(location)
  if (!norm) return null
  for (const b of buildings) {
    const name = normalize(b.name)
    if (norm.includes(name) || name.includes(norm)) return { lat: b.lat, lon: b.lon }
  }
  return null
}

/** Haversine distance in km. */
function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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

/** Walking speed ~5 km/h; path factor 1.2 for non-straight paths. */
const WALK_KM_PER_MIN = (5 / 60) * (1 / 1.2)

/** Estimate walking time in minutes between two points. */
export function walkMinutes(
  from: [number, number],
  to: [number, number]
): number {
  const km = haversineKm(from[0], from[1], to[0], to[1])
  return Math.max(1, Math.round(km / WALK_KM_PER_MIN))
}
