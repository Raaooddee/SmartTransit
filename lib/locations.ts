/**
 * Known UW–Madison locations for fuzzy matching.
 * User input is matched against these so slight misspellings still work.
 */
export const KNOWN_LOCATIONS = [
  "Engineering Hall",
  "Engineering Centers Building",
  "Memorial Union",
  "Union South",
  "Van Vleck Hall",
  "Computer Sciences",
  "Computer Sciences and Statistics",
  "Grainger Hall",
  "Business School",
  "Education Building",
  "Social Science Building",
  "Humanities Building",
  "Chadbourne Hall",
  "Witte Hall",
  "Sellery Hall",
  "Dejope Hall",
  "Wendt Commons",
  "Steenbock Library",
  "College Library",
  "Memorial Library",
  "Mechanical Engineering Building",
  "Materials Science and Engineering",
  "Chemistry Building",
  "Psychology Building",
  "Agricultural Hall",
  "Bascom Hall",
  "Science Hall",
  "Ingraham Hall",
  "Sterling Hall",
  "Birge Hall",
  "Brogden Psychology",
  "Vilas Hall",
  "Medical Sciences Center",
  "Health Sciences Learning Center",
  "UW Hospital",
  "Union South",
  "Nick Recreation",
  "Bakke Recreation",
  "Kohl Center",
  "Camp Randall",
] as const

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
