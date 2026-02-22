import { NextResponse } from "next/server"
import type { BusVehicle } from "@/lib/types"

const MADISON_METRO_HOST = "metromap.cityofmadison.com"
const BASE_URL = `http://${MADISON_METRO_HOST}/bustime/api/v3`
const ROUTES = "80"
const MAX_VID_PER_PREDICTION_REQUEST = 10

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
    return NextResponse.json({ vehicles: [] })
  }

  try {
    const res = await fetch(
      `${BASE_URL}/getvehicles?key=${apiKey}&format=json&rt=${ROUTES}&tmres=s`,
      { next: { revalidate: 300 } }
    )
    if (!res.ok) {
      return NextResponse.json({ vehicles: [] })
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

    return NextResponse.json({ 
      vehicles,
      count: vehicles.length 
    })
  } catch {
    return NextResponse.json({ vehicles: [], count: 0 })
  }
}
