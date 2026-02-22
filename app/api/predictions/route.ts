import { NextRequest, NextResponse } from "next/server"
import {
  inferVariantFromDes,
  snapVehicleToVariantSequence,
  shouldIncludeBusForStop,
  stopsBetweenAndMinutes,
  MINUTES_PER_STOP_AVERAGE,
} from "@/lib/route80-eta"
import route80Variants from "@/data/route80_variants.json"
import route80Stops from "@/data/route80_stops.json"
import type { Route80Variant } from "@/lib/route80-types"

const MADISON_METRO_HOST = "metromap.cityofmadison.com"
const BASE_URL = `http://${MADISON_METRO_HOST}/bustime/api/v3`
const ROUTE = "80"
const MAX_STOPS_PER_REQUEST = 10

export type PredictionAtStop = {
  vid?: string
  stpid?: string
  stpnm?: string
  prdctdn?: string
  rtdir?: string
  des?: string
  estimated?: boolean
  /** Number of stops between the bus and this stop (when using estimated ETA). */
  stops_between?: number
  [k: string]: unknown
}

type VehicleWithDes = { vid: string; lat?: string; lon?: string; des?: string; rtdir?: string }

async function fetchVehiclesRoute80(apiKey: string): Promise<VehicleWithDes[]> {
  const res = await fetch(
    `${BASE_URL}/getvehicles?key=${apiKey}&format=json&rt=80&tmres=s`,
    { next: { revalidate: 60 } }
  )
  if (!res.ok) return []
  const data = await res.json()
  const bustime = data["bustime-response"] || {}
  let vehicles: VehicleWithDes[] = bustime.vehicle ?? []
  if (!Array.isArray(vehicles) && typeof vehicles === "object") vehicles = [vehicles]
  return vehicles.filter((v) => v && v.vid)
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.MADISON_METRO_API_KEY
  const { searchParams } = new URL(request.url)
  const stpidParam = searchParams.get("stpid")
  const rt = searchParams.get("rt") ?? ROUTE

  const stopIds = stpidParam
    ? stpidParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, MAX_STOPS_PER_REQUEST)
    : []

  if (stopIds.length === 0) {
    return NextResponse.json({ predictions: [] })
  }

  if (!apiKey) {
    return NextResponse.json({ predictions: [] })
  }

  try {
    const stpidQuery = stopIds.join(",")
    const res = await fetch(
      `${BASE_URL}/getpredictions?key=${apiKey}&format=json&stpid=${encodeURIComponent(stpidQuery)}&rt=${encodeURIComponent(rt)}&tmres=s`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return NextResponse.json({ predictions: [] })
    const data = await res.json()
    const bustime = data["bustime-response"] || {}
    let prd: PredictionAtStop[] = bustime.prd ?? []
    if (!Array.isArray(prd) && typeof prd === "object") prd = [prd]
    prd = prd.filter((p) => p != null)

    if (prd.length > 0) {
      const sorted = prd.sort((a, b) => {
        const ma = Number(a.prdctdn) ?? Infinity
        const mb = Number(b.prdctdn) ?? Infinity
        return ma - mb
      })
      return NextResponse.json({ predictions: sorted })
    }

    if (rt !== "80") {
      return NextResponse.json({ predictions: [] })
    }

    const vehicles = await fetchVehiclesRoute80(apiKey)
    const variants = route80Variants as Route80Variant[]
    const stopsWithCoords = route80Stops as {
      stop_id: string
      stop_name: string
      stop_lat: string
      stop_lon: string
    }[]
    const variantById = new Map(variants.map((v) => [v.id, v]))
    const stopIdToName = new Map(stopsWithCoords.map((s) => [s.stop_id, s.stop_name]))
    const synthetic: PredictionAtStop[] = []

    for (const v of vehicles) {
      const variantId = inferVariantFromDes(v.des)
      if (!variantId) continue
      const variant = variantById.get(variantId)
      if (!variant) continue
      const lat = parseFloat(v.lat ?? "")
      const lon = parseFloat(v.lon ?? "")
      if (isNaN(lat) || isNaN(lon)) continue
      const fromStopId = snapVehicleToVariantSequence(variant, stopsWithCoords, lat, lon)
      if (!fromStopId) continue

      for (const stpid of stopIds) {
        if (!shouldIncludeBusForStop(variant, fromStopId, stpid)) continue
        const result = stopsBetweenAndMinutes(
          variant.stop_sequence,
          fromStopId,
          stpid,
          MINUTES_PER_STOP_AVERAGE
        )
        if (result == null || result.stopsBetween <= 0) continue
        const stpnm = stopIdToName.get(stpid) ?? ""
        synthetic.push({
          vid: v.vid,
          stpid,
          stpnm,
          prdctdn: String(result.minutes),
          rtdir: v.rtdir ?? "",
          des: v.des ?? "",
          estimated: true,
          stops_between: result.stopsBetween,
        })
      }
    }

    const sorted = synthetic.sort((a, b) => {
      const ma = Number(a.prdctdn) ?? Infinity
      const mb = Number(b.prdctdn) ?? Infinity
      return ma - mb
    })

    if (sorted.length === 0 && vehicles.length >= 1) {
      return NextResponse.json({
        predictions: [],
        no_bus_for_30_min: true,
      })
    }

    return NextResponse.json({ predictions: sorted })
  } catch {
    return NextResponse.json({ predictions: [] })
  }
}
