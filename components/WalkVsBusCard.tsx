"use client"

import { useState, useEffect } from "react"
import { Footprints, Bus } from "lucide-react"

type WalkVsBusData = {
  ok: boolean
  walkMinutes: number
  walkArrival: string
  busMinutes: number | null
  busArrival: string | null
  recommendation: "walk" | "bus" | "unknown"
  destinationResolved: boolean
}

type Props = {
  effectiveLocation: [number, number]
  /** Next class/event to show walk vs bus for (must have location). */
  nextItem: { name: string; location: string } | null
}

export function WalkVsBusCard({ effectiveLocation, nextItem }: Props) {
  const [data, setData] = useState<WalkVsBusData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!nextItem?.location?.trim()) {
      setData(null)
      return
    }
    setLoading(true)
    setError(false)
    const [lat, lon] = effectiveLocation
    const params = new URLSearchParams({
      userLat: String(lat),
      userLon: String(lon),
      destBuilding: nextItem.location.trim(),
    })
    fetch(`/api/walk-vs-bus?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [effectiveLocation, nextItem?.location, nextItem?.name])

  if (!nextItem?.location?.trim()) return null

  return (
    <div className="rounded-xl bg-gray-50/50 p-0">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#C5050C]">
        Get to {nextItem.name}
      </h2>
      <p className="mb-3 text-xs text-gray-600">
        {nextItem.location}
      </p>

      {loading && (
        <p className="text-sm text-gray-500">Checking walk vs bus…</p>
      )}
      {error && (
        <p className="text-sm text-amber-700">Could not load walk vs bus.</p>
      )}
      {!loading && !error && data?.ok && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="flex items-center gap-1.5 text-gray-700">
              <Footprints className="h-4 w-4 text-[#C5050C]" />
              <strong>Walk:</strong> {data.walkMinutes} min (arrive {data.walkArrival})
            </span>
            {data.busMinutes != null && data.busArrival != null && (
              <span className="flex items-center gap-1.5 text-gray-700">
                <Bus className="h-4 w-4 text-[#C5050C]" />
                <strong>Bus:</strong> {data.busMinutes} min (arrive {data.busArrival})
              </span>
            )}
          </div>
          {data.recommendation !== "unknown" && (
            <p className="rounded-lg bg-[#C5050C]/10 px-3 py-2 text-sm font-medium text-[#C5050C]">
              We recommend: <strong>{data.recommendation === "bus" ? "Take the bus" : "Walk"}</strong>
            </p>
          )}
          {data.recommendation === "unknown" && data.busMinutes == null && (
            <p className="text-xs text-gray-500">No bus prediction for this route right now. Walking is an option.</p>
          )}
        </div>
      )}
      {!loading && !error && data && !data.ok && (
        <p className="text-xs text-gray-500">We don’t have coordinates for &quot;{nextItem.location}&quot;. Use a building name we know (e.g. Van Vleck Hall, Memorial Union, Engineering Hall).</p>
      )}
    </div>
  )
}
