/**
 * Weather client for Madison, WI (Open-Meteo, no API key required).
 * Exposes is_precipitating and is_very_cold for bus fullness heuristic.
 * Cache 10–15 min to avoid rate limits.
 */

const MADISON_LAT = 43.0731
const MADISON_LON = -89.4012
const OPEN_METEO_BASE = process.env.OPEN_METEO_BASE_URL ?? "https://api.open-meteo.com"
const VERY_COLD_F_FAHRENHEIT = 20
const VERY_COLD_C_CELSIUS = (VERY_COLD_F_FAHRENHEIT - 32) * (5 / 9) // ~ -6.67

// WMO weather codes: 61-67 rain, 71-77 snow, 80-82 showers, 85-86 snow showers
const PRECIPITATION_CODES = new Set([
  61, 63, 65, 66, 67, 80, 81, 82, 71, 73, 75, 77, 85, 86,
])

export type WeatherFeatures = {
  is_precipitating: boolean
  is_very_cold: boolean
  temp_f?: number
  precipitation_mm?: number
  weather_code?: number
}

let cache: { data: WeatherFeatures; fetchedAt: number } | null = null
const CACHE_MS = 10 * 60 * 1000 // 10 minutes

export async function getWeatherFeatures(): Promise<WeatherFeatures> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_MS) {
    return cache.data
  }

  const url = `${OPEN_METEO_BASE}/v1/forecast?latitude=${MADISON_LAT}&longitude=${MADISON_LON}&current=temperature_2m,precipitation,weather_code`
  const res = await fetch(url, { next: { revalidate: 600 } })
  if (!res.ok) {
    return {
      is_precipitating: false,
      is_very_cold: false,
    }
  }

  const json = await res.json()
  const cur = json?.current ?? {}
  const tempC = cur.temperature_2m
  const precip = cur.precipitation ?? 0
  const code = cur.weather_code

  const tempF = tempC != null ? tempC * (9 / 5) + 32 : undefined
  const is_very_cold = tempC != null && tempC < VERY_COLD_C_CELSIUS
  const is_precipitating = precip > 0 || (typeof code === "number" && PRECIPITATION_CODES.has(code))

  const data: WeatherFeatures = {
    is_precipitating,
    is_very_cold,
    temp_f: tempF,
    precipitation_mm: precip,
    weather_code: code,
  }

  cache = { data, fetchedAt: Date.now() }
  return data
}
