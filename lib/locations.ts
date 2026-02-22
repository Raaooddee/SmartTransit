/**
 * Known UW–Madison locations: uw_buildings + extra + downtown Madison + every UW building & housing (uwBuildingsAndHousing).
 */
import uwBuildings from "@/data/uw_buildings.json"
import downtownMadisonBuildings from "@/data/downtown_madison_buildings.json"
import uwBuildingsAndHousing from "@/data/uw_buildings_and_housing.json"

export type LocationEntry = { name: string; lat: number; lon: number }

type UwBuilding = { name: string; lat: number; lon: number }
const UW_BUILDINGS = uwBuildings as UwBuilding[]

function titleCase(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
}

/** Additional UW buildings / aliases not in OSM or uw_buildings (add only if name not already present). */
const EXTRA_UW_LOCATIONS: LocationEntry[] = [
  { name: "College Library", lat: 43.0768, lon: -89.3985 },
  { name: "Eagle Heights Building 101", lat: 43.0785, lon: -89.434 },
  { name: "Helen C. White Hall", lat: 43.0768, lon: -89.3985 },
  { name: "Memorial Union", lat: 43.0765, lon: -89.3962 },
  { name: "UW Medical Foundation Centennial Building", lat: 43.0754164, lon: -89.4330399 },
  { name: "Van Vleck Hall", lat: 43.0748474, lon: -89.4048878 },
  { name: "Veterans Administration Hospital", lat: 43.0745238, lon: -89.4309833 },
  { name: "Veterinary Medicine North", lat: 43.0762, lon: -89.4203 },
  { name: "Vilas Hall", lat: 43.0726401, lon: -89.399794 },
  { name: "Waisman Center", lat: 43.0783873, lon: -89.434289 },
  { name: "Walnut Street Greenhouse", lat: 43.0760167, lon: -89.4240759 },
  { name: "Walnut Street Heating and Cooling Plant", lat: 43.074329, lon: -89.4242948 },
  { name: "WARF Office Building", lat: 43.076288, lon: -89.42598 },
  { name: "Water Science and Engineering Laboratory", lat: 43.0771024, lon: -89.4018671 },
  { name: "Weeks Hall for Geological Sciences", lat: 43.0732, lon: -89.404 },
  { name: "Wisconsin Institutes for Medical Research", lat: 43.0779807, lon: -89.4316237 },
  { name: "Wisconsin Veterinary Diagnostic Laboratory", lat: 43.074427, lon: -89.4214047 },
]

/** All locations: uw_buildings (title-case) + extra list + downtown Madison buildings; dedupe by name. */
const existingNames = new Set<string>()
const schoolBuildingEntries: LocationEntry[] = UW_BUILDINGS.map((b) => ({
  name: titleCase(b.name),
  lat: b.lat,
  lon: b.lon,
}))
for (const e of schoolBuildingEntries) existingNames.add(e.name)
const extraEntries: LocationEntry[] = EXTRA_UW_LOCATIONS.filter(
  (e: LocationEntry) => !existingNames.has(e.name)
)
for (const e of extraEntries) existingNames.add(e.name)
const downtownEntries: LocationEntry[] = (
  downtownMadisonBuildings as LocationEntry[]
).filter((e: LocationEntry) => !existingNames.has(e.name))
for (const e of downtownEntries) existingNames.add(e.name)
const housingEntries: LocationEntry[] = (uwBuildingsAndHousing as LocationEntry[]).filter(
  (e: LocationEntry) => !existingNames.has(e.name)
)

const ALL_LOCATION_ENTRIES: LocationEntry[] = [
  ...schoolBuildingEntries,
  ...extraEntries,
  ...downtownEntries,
  ...housingEntries,
]

export const KNOWN_LOCATIONS = ALL_LOCATION_ENTRIES.map((e: LocationEntry) => e.name) as readonly string[]

export const LOCATION_COORDINATES: Record<string, { lat: number; lon: number }> = Object.fromEntries(
  ALL_LOCATION_ENTRIES.map((e: LocationEntry) => [e.name, { lat: e.lat, lon: e.lon }])
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
