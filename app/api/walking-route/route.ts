import { NextRequest, NextResponse } from "next/server"

const OSRM_URL = "https://router.project-osrm.org/route/v1/foot"

export type WalkingRouteResponse = {
  ok: boolean
  path?: [number, number][]
  distance?: number
  duration?: number
}

/**
 * Get walking route (foot profile) from OSRM. Returns path as [lat, lon][] for Leaflet.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const fromLat = parseFloat(searchParams.get("fromLat") ?? "")
  const fromLon = parseFloat(searchParams.get("fromLon") ?? "")
  const toLat = parseFloat(searchParams.get("toLat") ?? "")
  const toLon = parseFloat(searchParams.get("toLon") ?? "")

  if ([fromLat, fromLon, toLat, toLon].some((n) => isNaN(n))) {
    return NextResponse.json({ ok: false } satisfies WalkingRouteResponse, { status: 400 })
  }

  try {
    const coords = `${fromLon},${fromLat};${toLon},${toLat}`
    const url = `${OSRM_URL}/${coords}?overview=full&geometries=geojson`
    const res = await fetch(url, { next: { revalidate: 300 } })
    if (!res.ok) {
      return NextResponse.json({ ok: false } satisfies WalkingRouteResponse)
    }
    const data = await res.json()
    if (data.code !== "Ok" || !data.routes?.[0]?.geometry?.coordinates?.length) {
      return NextResponse.json({ ok: false } satisfies WalkingRouteResponse)
    }
    const coordinates = data.routes[0].geometry.coordinates as [number, number][]
    const path: [number, number][] = coordinates.map((c) => [c[1], c[0]])
    const distance = data.routes[0].distance as number
    const duration = data.routes[0].duration as number
    return NextResponse.json({
      ok: true,
      path,
      distance,
      duration,
    } satisfies WalkingRouteResponse)
  } catch {
    return NextResponse.json({ ok: false } satisfies WalkingRouteResponse)
  }
}
