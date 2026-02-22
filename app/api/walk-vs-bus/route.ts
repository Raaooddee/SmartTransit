import { NextRequest, NextResponse } from "next/server"
import { resolveBuildingCoords, walkMinutes } from "@/lib/walk-vs-bus"
import { getLocationCoordinates } from "@/lib/locations"
import { stopsBetweenAndMinutes, MINUTES_PER_STOP_AVERAGE } from "@/lib/route80-eta"
import type { Route80Variant } from "@/lib/route80-types"
import route80Stops from "@/data/route80_stops.json"
import route80Variants from "@/data/route80_variants.json"
import uwBuildings from "@/data/uw_buildings.json"

type Stop = { stop_id: string; stop_name: string; stop_lat: string; stop_lon: string }
const STOPS = route80Stops as Stop[]
const VARIANTS = route80Variants as Route80Variant[]
const BUILDINGS = uwBuildings as { name: string; lat: number; lon: number }[]

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function nearestStopId(lat: number, lon: number): string | null {
  let best: Stop | null = null
  let bestDist = Infinity
  for (const s of STOPS) {
    const slat = parseFloat(s.stop_lat)
    const slon = parseFloat(s.stop_lon)
    if (isNaN(slat) || isNaN(slon)) continue
    const d = haversineKm(lat, lon, slat, slon)
    if (d < bestDist) {
      bestDist = d
      best = s
    }
  }
  return best?.stop_id ?? null
}

function busTravelMinutes(userStopId: string, destStopId: string): number | null {
  if (userStopId === destStopId) return 0
  for (const v of VARIANTS) {
    const seq = v.stop_sequence ?? []
    const result = stopsBetweenAndMinutes(
      seq,
      userStopId,
      destStopId,
      MINUTES_PER_STOP_AVERAGE
    )
    if (result != null && result.minutes >= 0) return result.minutes
  }
  return null
}

function addMinutesToNow(minutes: number): string {
  const d = new Date()
  d.setMinutes(d.getMinutes() + minutes)
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
}

export type WalkVsBusResponse = {
  ok: boolean
  walkMinutes: number
  walkArrival: string
  busMinutes: number | null
  busArrival: string | null
  recommendation: "walk" | "bus" | "unknown"
  destinationResolved: boolean
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userLat = parseFloat(searchParams.get("userLat") ?? "")
  const userLon = parseFloat(searchParams.get("userLon") ?? "")
  const destLatParam = searchParams.get("destLat")
  const destLonParam = searchParams.get("destLon")
  const destBuilding = searchParams.get("destBuilding")

  let destLat: number
  let destLon: number

  if (destLatParam != null && destLonParam != null) {
    destLat = parseFloat(destLatParam)
    destLon = parseFloat(destLonParam)
  } else if (destBuilding) {
    const knownCoords = getLocationCoordinates(destBuilding)
    const coords = knownCoords ?? resolveBuildingCoords(destBuilding, BUILDINGS)
    if (!coords) {
      return NextResponse.json({
        ok: false,
        walkMinutes: 0,
        walkArrival: "",
        busMinutes: null,
        busArrival: null,
        recommendation: "unknown",
        destinationResolved: false,
      } satisfies WalkVsBusResponse)
    }
    destLat = coords.lat
    destLon = coords.lon
  } else {
    return NextResponse.json(
      { error: "Provide destLat+destLon or destBuilding" },
      { status: 400 }
    )
  }

  if (isNaN(userLat) || isNaN(userLon)) {
    return NextResponse.json(
      { error: "Provide userLat and userLon" },
      { status: 400 }
    )
  }

  const walkMin = walkMinutes([userLat, userLon], [destLat, destLon])
  const walkArrival = addMinutesToNow(walkMin)

  const userStopId = nearestStopId(userLat, userLon)
  const destStopId = nearestStopId(destLat, destLon)

  let busMinutes: number | null = null
  let busArrival: string | null = null

  if (userStopId && destStopId) {
    const origin = request.nextUrl.origin
    const res = await fetch(
      `${origin}/api/predictions?stpid=${encodeURIComponent(userStopId)}&rt=80`
    )
    const data = await res.json().catch(() => ({}))
    const predictions = Array.isArray(data.predictions) ? data.predictions : []
    const first = predictions[0]
    const waitMin = first?.prdctdn != null ? parseInt(String(first.prdctdn), 10) : null
    const travelMin = busTravelMinutes(userStopId, destStopId)

    if (waitMin != null && !isNaN(waitMin) && travelMin != null) {
      const walkFromStopToDest = 2
      busMinutes = waitMin + travelMin + walkFromStopToDest
      busArrival = addMinutesToNow(busMinutes)
    }
  }

  let recommendation: "walk" | "bus" | "unknown" = "unknown"
  if (busMinutes != null) {
    recommendation = busMinutes < walkMin ? "bus" : "walk"
  }

  return NextResponse.json({
    ok: true,
    walkMinutes: walkMin,
    walkArrival,
    busMinutes,
    busArrival,
    recommendation,
    destinationResolved: true,
  } satisfies WalkVsBusResponse)
}
