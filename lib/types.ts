export type PredictionResponse = {
  route: string
  stop_name: string
  arrive_by: string
  recommended_departure: string
  reliability: { score: number; explanation: string }
  ghost_risk: { prob: number; flag: boolean }
  crowding: { level: "low" | "medium" | "high"; prob_full: number }
  weather_impact: { delay_minutes_p50: number; delay_minutes_p90: number }
  live: { vehicle_count: number; next_eta_minutes: number }
}