/**
 * Known UW–Madison locations: all campus buildings + UW-area apartments.
 * Data and coordinates from lib/locationCoordinates.ts.
 */
import type { LocationEntry } from "./locationCoordinates"
import { LOCATION_ENTRIES } from "./locationCoordinates"

export const KNOWN_LOCATIONS = LOCATION_ENTRIES.map((e: LocationEntry) => e.name) as readonly string[]

export const LOCATION_COORDINATES: Record<string, { lat: number; lon: number }> = Object.fromEntries(
  LOCATION_ENTRIES.map((e: LocationEntry) => [e.name, { lat: e.lat, lon: e.lon }])
)

export function getLocationCoordinates(name: string): { lat: number; lon: number } | undefined {
  return LOCATION_COORDINATES[name]
}

export function getLocationGoogleMapsUrl(name: string): string {
  const coords = getLocationCoordinates(name)
  if (coords) return `https://www.google.com/maps?q=${coords.lat},${coords.lon}`
  const query = encodeURIComponent(`${name.trim()} Madison WI`)
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}

export function getLocationGoogleSearchUrl(name: string): string {
  const query = encodeURIComponent(`${name.trim()} Madison WI`)
  return `https://www.google.com/search?q=${query}`
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
}

/** Levenshtein (edit) distance between two strings */
function editDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      )
    }
  }
  return dp[m][n]
}

/**
 * Returns a score for how well the query matches the location (higher = better).
 * Uses contains, then edit distance for fuzzy typo tolerance.
 */
function matchScore(queryNorm: string, location: string): number {
  const locNorm = normalize(location)
  if (queryNorm === locNorm) return 100
  if (locNorm.includes(queryNorm)) return 80 - queryNorm.length * 0.5 // prefer shorter queries that match
  if (queryNorm.includes(locNorm)) return 60
  const dist = editDistance(queryNorm, locNorm)
  const maxLen = Math.max(queryNorm.length, locNorm.length)
  if (maxLen === 0) return 0
  const similarity = 1 - dist / maxLen
  if (similarity >= 0.5) return similarity * 50
  return 0
}

/**
 * Returns known locations that fuzzy-match the query, best first.
 * If query is empty, returns []. User can still enter free text.
 */
export function fuzzyMatchLocations(query: string, limit = 6): string[] {
  const q = normalize(query)
  if (q.length === 0) return []
  const scored = KNOWN_LOCATIONS.map((loc) => ({
    location: loc,
    score: matchScore(q, loc),
  }))
  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.location)
}

/**
 * If the input closely matches one known location, return that canonical name; else return the original.
 * Use when blurring the field to normalize slight misspellings.
 */
export function bestMatchOrInput(input: string): string {
  const q = normalize(input)
  if (q.length === 0) return input.trim()
  const scored = KNOWN_LOCATIONS.map((loc) => ({
    location: loc,
    score: matchScore(q, loc),
  }))
  const best = scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score)[0]
  if (best && best.score >= 40) return best.location
  return input.trim()
}
