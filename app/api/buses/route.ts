import { NextResponse } from "next/server"
import type { BusVehicle } from "@/lib/types"
import route80Stops from "@/data/route80_stops.json"

const MADISON_METRO_HOST = "metromap.cityofmadison.com"
const BASE_URL = `http://${MADISON_METRO_HOST}/bustime/api/v3`
const ROUTES = "80"
const MAX_VID_PER_PREDICTION_REQUEST = 10

type Route80Stop = { stop_id: string; stop_name: string; stop_lat: string; stop_lon: string }
const ROUTE80_STOPS = route80Stops as Route80Stop[]

/** Mock bus positions when API key is not set (UW-Madison campus area) */
const MOCK_BUSES: BusVehicle[] = [
  { vid: "1", rt: "80", lat: "43.0731", lon: "-89.4012", spd: "12", tmstmp: "", psgld: "" },
  { vid: "2", rt: "80", lat: "43.0765", lon: "-89.3980", spd: "8", tmstmp: "", psgld: "" },
  { vid: "3", rt: "80", lat: "43.0702", lon: "-89.4050", spd: "15", tmstmp: "", psgld: "" },
]

/** Add mock next stop from route 80 stops for demo when no API key */
function addMockNextStop(vehicles: BusVehicle[]): BusVehicle[] {
  if (ROUTE80_STOPS.length === 0) return vehicles
  return vehicles.map((v, i) => ({
    ...v,
    next_stop_id: ROUTE80_STOPS[i % ROUTE80_STOPS.length].stop_id,
    next_stop_name: ROUTE80_STOPS[i % ROUTE80_STOPS.length].stop_name,
    next_stop_minutes: String((i % 5) + 1),
  }))
}

type Prediction = { vid?: string; stpid?: string; stpnm?: string; prdctdn?: string }

async function fetchPredictionsForVids(
  apiKey: string,
  vids: string[]
): Promise<Map<string, { next_stop_id: string; next_stop_name: string; next_stop_minutes: string }>> {
  const byVid = new Map<string, Prediction[]>()
  for (let i = 0; i < vids.length; i += MAX_VID_PER_PREDICTION_REQUEST) {
    const chunk = vids.slice(i, i + MAX_VID_PER_PREDICTION_REQUEST)
    const vidParam = chunk.join(",")
    const res = await fetch(
      `${BASE_URL}/getpredictions?key=${apiKey}&format=json&vid=${vidParam}&tmres=s`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) continue
    const data = await res.json()
    const bustime = data["bustime-response"] || {}
    let prd: Prediction[] = bustime.prd ?? []
    if (!Array.isArray(prd) && typeof prd === "object") prd = [prd]
    for (const p of prd) {
      const vid = p.vid
      if (!vid) continue
      if (!byVid.has(vid)) byVid.set(vid, [])
      byVid.get(vid)!.push(p)
    }
  }
  const map = new Map<string, { next_stop_id: string; next_stop_name: string; next_stop_minutes: string }>()
  for (const [vid, preds] of byVid) {
    const next = preds.length === 1
      ? preds[0]
      : preds.reduce((a, b) => {
          const minA = Number(a.prdctdn) || Infinity
          const minB = Number(b.prdctdn) ?? Infinity
          return minB < minA ? b : a
        })
    map.set(vid, {
      next_stop_id: next.stpid ?? "",
      next_stop_name: next.stpnm ?? "",
      next_stop_minutes: next.prdctdn ?? "",
    })
  }
  return map
}

export async function GET() {
  const apiKey = process.env.MADISON_METRO_API_KEY

  if (!apiKey) {
    return NextResponse.json({ vehicles: addMockNextStop(MOCK_BUSES) })
  }

  try {
    const res = await fetch(
      `${BASE_URL}/getvehicles?key=${apiKey}&format=json&rt=${ROUTES}&tmres=s`,
      { next: { revalidate: 300 } }
    )
    if (!res.ok) {
      return NextResponse.json({ vehicles: addMockNextStop(MOCK_BUSES) })
    }
    const data = await res.json()
    const bustime = data["bustime-response"] || {}
    let vehicles: BusVehicle[] = bustime.vehicle || []
    if (Array.isArray(vehicles) === false && typeof vehicles === "object") {
      vehicles = [vehicles]
    }

    const vids = vehicles.map((v) => v.vid).filter(Boolean)
    if (vids.length > 0) {
      const nextStopByVid = await fetchPredictionsForVids(apiKey, vids)
      vehicles = vehicles.map((v) => {
        const next = nextStopByVid.get(v.vid)
        if (!next) return v
        return {
          ...v,
          next_stop_id: next.next_stop_id,
          next_stop_name: next.next_stop_name,
          next_stop_minutes: next.next_stop_minutes,
        }
      })
    }

    return NextResponse.json({ vehicles })
  } catch {
    return NextResponse.json({ vehicles: addMockNextStop(MOCK_BUSES) })
  }
}
