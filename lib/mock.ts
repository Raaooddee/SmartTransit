import { PredictionResponse, NextClassResponse } from "./types"

export const mockPrediction: PredictionResponse = {
  route: "80",
  stop_name: "University & Lake",
  arrive_by: "2026-02-21T09:30:00-06:00",
  recommended_departure: "2026-02-21T09:02:00-06:00",
  reliability: { score: 92, explanation: "Historically on-time at this hour." },
  ghost_risk: { prob: 0.12, flag: false },
  crowding: { level: "medium", prob_full: 0.35 },
  weather_impact: { delay_minutes_p50: 3, delay_minutes_p90: 9 },
  live: { vehicle_count: 2, next_eta_minutes: 8 }
}

export const mockNextClass: NextClassResponse = {
  next_class: "CS — 9:30 @ Engineering Hall",
  leave_in: "6–12 minutes (departure window)",
  updated_departure_time: "9:02 AM",
  crowd_risk: "high",
  ghost_risk: 12.5, // 12.5% chance of ghost bus
  live_updated: "12:41:18"
}