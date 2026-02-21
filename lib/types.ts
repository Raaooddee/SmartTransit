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

/** Next Class Card - human-readable rendering of one JSON response */
export type NextClassResponse = {
  next_class: string
  leave_in: string
  updated_departure_time: string
  crowd_risk: "low" | "medium" | "high"
  ghost_risk: "low" | "high"
  live_updated: string
}

/** Madison Metro API vehicle (from getvehicles) */
export type BusVehicle = {
  vid: string
  rt: string
  lat: string
  lon: string
  spd?: string
  tmstmp?: string
  psgld?: string
}

/** A single class or event in the user's schedule */
export type ScheduleClass = {
  id: string
  type: "class" | "event"
  name: string
  location: string
  startTime: string
  endTime: string
  days: number[]
}