"use client"

import { useEffect, useState } from "react"
import type { BusVehicle } from "@/lib/types"

const MADISON_CENTER = { lat: 43.0731, lng: -89.4012 } as const

export function BusMap() {
  const [vehicles, setVehicles] = useState<BusVehicle[]>([])
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{ vehicles: BusVehicle[] }> | null>(null)

  const fetchBuses = () => {
    fetch("/api/buses")
      .then((r) => r.json())
      .then((d) => setVehicles(d.vehicles || []))
  }

  useEffect(() => {
    fetchBuses()
    const interval = setInterval(fetchBuses, 5 * 60 * 1000) // every 5 minutes
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

  return <MapComponent vehicles={vehicles} />
}
