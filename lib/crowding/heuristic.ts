/**
 * Phase 1 rule-based bus fullness model.
 * Combines time, weather, and stop density into a 0–1 score and maps to crowd_risk + crowding.
 */

import type { WeatherFeatures } from "./weather"
import { getWeatherFeatures } from "./weather"
import { getTimeFeatures, getStopDensityFeature } from "./features"

export type CrowdLevel = "low" | "medium" | "high"

export type CrowdingResult = {
  crowd_risk: CrowdLevel
  crowding: { level: CrowdLevel; prob_full: number }
  /** Raw 0–1 score for debugging/tuning */
  score?: number
}

const DENSITY_WEIGHT: Record<string, number> = {
  low: 0.1,
  medium: 0.2,
  high: 0.35,
}

const THRESHOLD_LOW = 0.33
const THRESHOLD_HIGH = 0.66

function scoreToLevel(score: number): CrowdLevel {
  if (score <= THRESHOLD_LOW) return "low"
  if (score <= THRESHOLD_HIGH) return "medium"
  return "high"
}

/**
 * Compute crowding from features. Score in [0, 1], then map to levels.
 */
export function computeCrowdingFromFeatures(
  timeFeatures: ReturnType<typeof getTimeFeatures>,
  weather: WeatherFeatures,
  stopDensity: "high" | "medium" | "low"
): CrowdingResult {
  let score = 0.15 // base

  // Time: weekend = lower, rush/dismissal = higher
  if (timeFeatures.is_weekend) {
    score += 0.05
  } else {
    if (timeFeatures.in_rush_hour) score += 0.25
    if (timeFeatures.in_dismissal_window) score += 0.2
  }

  // Weather: precip or very cold → more riders
  if (weather.is_precipitating) score += 0.2
  if (weather.is_very_cold) score += 0.15

  // Stop density
  score += DENSITY_WEIGHT[stopDensity] ?? DENSITY_WEIGHT.medium

  score = Math.min(1, Math.max(0, score))

  const level = scoreToLevel(score)
  const prob_full = Math.round(score * score * 100) / 100 // slight curve

  return {
    crowd_risk: level,
    crowding: { level, prob_full },
    score,
  }
}

export type GetCrowdingOptions = {
  stopNameOrId?: string
  now?: Date
  weather?: WeatherFeatures | null
}

const DEFAULT_STOP = "University & Lake"

/**
 * Get crowding prediction for a stop. Fetches weather if not provided.
 */
export async function getCrowding(options: GetCrowdingOptions = {}): Promise<CrowdingResult> {
  const stop = options.stopNameOrId?.trim() || DEFAULT_STOP
  const now = options.now ?? new Date()

  const timeFeatures = getTimeFeatures(now)
  const stopDensity = getStopDensityFeature(stop)
  const weather = options.weather ?? (await getWeatherFeatures())

  return computeCrowdingFromFeatures(timeFeatures, weather, stopDensity)
}
