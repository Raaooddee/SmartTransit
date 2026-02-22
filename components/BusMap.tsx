"use client"

import { useEffect, useState } from "react"
import type { BusVehicle } from "@/lib/types"
import type { LocationStatus } from "@/components/NearestStopCard"

type CrowdRisk = "low" | "medium" | "high"
/** Map from stop identifier (next_stop_name or next_stop_id) to crowd risk */
export type CrowdRiskByStop = Record<string, CrowdRisk>

const POLL_MS = 60 * 1000 // every minute

export type MapDestination = {
  name: string
  location: string
  coords: { lat: number; lon: number }
}

export type LeaveFrom = { coords: { lat: number; lon: number }; label: string }

type BusMapProps = {
  effectiveLocation?: [number, number]
  locationStatus?: LocationStatus
  onRequestLocation?: () => void
  destination?: MapDestination | null
  walkingRoute?: [number, number][] | null
  leaveFrom?: LeaveFrom | null
}

export function BusMap({
  effectiveLocation,
  locationStatus,
  onRequestLocation,
  destination,
  walkingRoute,
  leaveFrom,
}: BusMapProps = {}) {
  const [vehicles, setVehicles] = useState<BusVehicle[]>([])
  const [crowdRiskByStop, setCrowdRiskByStop] = useState<CrowdRiskByStop>({})
  const [MapComponent, setMapComponent] = useState<
    React.ComponentType<{
      vehicles: BusVehicle[]
      crowdRiskByStop: CrowdRiskByStop
      effectiveLocation?: [number, number]
      locationStatus?: LocationStatus
      onRequestLocation?: () => void
      destination?: MapDestination | null
      walkingRoute?: [number, number][] | null
      leaveFrom?: LeaveFrom | null
    }> | null
  >(null)

  const fetchData = () => {
    fetch("/api/buses")
      .then((r) => r.json())
      .then((d) => {
        const v = (d.vehicles || []) as BusVehicle[]
        setVehicles(v)
        const stopKeys = [
          ...new Set(
            v
              .map((b) => (b.next_stop_name ?? b.next_stop_id ?? "").trim())
              .filter(Boolean)
          ),
        ]
        if (stopKeys.length === 0) {
          setCrowdRiskByStop({})
          return
        }
        Promise.all(
          stopKeys.map((stop) =>
            fetch(
              `/api/crowding?route=80&stop=${encodeURIComponent(stop)}`
            ).then((res) => res.json())
          )
        )
          .then((results) => {
            const map: CrowdRiskByStop = {}
            stopKeys.forEach((key, i) => {
              if (results[i]?.crowd_risk) map[key] = results[i].crowd_risk
            })
            setCrowdRiskByStop(map)
          })
          .catch(() => setCrowdRiskByStop({}))
      })
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, POLL_MS)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    import("./BusMapInner").then((mod) => setMapComponent(() => mod.BusMapInner))
  }, [])

  if (!MapComponent) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#F7F7F7] text-gray-500">
        Loading map…
      </div>
    )
  }

  return (
    <MapComponent
      vehicles={vehicles}
      crowdRiskByStop={crowdRiskByStop}
      effectiveLocation={effectiveLocation}
      locationStatus={locationStatus}
      onRequestLocation={onRequestLocation}
      destination={destination}
      walkingRoute={walkingRoute}
      leaveFrom={leaveFrom}
    />
  )
}
