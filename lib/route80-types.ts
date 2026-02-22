export type Route80Variant = {
  id: string
  label: string
  direction: string
  destination: string
  stop_sequence: { stop_id: string; stop_name: string }[]
}

export type Route80ScheduleSegments = {
  timepoint_to_stop_ids?: Record<string, string[]>
  segments?: { from_timepoint: string; to_timepoint: string; minutes: number }[]
}
