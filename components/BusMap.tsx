"use client"

import { useEffect, useState } from "react"
import type { BusVehicle } from "@/lib/types"
import type { LocationStatus } from "@/components/NearestStopCard"

type CrowdRisk = "low" | "medium" | "high"

const POLL_MS = 60 * 1000 // every minute

type BusMapProps = {
  effectiveLocation?: [number, number]
  locationStatus?: LocationStatus
  onRequestLocation?: () => void
}

export function BusMap({
  effectiveLocation,
  locationStatus,
  onRequestLocation,
}: BusMapProps = {}) {
  const [vehicles, setVehicles] = useState<BusVehicle[]>([])
  const [crowdRisk, setCrowdRisk] = useState<CrowdRisk | null>(null)
  const [MapComponent, setMapComponent] = useState<
    React.ComponentType<{
      vehicles: BusVehicle[]
      crowdRisk: CrowdRisk | null
      effectiveLocation?: [number, number]
      locationStatus?: LocationStatus
      onRequestLocation?: () => void
    }> | null
  >(null)

  const fetchData = () => {
    fetch("/api/buses")
      .then((r) => r.json())
      .then((d) => setVehicles(d.vehicles || []))

    fetch("/api/crowding?route=80")
      .then((r) => r.json())
      .then((d) => {
        if (d.crowd_risk) setCrowdRisk(d.crowd_risk)
      })
      .catch(() => setCrowdRisk(null))
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
      crowdRisk={crowdRisk}
      effectiveLocation={effectiveLocation}
      locationStatus={locationStatus}
      onRequestLocation={onRequestLocation}
    />
  )
}
