"use client"

import { useState, useEffect, useMemo } from "react"
import route80Stops from "@/data/route80_stops.json"
import { FALLBACK_LABEL } from "@/lib/constants"
import { MapPin, Bus } from "lucide-react"

type RouteStop = { stop_id: string; stop_name: string; stop_lat: string; stop_lon: string }
const STOPS = route80Stops as RouteStop[]

export type LocationStatus = "loading" | "granted" | "denied" | "fallback"

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function nearestStop(lat: number, lon: number): RouteStop | null {
  if (STOPS.length === 0) return null
  let best = STOPS[0]
  let bestDist = Infinity
  for (const stop of STOPS) {
    const slat = parseFloat(stop.stop_lat)
    const slon = parseFloat(stop.stop_lon)
    if (isNaN(slat) || isNaN(slon)) continue
    const d = haversineKm(lat, lon, slat, slon)
    if (d < bestDist) {
      bestDist = d
      best = stop
    }
  }
  return best
}

type Prediction = {
  vid?: string
  prdctdn?: string
  stpnm?: string
  des?: string
  rtdir?: string
  estimated?: boolean
  stops_between?: number
}

function directionLabel(p: Prediction): string {
  if (p.des && String(p.des).trim()) return String(p.des).trim()
  if (p.rtdir && String(p.rtdir).trim()) return String(p.rtdir).trim()
  return ""
}

type Props = {
  effectiveLocation: [number, number]
  locationStatus: LocationStatus
}

const POLL_MS = 60 * 1000

export function NearestStopCard({ effectiveLocation, locationStatus }: Props) {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [predictionsError, setPredictionsError] = useState(false)

  const nearest = useMemo(() => {
    const [lat, lon] = effectiveLocation
    return nearestStop(lat, lon)
  }, [effectiveLocation])

  useEffect(() => {
    if (!nearest?.stop_id) {
      setPredictions([])
      return
    }
    const fetchPredictions = () => {
      fetch(`/api/predictions?stpid=${encodeURIComponent(nearest.stop_id)}&rt=80`)
        .then((r) => r.json())
        .then((d) => {
          setPredictions(Array.isArray(d.predictions) ? d.predictions : [])
          setPredictionsError(false)
        })
        .catch(() => {
          setPredictions([])
          setPredictionsError(true)
        })
    }
    fetchPredictions()
    const interval = setInterval(fetchPredictions, POLL_MS)
    return () => clearInterval(interval)
  }, [nearest?.stop_id])

  const firstBus = predictions.length > 0 ? predictions[0] : null

  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#C5050C]">
        Nearest stop & bus
      </h2>

      {locationStatus === "loading" && (
        <p className="text-sm text-gray-500">Getting location…</p>
      )}

      {(locationStatus === "denied" || locationStatus === "fallback") && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-900">
          {locationStatus === "denied" ? (
            <p>
              Location is needed to show your nearest stop and bus. Please enable
              location access in your browser.
            </p>
          ) : (
            <p>Using default location: {FALLBACK_LABEL}.</p>
          )}
        </div>
      )}

      {locationStatus !== "loading" && (
        <>
          {nearest ? (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm text-gray-700">
                <MapPin className="h-4 w-4 shrink-0 text-[#C5050C]" />
                <span>
                  <strong>Nearest stop:</strong> {nearest.stop_name}
                </span>
              </p>
              <p className="flex items-center gap-2 text-sm text-gray-700">
                <Bus className="h-4 w-4 shrink-0 text-[#C5050C]" />
                <span>
                  {firstBus?.vid != null && firstBus.prdctdn != null ? (
                    <>
                      <strong>Bus predicted at this stop:</strong> Bus {firstBus.vid}{" "}
                      in {firstBus.prdctdn} min
                      {firstBus.stops_between != null && firstBus.stops_between > 0 && (
                        <span className="text-gray-600">
                          {" "}
                          ({firstBus.stops_between} stop
                          {firstBus.stops_between === 1 ? "" : "s"})
                        </span>
                      )}
                      {firstBus.estimated && (
                        <span className="text-amber-700"> (estimated)</span>
                      )}
                      {directionLabel(firstBus) && (
                        <span className="text-gray-600">
                          {" "}
                          — toward {directionLabel(firstBus)}
                        </span>
                      )}
                    </>
                  ) : predictionsError ? (
                    "Could not load bus predictions."
                  ) : (
                    "No bus predicted at this stop."
                  )}
                </span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No route 80 stops available.</p>
          )}
        </>
      )}
    </div>
  )
}
